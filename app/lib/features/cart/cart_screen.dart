import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/providers.dart';
import '../../ui/common.dart';
import '../../ui/net_image.dart';

/// Cart grouped by shop. Each shop is ordered separately.
class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final lines = ref.watch(cartProvider);
    final groups = groupByShop(lines);

    return Scaffold(
      appBar: AppBar(title: Text(l.navCart)),
      body: lines.isEmpty
          ? EmptyState(
              icon: Icons.shopping_bag_outlined,
              title: l.cartEmpty,
              hint: l.cartEmptyHint,
              action: FilledButton(onPressed: () => context.go('/'), child: Text(l.goShopping)),
            )
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.page),
              children: [
                Text(
                  l.checkoutPerShopHint,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: AppSpacing.md),
                for (final entry in groups.entries) ...[
                  _ShopGroup(shopId: entry.key, lines: entry.value),
                  const SizedBox(height: AppSpacing.lg),
                ],
              ],
            ),
    );
  }
}

class _ShopGroup extends ConsumerWidget {
  const _ShopGroup({required this.shopId, required this.lines});

  final String shopId;
  final List<CartLine> lines;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final total = lines.fold<int>(0, (s, i) => s + i.totalTenge);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            InkWell(
              onTap: () => context.push('/shop/$shopId'),
              child: Row(
                children: [
                  const Icon(Icons.storefront_outlined, size: 20),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(child: Text(lines.first.shopName, style: Theme.of(context).textTheme.titleMedium)),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ),
            const Divider(height: AppSpacing.xl),
            for (final line in lines)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: Row(
                  children: [
                    InkWell(
                      onTap: () => context.push('/product/${line.productId}'),
                      child: SizedBox(
                        width: 64,
                        height: 64,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                          child: NetImage(url: line.imageUrl, seed: line.productId, memCacheWidth: 200),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(line.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                          if (line.variantLabel.isNotEmpty)
                            Text(line.variantLabel, style: Theme.of(context).textTheme.bodySmall),
                          const SizedBox(height: AppSpacing.xs),
                          PriceText(line.unitPriceTenge, style: Theme.of(context).textTheme.titleSmall),
                        ],
                      ),
                    ),
                    QuantityStepper(
                      value: line.qty,
                      max: line.stock > 0 ? line.stock : null,
                      onChanged: (q) => ref.read(cartProvider.notifier).setQty(line.key, q),
                    ),
                  ],
                ),
              ),
            const Divider(height: AppSpacing.lg),
            Row(
              children: [
                Text(l.total, style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                PriceText(total, style: Theme.of(context).textTheme.titleLarge),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            FilledButton(onPressed: () => context.push('/checkout/$shopId'), child: Text(l.checkout)),
          ],
        ),
      ),
    );
  }
}
