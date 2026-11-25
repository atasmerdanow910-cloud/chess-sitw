import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/tokens.dart';
import '../../data/mock_data.dart';
import '../../data/models.dart';
import '../../ui/common.dart';
import '../shell/root_shell.dart';
import 'chat_screen.dart';

/// Chats tab: all conversations with shops, newest first, with unread counters.
class ChatsScreen extends StatelessWidget {
  const ChatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final chats = context.app.chats;
    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, AppSpace.sm),
            child: Text(l.chatsTitle, style: context.text.headlineSmall),
          ),
          Expanded(
            child: ListenableBuilder(
              listenable: chats,
              builder: (context, _) {
                final items = chats.items.where((c) => c.messages.isNotEmpty).toList();
                if (items.isEmpty) {
                  return EmptyState(
                    icon: Icons.chat_bubble_outline_rounded,
                    title: l.chatsEmpty,
                    hint: l.chatsEmptyHint,
                    actionLabel: l.goToCatalog,
                    onAction: () => context.openCatalog(),
                  );
                }
                return ListView.separated(
                  padding: EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.lg, navBarSpace(context)),
                  itemCount: items.length + 1,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) => i == items.length
                      ? Padding(
                          padding: const EdgeInsets.only(top: AppSpace.md),
                          child: InfoNote(l.chatProtected, icon: Icons.lock_outline_rounded),
                        )
                      : _ConversationTile(conversation: items[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conversation});

  final Conversation conversation;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final shop = MockData.shop(conversation.shopId);
    final last = conversation.messages.last;
    final unread = conversation.unread;
    final preview = switch (last.kind) {
      MessageKind.text => last.text,
      MessageKind.photo => l.photo,
      MessageKind.voice => l.voiceMessage,
    };
    final previewIcon = switch (last.kind) {
      MessageKind.text => null,
      MessageKind.photo => Icons.image_outlined,
      MessageKind.voice => Icons.mic_none_rounded,
    };
    return Pressable(
      semanticLabel: shop.name,
      onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => ChatScreen(conversation: conversation))),
      child: SurfaceCard(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            ShopAvatar(shop, size: 50),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          shop.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.titleSmall?.copyWith(fontWeight: unread > 0 ? FontWeight.w800 : FontWeight.w600),
                        ),
                      ),
                      Text(
                        relativeDay(context, last.time),
                        style: context.text.bodySmall?.copyWith(color: unread > 0 ? p.accent : p.textTertiary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (last.fromMe) ...[
                        Icon(
                          last.status == MessageStatus.sent ? Icons.done_rounded : Icons.done_all_rounded,
                          size: 15,
                          color: last.status == MessageStatus.read ? p.accent : p.textTertiary,
                        ),
                        const SizedBox(width: 4),
                      ],
                      if (previewIcon != null) ...[Icon(previewIcon, size: 16, color: p.textSecondary), const SizedBox(width: 4)],
                      Expanded(
                        child: Text(
                          preview,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.bodyMedium?.copyWith(color: unread > 0 ? p.text : p.textSecondary),
                        ),
                      ),
                      if (unread > 0)
                        Container(
                          constraints: const BoxConstraints(minWidth: 22),
                          height: 22,
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(color: p.accentFill, borderRadius: BorderRadius.circular(11)),
                          child: Text('$unread', style: context.text.labelSmall?.copyWith(color: p.onAccent, letterSpacing: 0)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
