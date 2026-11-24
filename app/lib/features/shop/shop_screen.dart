import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/format/formatters.dart';
import '../../core/l10n/l10n.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../ui/async_view.dart';
import '../../ui/common.dart';
import '../../ui/product_card.dart';
import '../../ui/shop_card.dart';
import '../common/actions.dart';

class ShopScreen extends ConsumerWidget {
  const ShopScreen({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shop = ref.watch(shopProvider(shopId));
    final query = (q: null, categoryId: null, shopId: shopId, minPrice: null, maxPrice: null, sort: 'new');
    final products = ref.watch(productsProvider(query));
    final l = context.l10n;

    return Scaffold(
      appBar: AppBar(
        title: Text(shop.value?.name ?? l.shop),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'report') reportDialog(context, ref, 'shop', shopId);
            },
            itemBuilder: (_) => [PopupMenuItem(value: 'report', child: Text(l.report))],
          ),
        ],
      ),
      body: AsyncView(
        value: shop,
        onRetry: () => ref.invalidate(shopProvider(shopId)),
        data: (s) => RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(shopProvider(shopId));
            ref.invalidate(productsProvider(query));
          },
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _ShopHeader(shop: s)),
              SliverToBoxAdapter(child: SectionHeader(title: '${l.products} · ${s.productsCount}')),
              ...products.when(
                loading: () => [const SliverToBoxAdapter(child: Center(child: CircularProgressIndicator()))],
                error: (e, _) => [SliverToBoxAdapter(child: ErrorView(error: e, onRetry: () => ref.invalidate(productsProvider(query))))],
                data: (list) => [
                  if (list.isEmpty)
                    SliverToBoxAdapter(child: EmptyState(icon: Icons.inventory_2_outlined, title: l.noProductsYet))
                  else
                    ProductGrid(products: list, showShop: false),
                ],
              ),
              SliverToBoxAdapter(child: _Reviews(shopId: shopId)),
              const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
            ],
          ),
        ),
      ),
      bottomNavigationBar: shop.hasValue
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: FilledButton.icon(
                  onPressed: () => openChatWithShop(context, ref, shopId: shopId),
                  icon: const Icon(Icons.chat_bubble_outline),
                  label: Text(l.writeToSeller),
                ),
              ),
            )
          : null,
    );
  }
}

class _ShopHeader extends StatelessWidget {
  const _ShopHeader({required this.shop});

  final Shop shop;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final textTheme = Theme.of(context).textTheme;
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.page),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ShopLogo(shop: shop, size: 72),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(child: Text(shop.name, style: textTheme.titleLarge)),
                        if (shop.isVerified) ...[const SizedBox(width: AppSpacing.xs), const VerifiedIcon(size: 20)],
                      ],
                    ),
                    if (shop.isVerified)
                      Text(l.verifiedSeller, style: textTheme.bodySmall?.copyWith(color: muted)),
                    const SizedBox(height: AppSpacing.xs),
                    RatingView(rating: shop.rating, reviewsCount: shop.reviewsCount),
                  ],
                ),
              ),
            ],
          ),
          if (shop.description.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Text(shop.description, style: textTheme.bodyMedium),
          ],
          const SizedBox(height: AppSpacing.md),
          if (shop.address.isNotEmpty) _InfoRow(icon: Icons.place_outlined, label: l.address, value: shop.address),
          if (shop.workingHours.isNotEmpty)
            _InfoRow(icon: Icons.schedule, label: l.workingHours, value: shop.workingHours),
          if (shop.phone.isNotEmpty)
            _InfoRow(
              icon: Icons.phone_outlined,
              label: l.phone,
              value: shop.phone,
              onTap: () => launchUrl(Uri.parse('tel:${shop.phone}')),
            ),
          if (shop.returnPolicy.isNotEmpty)
            _InfoRow(icon: Icons.assignment_return_outlined, label: l.returnPolicy, value: shop.returnPolicy),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, required this.value, this.onTap});

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs + 2),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: muted),
            const SizedBox(width: AppSpacing.sm),
            Text('$label: ', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: muted)),
            Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyMedium)),
          ],
        ),
      ),
    );
  }
}

class _Reviews extends ConsumerWidget {
  const _Reviews({required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviews = ref.watch(shopReviewsProvider(shopId)).value ?? const [];
    if (reviews.isEmpty) return const SizedBox.shrink();
    final textTheme = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: context.l10n.reviews),
        for (final r in reviews.take(10))
          ListTile(
            title: Row(
              children: [
                Text(r.buyerName, style: textTheme.titleSmall),
                const SizedBox(width: AppSpacing.sm),
                RatingView(rating: r.rating.toDouble()),
                const Spacer(),
                Text(formatDate(r.createdAt), style: textTheme.bodySmall),
              ],
            ),
            subtitle: r.text.isEmpty ? null : Text(r.text),
          ),
      ],
    );
  }
}
