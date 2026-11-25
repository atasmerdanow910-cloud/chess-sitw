import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/format/money.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../data/mock_data.dart';
import '../../data/models.dart';
import '../../ui/common.dart';
import '../../ui/report_sheet.dart';
import '../product/product_screen.dart';

/// Opens (or creates) the conversation with a shop, optionally about a product.
void openChatWith(BuildContext context, String shopId, {String? productId}) {
  final conversation = context.app.chats.openFor(shopId, productId: productId);
  Navigator.push(context, MaterialPageRoute<void>(builder: (_) => ChatScreen(conversation: conversation)));
}

/// One conversation buyer ↔ seller: text, photo and voice bubbles with delivery ticks.
/// Day 1 is local only; real-time delivery over WebSocket arrives on Day 6.
class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.conversation});

  final Conversation conversation;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _input = TextEditingController();
  final _timers = <Timer>[];

  Conversation get c => widget.conversation;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.app.chats.markRead(c);
    });
  }

  @override
  void dispose() {
    for (final t in _timers) {
      t.cancel();
    }
    _input.dispose();
    super.dispose();
  }

  void _send() {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    final chats = context.app.chats;
    final message = chats.send(c, text);
    _input.clear();
    // Demo of the delivery tick; on Day 6 the server confirms delivery.
    _timers.add(Timer(const Duration(milliseconds: 900), () => chats.setStatus(message, MessageStatus.delivered)));
  }

  void _attach() {
    final l = context.l10n;
    showModalBottomSheet<void>(
      context: context,
      builder: (sheet) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpace.lg, 0, AppSpace.lg, AppSpace.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.attach, style: context.text.titleLarge),
              const SizedBox(height: AppSpace.sm),
              ListTile(
                leading: const Icon(Icons.photo_outlined),
                title: Text(l.photo),
                onTap: () {
                  Navigator.pop(sheet);
                  context.comingSoon();
                },
              ),
              ListTile(
                leading: const Icon(Icons.videocam_outlined),
                title: Text(l.video),
                onTap: () {
                  Navigator.pop(sheet);
                  context.comingSoon();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final shop = MockData.shop(c.shopId);
    final product = c.productId == null ? null : MockData.products.where((x) => x.id == c.productId).firstOrNull;
    return PageScaffold(
      titleWidget: Row(
        children: [
          ShopAvatar(shop, size: 38),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(shop.name, style: context.text.titleMedium, overflow: TextOverflow.ellipsis),
                    ),
                    if (shop.verified) ...[const SizedBox(width: 4), const VerifiedBadge()],
                  ],
                ),
                Text(l.online, style: context.text.bodySmall?.copyWith(color: p.ok)),
              ],
            ),
          ),
        ],
      ),
      actions: [
        IconButton(tooltip: l.report, onPressed: () => showReportSheet(context), icon: const Icon(Icons.flag_outlined)),
        const SizedBox(width: 4),
      ],
      leading: const BackButton(),
      body: Column(
        children: [
          Expanded(
            child: ListenableBuilder(
              listenable: context.app.chats,
              builder: (context, _) {
                final items = _withDaySeparators(context, c.messages).reversed.toList();
                return ListView.builder(
                  reverse: true,
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.sm, AppSpace.md, AppSpace.md),
                  itemCount: items.length + 1,
                  itemBuilder: (context, i) {
                    if (i == items.length) return _ChatHeader(product: product);
                    final item = items[i];
                    return item is String ? _DaySeparator(item) : _Bubble(message: item as ChatMessage);
                  },
                );
              },
            ),
          ),
          _Composer(controller: _input, onSend: _send, onAttach: _attach),
        ],
      ),
    );
  }

  /// Inserts a "Today" / "Yesterday" / date label before the first message of each day.
  List<Object> _withDaySeparators(BuildContext context, List<ChatMessage> messages) {
    final out = <Object>[];
    DateTime? lastDay;
    for (final m in messages) {
      final day = DateTime(m.time.year, m.time.month, m.time.day);
      if (lastDay != day) {
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);
        out.add(day == today ? context.l10n.today : relativeDay(context, m.time));
        lastDay = day;
      }
      out.add(m);
    }
    return out;
  }
}

class _ChatHeader extends StatelessWidget {
  const _ChatHeader({required this.product});

  final Product? product;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: Column(
        children: [
          InfoNote(context.l10n.chatProtected, icon: Icons.lock_outline_rounded),
          if (product != null) ...[
            const SizedBox(height: AppSpace.md),
            Pressable(
              semanticLabel: product!.title,
              onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => ProductScreen(product: product!))),
              child: SurfaceCard(
                padding: const EdgeInsets.all(8),
                radius: AppRadii.md,
                child: Row(
                  children: [
                    SizedBox(width: 48, height: 48, child: ProductImage(product: product!, radius: 12, iconSize: 22)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(product!.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.bodyMedium),
                          Text(formatTmt(product!.price), style: context.text.titleSmall),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, color: p.textTertiary),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DaySeparator extends StatelessWidget {
  const _DaySeparator(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
    child: Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(color: context.palette.surface, borderRadius: BorderRadius.circular(99)),
        child: Text(label, style: context.text.labelSmall?.copyWith(color: context.palette.textSecondary)),
      ),
    ),
  );
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final mine = message.fromMe;
    final fg = mine ? p.onAccent : p.text;
    final meta = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(formatTime(message.time), style: context.text.labelSmall?.copyWith(color: fg.withValues(alpha: 0.7), letterSpacing: 0)),
        if (mine) ...[
          const SizedBox(width: 3),
          Icon(
            message.status == MessageStatus.sent ? Icons.done_rounded : Icons.done_all_rounded,
            size: 15,
            color: message.status == MessageStatus.read ? fg : fg.withValues(alpha: 0.6),
          ),
        ],
      ],
    );
    final Widget content = switch (message.kind) {
      MessageKind.text => Text(message.text, style: context.text.bodyLarge?.copyWith(color: fg)),
      MessageKind.photo => Semantics(
        label: l.photo,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 210,
            height: 150,
            color: (mine ? Colors.white : p.accent).withValues(alpha: 0.12),
            child: Icon(Icons.image_outlined, size: 40, color: fg.withValues(alpha: 0.6)),
          ),
        ),
      ),
      MessageKind.voice => _VoiceBody(seconds: message.seconds, color: fg),
    };
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.78),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 3),
          padding: EdgeInsets.all(message.kind == MessageKind.photo ? 5 : 10),
          decoration: BoxDecoration(
            color: mine ? p.accentFill : p.surfaceRaised,
            border: mine ? null : Border.all(color: p.line),
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(mine ? 18 : 6),
              bottomRight: Radius.circular(mine ? 6 : 18),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              content,
              const SizedBox(height: 3),
              Padding(
                padding: EdgeInsets.only(right: message.kind == MessageKind.photo ? 5 : 0),
                child: meta,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Voice message: play button, a static waveform and the length. Playback arrives on Day 6.
class _VoiceBody extends StatelessWidget {
  const _VoiceBody({required this.seconds, required this.color});

  final int seconds;
  final Color color;

  static const _wave = [6, 12, 18, 10, 22, 14, 8, 16, 24, 12, 6, 14, 20, 10, 16, 8, 12, 18, 6, 10];

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final label = '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';
    return Semantics(
      label: '${l.voiceMessage}, $label',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton.filled(
            tooltip: l.voiceMessage,
            onPressed: context.comingSoon,
            style: IconButton.styleFrom(backgroundColor: color.withValues(alpha: 0.16), foregroundColor: color),
            icon: const Icon(Icons.play_arrow_rounded),
          ),
          const SizedBox(width: 6),
          for (final h in _wave)
            Container(
              width: 3,
              height: h.toDouble(),
              margin: const EdgeInsets.symmetric(horizontal: 1),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(2)),
            ),
          const SizedBox(width: 8),
          Text(label, style: context.text.labelMedium?.copyWith(color: color)),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({required this.controller, required this.onSend, required this.onAttach});

  final TextEditingController controller;
  final VoidCallback onSend;
  final VoidCallback onAttach;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    return Padding(
      padding: EdgeInsets.fromLTRB(10, 0, 10, 10 + MediaQuery.paddingOf(context).bottom),
      child: GlassSurface(
        radius: 26,
        padding: const EdgeInsets.all(5),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            IconButton(
              tooltip: l.attach,
              onPressed: onAttach,
              icon: Icon(Icons.add_circle_outline_rounded, color: p.textSecondary),
            ),
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 4,
                maxLength: 2000,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  filled: false,
                  counterText: '',
                  hintText: l.messageHint,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
                ),
                onSubmitted: (_) => onSend(),
              ),
            ),
            ListenableBuilder(
              listenable: controller,
              builder: (context, _) {
                final empty = controller.text.trim().isEmpty;
                return AnimatedSwitcher(
                  duration: AppMotion.of(context, AppMotion.fast),
                  child: empty
                      ? IconButton(
                          key: const ValueKey('mic'),
                          tooltip: l.recordVoice,
                          onPressed: context.comingSoon,
                          icon: Icon(Icons.mic_none_rounded, color: p.textSecondary),
                        )
                      : IconButton.filled(
                          key: const ValueKey('send'),
                          tooltip: l.send,
                          onPressed: onSend,
                          style: IconButton.styleFrom(backgroundColor: p.accentFill, foregroundColor: p.onAccent),
                          icon: const Icon(Icons.arrow_upward_rounded),
                        ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
