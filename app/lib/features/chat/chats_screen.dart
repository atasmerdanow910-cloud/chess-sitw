import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/format/formatters.dart';
import '../../core/l10n/l10n.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../ui/async_view.dart';
import '../../ui/common.dart';
import '../../ui/media_placeholder.dart';
import '../../ui/shop_card.dart';

String messagePreviewText(BuildContext context, MessagePreview? m) {
  final l = context.l10n;
  if (m == null) return '';
  return switch (m.type) {
    'photo' => '📷 ${l.photo}',
    'video' => '🎬 ${l.video}',
    'voice' => '🎤 ${l.voiceMessage}',
    _ => m.text ?? '',
  };
}

/// All chats: as a buyer with shops, and (for sellers) with buyers of my shop.
class ChatsScreen extends ConsumerWidget {
  const ChatsScreen({super.key, this.sellerOnly = false});

  final bool sellerOnly;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: Text(l.navChats)),
        body: EmptyState(
          icon: Icons.chat_bubble_outline,
          title: l.loginPrompt,
          action: FilledButton(onPressed: () => context.push('/login'), child: Text(l.login)),
        ),
      );
    }
    final chats = ref.watch(chatsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(sellerOnly ? l.messages : l.navChats)),
      body: RefreshIndicator(
        onRefresh: () => ref.read(chatsProvider.notifier).refresh(),
        child: AsyncView(
          value: chats,
          onRetry: () => ref.invalidate(chatsProvider),
          data: (all) {
            final list = sellerOnly ? all.where((c) => c.iAmSeller).toList() : all;
            if (list.isEmpty) {
              return ListView(children: [EmptyState(icon: Icons.chat_bubble_outline, title: l.chatsEmpty)]);
            }
            return ListView.separated(
              itemCount: list.length,
              separatorBuilder: (_, _) => const Divider(indent: 76),
              itemBuilder: (context, i) => _ChatTile(item: list[i], meId: user.id),
            );
          },
        ),
      ),
    );
  }
}

class _ChatTile extends StatelessWidget {
  const _ChatTile({required this.item, required this.meId});

  final ConversationItem item;
  final String meId;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    final last = item.lastMessage;
    final mine = last?.senderId == meId;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.page, vertical: AppSpacing.xs),
      leading: item.iAmSeller
          ? ShopAvatar(initials: _initials(item.peerName), color: MediaPlaceholder.colorFor(item.id), size: 48)
          : ShopLogo(shop: item.shop, size: 48),
      title: Row(
        children: [
          Expanded(
            child: Text(item.peerName, maxLines: 1, overflow: TextOverflow.ellipsis, style: textTheme.titleSmall),
          ),
          if (item.iAmSeller) ...[
            const SizedBox(width: AppSpacing.xs),
            Icon(Icons.storefront, size: 14, color: muted),
          ],
          const SizedBox(width: AppSpacing.sm),
          Text(formatShortDateTime(item.lastMessageAt), style: textTheme.bodySmall?.copyWith(color: muted)),
        ],
      ),
      subtitle: Row(
        children: [
          Expanded(
            child: Text(
              '${mine ? '${context.l10n.you}: ' : ''}${messagePreviewText(context, last).isEmpty ? (item.productTitle ?? '') : messagePreviewText(context, last)}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (item.unreadCount > 0) Badge(label: Text('${item.unreadCount}')),
        ],
      ),
      onTap: () => context.push('/chat/${item.id}'),
    );
  }

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    return parts.take(2).map((p) => p[0].toUpperCase()).join();
  }
}
