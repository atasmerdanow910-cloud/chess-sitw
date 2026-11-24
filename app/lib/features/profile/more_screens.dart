import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/format/formatters.dart';
import '../../core/l10n/l10n.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/providers.dart';
import '../../ui/async_view.dart';
import '../../ui/common.dart';
import '../../ui/product_card.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favs = ref.watch(favoriteProductsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(context.l10n.favorites)),
      body: AsyncView(
        value: favs,
        onRetry: () => ref.invalidate(favoriteProductsProvider),
        data: (list) => list.isEmpty
            ? EmptyState(icon: Icons.favorite_border, title: context.l10n.favoritesEmpty)
            : CustomScrollView(
                slivers: [
                  const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.md)),
                  ProductGrid(products: list),
                ],
              ),
      ),
    );
  }
}

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final data = ref.watch(notificationsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.notifications),
        actions: [
          IconButton(
            tooltip: l.markAllRead,
            onPressed: () => ref.read(notificationsProvider.notifier).markAllRead(),
            icon: const Icon(Icons.done_all),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(notificationsProvider.future),
        child: AsyncView(
          value: data,
          onRetry: () => ref.invalidate(notificationsProvider),
          data: (d) => d.$1.isEmpty
              ? ListView(children: [EmptyState(icon: Icons.notifications_none, title: l.noNotifications)])
              : ListView.separated(
                  itemCount: d.$1.length,
                  separatorBuilder: (_, _) => const Divider(),
                  itemBuilder: (context, i) {
                    final n = d.$1[i];
                    final orderId = n.data['orderId'] as String?;
                    return ListTile(
                      leading: Icon(
                        n.type.startsWith('order') ? Icons.receipt_long_outlined : Icons.campaign_outlined,
                        color: n.readAt == null ? Theme.of(context).colorScheme.primary : null,
                      ),
                      title: Text(n.title, style: TextStyle(fontWeight: n.readAt == null ? FontWeight.w700 : null)),
                      subtitle: Text([if (n.body.isNotEmpty) n.body, '${formatDate(n.createdAt)} ${formatTime(n.createdAt)}'].join('\n')),
                      isThreeLine: n.body.isNotEmpty,
                      onTap: orderId == null ? null : () => context.push('/order/$orderId'),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

/// Privacy policy / terms. DRAFT texts — must be checked by a local lawyer (docs/LEGAL_TODO.md).
class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key, required this.kind});

  final String kind;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final isPrivacy = kind == 'privacy';
    return Scaffold(
      appBar: AppBar(title: Text(isPrivacy ? l.privacyPolicy : l.termsOfUse)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.page),
        children: [Text(isPrivacy ? l.privacyText : l.termsText, style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5))],
      ),
    );
  }
}
