import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:just_audio/just_audio.dart';
import 'package:material_ui/material_ui.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../../core/api/error_text.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/format/formatters.dart';
import '../../core/l10n/l10n.dart';
import '../../core/providers.dart';
import '../../core/realtime/realtime.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../ui/common.dart';
import '../../ui/net_image.dart';
import '../../ui/video_view.dart';
import '../common/actions.dart';

const _maxVideoBytes = 30 * 1024 * 1024;

String _newClientId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  final r = Random.secure();
  return List.generate(20, (_) => chars[r.nextInt(chars.length)]).join();
}

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _text = TextEditingController();
  final _scroll = ScrollController();
  final _recorder = AudioRecorder();
  List<ChatMessage> _messages = [];
  bool _loading = true;
  bool _loadingOlder = false;
  bool _hasOlder = true;
  Object? _error;
  DateTime? _peerTypingUntil;
  Timer? _typingTimer;
  DateTime _lastTypingSent = DateTime(2000);
  bool _recording = false;
  DateTime? _recordStart;
  StreamSubscription<RealtimeEvent>? _sub;

  /// Messages waiting to be sent (offline queue): clientId -> retry function.
  final _pending = <String, Future<void> Function()>{};

  String get _id => widget.conversationId;

  @override
  void initState() {
    super.initState();
    _load();
    _scroll.addListener(() {
      if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 200) _loadOlder();
    });
    _sub = ref.read(realtimeProvider).events.listen(_onEvent);
  }

  @override
  void dispose() {
    _sub?.cancel();
    _typingTimer?.cancel();
    _recorder.dispose();
    _text.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final list = await ref.read(chatApiProvider).history(_id);
      if (!mounted) return;
      setState(() {
        _messages = list.reversed.toList(); // newest first (list is reversed on screen)
        _hasOlder = list.length >= 40;
        _loading = false;
        _error = null;
      });
      _markRead();
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _loading = false;
        });
      }
    }
  }

  Future<void> _loadOlder() async {
    if (_loadingOlder || !_hasOlder || _messages.isEmpty) return;
    _loadingOlder = true;
    try {
      final older = await ref.read(chatApiProvider).history(_id, before: _messages.last.createdAt);
      if (mounted) {
        setState(() {
          _messages = [..._messages, ...older.reversed];
          _hasOlder = older.length >= 40;
        });
      }
    } catch (_) {
    } finally {
      _loadingOlder = false;
    }
  }

  void _markRead() {
    ref.read(chatApiProvider).markRead(_id).then((_) => ref.read(chatsProvider.notifier).refresh()).catchError((_) {});
  }

  void _onEvent(RealtimeEvent e) {
    if (!mounted) return;
    switch (e) {
      case ChatMessageEvent(:final message) when message.conversationId == _id:
        setState(() => _upsert(message));
        final me = ref.read(currentUserProvider);
        if (message.senderId != me?.id) {
          _peerTypingUntil = null;
          _markRead();
        }
      case ChatTypingEvent(:final conversationId) when conversationId == _id:
        setState(() => _peerTypingUntil = DateTime.now().add(const Duration(seconds: 4)));
        _typingTimer?.cancel();
        _typingTimer = Timer(const Duration(seconds: 4), () => mounted ? setState(() {}) : null);
      case ChatReadEvent(:final conversationId, :final readAt) when conversationId == _id:
        final me = ref.read(currentUserProvider)?.id;
        setState(() {
          _messages = [for (final m in _messages) m.senderId == me && m.readAt == null ? m.copyWith(readAt: readAt) : m];
        });
      case ChatDeliveredEvent(:final conversationId, :final messageIds, :final at) when conversationId == _id:
        setState(() {
          _messages = [for (final m in _messages) messageIds.contains(m.id) ? m.copyWith(deliveredAt: at) : m];
        });
      case ConnectedEvent():
        // Back online: resend everything that failed.
        for (final retry in _pending.values.toList()) {
          retry();
        }
      default:
        break;
    }
  }

  void _upsert(ChatMessage m) {
    final i = _messages.indexWhere((x) => x.id == m.id || (x.clientId == m.clientId && x.senderId == m.senderId));
    if (i == -1) {
      _messages = [m, ..._messages];
    } else {
      _messages = [..._messages]..[i] = m;
    }
  }

  ChatMessage _local(String type, {String? text, String? localPath}) {
    final me = ref.read(currentUserProvider)!;
    return ChatMessage(
      id: 'local-${_newClientId()}',
      conversationId: _id,
      senderId: me.id,
      clientId: _newClientId(),
      type: type,
      text: text,
      createdAt: DateTime.now(),
      sendState: SendState.sending,
      localPath: localPath,
    );
  }

  /// Sends with retry: the same clientId is reused, so the server never duplicates a message.
  Future<void> _deliver(ChatMessage local, {String? uploadPurpose}) async {
    Future<void> attempt() async {
      setState(() => _upsert(local.copyWith(sendState: SendState.sending)));
      try {
        String? mediaId;
        if (uploadPurpose != null) {
          final uploaded = await ref.read(apiClientProvider).upload(local.localPath!, uploadPurpose);
          mediaId = uploaded['id'] as String;
        }
        final sent = await ref
            .read(chatApiProvider)
            .send(_id, clientId: local.clientId, type: local.type, text: local.text, mediaId: mediaId);
        _pending.remove(local.clientId);
        if (mounted) setState(() => _upsert(sent));
      } catch (e) {
        _pending[local.clientId] = attempt;
        if (mounted) {
          setState(() => _upsert(local.copyWith(sendState: SendState.failed)));
          if (e is! SocketException) showError(context, e);
        }
      }
    }

    await attempt();
  }

  void _sendText() {
    final text = _text.text.trim();
    if (text.isEmpty) return;
    _text.clear();
    _deliver(_local('text', text: text));
  }

  void _onTyping(String _) {
    if (DateTime.now().difference(_lastTypingSent) > const Duration(seconds: 2)) {
      _lastTypingSent = DateTime.now();
      ref.read(realtimeProvider).sendTyping(_id);
    }
    setState(() {});
  }

  Future<void> _attach() async {
    final l = context.l10n;
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(leading: const Icon(Icons.photo_camera_outlined), title: Text(l.takePhoto), onTap: () => Navigator.pop(context, 'camera')),
            ListTile(leading: const Icon(Icons.photo_library_outlined), title: Text(l.photoFromGallery), onTap: () => Navigator.pop(context, 'gallery')),
            ListTile(leading: const Icon(Icons.videocam_outlined), title: Text(l.video), onTap: () => Navigator.pop(context, 'video')),
          ],
        ),
      ),
    );
    if (choice == null) return;
    final picker = ImagePicker();
    if (choice == 'video') {
      final file = await picker.pickVideo(source: ImageSource.gallery, maxDuration: const Duration(minutes: 2));
      if (file == null) return;
      if (await File(file.path).length() > _maxVideoBytes) {
        if (mounted) showMessage(context, l.videoTooLarge);
        return;
      }
      _deliver(_local('video', localPath: file.path), uploadPurpose: 'chat_video');
    } else {
      // Compressed on the phone before upload: max 1280 px, JPEG quality 80.
      final file = await picker.pickImage(
        source: choice == 'camera' ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 1280,
        maxHeight: 1280,
        imageQuality: 80,
      );
      if (file == null) return;
      _deliver(_local('photo', localPath: file.path), uploadPurpose: 'chat_photo');
    }
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      final path = await _recorder.stop();
      final duration = DateTime.now().difference(_recordStart ?? DateTime.now());
      setState(() => _recording = false);
      if (path != null && duration > const Duration(milliseconds: 800)) {
        _deliver(_local('voice', localPath: path), uploadPurpose: 'voice');
      }
      return;
    }
    if (!await _recorder.hasPermission()) {
      if (mounted) showMessage(context, context.l10n.micPermission);
      return;
    }
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(
      const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 32000, sampleRate: 22050, numChannels: 1),
      path: path,
    );
    setState(() {
      _recording = true;
      _recordStart = DateTime.now();
    });
  }

  Future<void> _cancelRecording() async {
    await _recorder.cancel();
    setState(() => _recording = false);
  }

  void _messageMenu(ChatMessage m) async {
    final l = context.l10n;
    final me = ref.read(currentUserProvider)?.id;
    if (m.senderId == me || m.id.startsWith('local-')) return;
    final action = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: ListTile(
          leading: const Icon(Icons.flag_outlined),
          title: Text(l.report),
          onTap: () => Navigator.pop(context, 'report'),
        ),
      ),
    );
    if (action == 'report' && mounted) reportDialog(context, ref, 'message', m.id);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final me = ref.watch(currentUserProvider);
    final conv = ref.watch(chatsProvider).value?.where((c) => c.id == _id).firstOrNull;
    final typing = _peerTypingUntil != null && _peerTypingUntil!.isAfter(DateTime.now());

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: InkWell(
          onTap: conv == null || conv.iAmSeller ? null : () => context.push('/shop/${conv.shop.id}'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(conv?.peerName ?? l.navChats, maxLines: 1, overflow: TextOverflow.ellipsis),
              if (typing)
                Text(l.typing, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.brand))
              else if (conv?.productTitle != null)
                Text(conv!.productTitle!, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
        actions: [
          if (conv?.orderId != null)
            IconButton(
              tooltip: l.orders,
              onPressed: () => context.push('/order/${conv!.orderId}'),
              icon: const Icon(Icons.receipt_long_outlined),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? EmptyState(
                        icon: Icons.wifi_off,
                        title: errorText(context, _error!),
                        action: OutlinedButton(onPressed: _load, child: Text(l.retry)),
                      )
                    : ListView.builder(
                        controller: _scroll,
                        reverse: true,
                        padding: const EdgeInsets.all(AppSpacing.md),
                        itemCount: _messages.length,
                        itemBuilder: (context, i) {
                          final m = _messages[i];
                          final mine = m.senderId == me?.id;
                          return GestureDetector(
                            onLongPress: () => _messageMenu(m),
                            child: _Bubble(
                              message: m,
                              mine: mine,
                              onRetry: m.sendState == SendState.failed ? () => _pending[m.clientId]?.call() : null,
                            ),
                          );
                        },
                      ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(AppSpacing.sm, AppSpacing.xs, AppSpacing.sm, AppSpacing.xs),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: Theme.of(context).colorScheme.outline)),
              ),
              child: _recording
                  ? Row(
                      children: [
                        IconButton(onPressed: _cancelRecording, icon: const Icon(Icons.delete_outline)),
                        const Icon(Icons.fiber_manual_record, color: AppColors.danger, size: 14),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(child: Text(l.recording)),
                        IconButton.filled(onPressed: _toggleRecording, icon: const Icon(Icons.send)),
                      ],
                    )
                  : Row(
                      children: [
                        IconButton(tooltip: l.attach, onPressed: _attach, icon: const Icon(Icons.attach_file)),
                        Expanded(
                          child: TextField(
                            controller: _text,
                            minLines: 1,
                            maxLines: 5,
                            maxLength: 4000,
                            textCapitalization: TextCapitalization.sentences,
                            onChanged: _onTyping,
                            decoration: InputDecoration(
                              hintText: l.messageHint,
                              counterText: '',
                              isDense: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        _text.text.trim().isEmpty
                            ? IconButton(tooltip: l.voiceMessage, onPressed: _toggleRecording, icon: const Icon(Icons.mic_none))
                            : IconButton.filled(onPressed: _sendText, icon: const Icon(Icons.send)),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.mine, this.onRetry});

  final ChatMessage message;
  final bool mine;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final m = message;
    final bg = mine ? scheme.primaryContainer : scheme.surfaceContainerHigh;
    final fg = mine ? scheme.onPrimaryContainer : scheme.onSurface;

    Widget content = switch (m.type) {
      'photo' => ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          child: SizedBox(
            width: 220,
            height: 220,
            child: m.localPath != null
                ? Image.file(File(m.localPath!), fit: BoxFit.cover)
                : InkWell(
                    onTap: () => _openPhoto(context, m.mediaUrl),
                    child: NetImage(url: m.mediaUrl, seed: m.id, memCacheWidth: 600),
                  ),
          ),
        ),
      'video' => SizedBox(
          width: 220,
          height: 220,
          child: m.mediaUrl == null
              ? const ColoredBox(color: Colors.black, child: Center(child: Icon(Icons.videocam, color: Colors.white)))
              : ClipRRect(borderRadius: BorderRadius.circular(AppRadius.sm), child: TapToPlayVideo(url: m.mediaUrl!)),
        ),
      'voice' => _VoicePlayer(url: m.mediaUrl, color: fg),
      _ => Text(m.text ?? '', style: TextStyle(color: fg, fontSize: 15, height: 1.3)),
    };

    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 3),
        padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.xs + 2),
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.78),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(AppRadius.lg),
            topRight: const Radius.circular(AppRadius.lg),
            bottomLeft: Radius.circular(mine ? AppRadius.lg : 4),
            bottomRight: Radius.circular(mine ? 4 : AppRadius.lg),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisSize: MainAxisSize.min,
          children: [
            content,
            const SizedBox(height: 2),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(formatTime(m.createdAt), style: TextStyle(color: fg.withValues(alpha: 0.6), fontSize: 11)),
                if (mine) ...[const SizedBox(width: 4), _StatusIcon(message: m, color: fg, onRetry: onRetry)],
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _openPhoto(BuildContext context, String? url) {
    if (url == null) return;
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white),
        body: Center(child: InteractiveViewer(child: NetImage(url: url, fit: BoxFit.contain))),
      ),
    ));
  }
}

/// sending ⏱ / failed ⚠ (tap = resend) / sent ✓ / delivered ✓✓ / read ✓✓ (green).
class _StatusIcon extends StatelessWidget {
  const _StatusIcon({required this.message, required this.color, this.onRetry});

  final ChatMessage message;
  final Color color;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final m = message;
    final faded = color.withValues(alpha: 0.6);
    return switch (m.sendState) {
      SendState.sending => Icon(Icons.schedule, size: 14, color: faded),
      SendState.failed => InkWell(
          onTap: onRetry,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 15, color: AppColors.danger),
              const SizedBox(width: 2),
              Text(context.l10n.retry, style: const TextStyle(color: AppColors.danger, fontSize: 11)),
            ],
          ),
        ),
      SendState.sent when m.readAt != null => const Icon(Icons.done_all, size: 15, color: AppColors.info),
      SendState.sent when m.deliveredAt != null => Icon(Icons.done_all, size: 15, color: faded),
      SendState.sent => Icon(Icons.done, size: 15, color: faded),
    };
  }
}

class _VoicePlayer extends ConsumerStatefulWidget {
  const _VoicePlayer({required this.url, required this.color});

  final String? url;
  final Color color;

  @override
  ConsumerState<_VoicePlayer> createState() => _VoicePlayerState();
}

class _VoicePlayerState extends ConsumerState<_VoicePlayer> {
  final _player = AudioPlayer();
  bool _loaded = false;

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (widget.url == null) return;
    if (!_loaded) {
      await _player.setUrl(ref.read(apiClientProvider).absolute(widget.url!));
      _loaded = true;
    }
    if (_player.playing) {
      await _player.pause();
    } else {
      if (_player.processingState == ProcessingState.completed) await _player.seek(Duration.zero);
      await _player.play();
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<PlayerState>(
      stream: _player.playerStateStream,
      builder: (context, snap) {
        final playing = snap.data?.playing ?? false;
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              onPressed: widget.url == null ? null : _toggle,
              icon: Icon(playing ? Icons.pause_circle_filled : Icons.play_circle_fill, color: widget.color, size: 34),
            ),
            StreamBuilder<Duration>(
              stream: _player.positionStream,
              builder: (context, pos) {
                final total = _player.duration ?? Duration.zero;
                final value = total.inMilliseconds == 0 ? 0.0 : (pos.data ?? Duration.zero).inMilliseconds / total.inMilliseconds;
                return SizedBox(
                  width: 120,
                  child: LinearProgressIndicator(value: value.clamp(0, 1), color: widget.color, backgroundColor: widget.color.withValues(alpha: 0.2)),
                );
              },
            ),
            const SizedBox(width: AppSpacing.sm),
            Icon(Icons.mic, size: 16, color: widget.color.withValues(alpha: 0.7)),
          ],
        );
      },
    );
  }
}
