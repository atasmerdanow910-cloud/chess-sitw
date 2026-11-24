import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../core/api/error_text.dart';
import '../core/auth/auth_controller.dart';
import '../core/l10n/l10n.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../data/models.dart';
import '../data/providers.dart';
import 'common.dart';
import 'net_image.dart';

/// Product tile for grids: photo, "new" badge, favorite, price, title, shop.
class ProductCard extends ConsumerWidget {
  const ProductCard({super.key, required this.product, this.showShop = true, this.onTap});

  final ProductCardData product;
  final bool showShop;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favs = ref.watch(favoritesProvider).value;
    final isFavorite = favs?.contains(product.id) ?? product.isFavorite;
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Card(
      child: InkWell(
        onTap: onTap ?? () => context.push('/product/${product.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  NetImage(url: product.imageUrl, seed: product.id, memCacheWidth: 480),
                  if (product.isNew)
                    Positioned(left: AppSpacing.sm, top: AppSpacing.sm, child: TagLabel(label: context.l10n.badgeNew)),
                  if (product.status == 'hidden' || product.status == 'blocked')
                    Positioned(
                      left: AppSpacing.sm,
                      bottom: AppSpacing.sm,
                      child: TagLabel(
                        label: product.status == 'blocked' ? context.l10n.blockedByModerator : context.l10n.hidden,
                        background: AppColors.warning.withValues(alpha: 0.9),
                        foreground: Colors.black,
                      ),
                    ),
                  Positioned(
                    right: AppSpacing.xs,
                    top: AppSpacing.xs,
                    child: FavoriteButton(productId: product.id, isFavorite: isFavorite),
                  ),
                  if (!product.inStock)
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: Container(
                        color: Colors.black.withValues(alpha: 0.55),
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                        child: Text(
                          context.l10n.outOfStock,
                          textAlign: TextAlign.center,
                          style: textTheme.labelMedium?.copyWith(color: Colors.white),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm + 2, AppSpacing.md, AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PriceText(product.priceTenge),
                  const SizedBox(height: 2),
                  Text(
                    product.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.bodyMedium?.copyWith(height: 1.25),
                  ),
                  if (showShop) ...[
                    const SizedBox(height: AppSpacing.xs + 2),
                    Row(
                      children: [
                        Icon(Icons.storefront_outlined, size: 14, color: scheme.onSurfaceVariant),
                        const SizedBox(width: AppSpacing.xs),
                        Flexible(
                          child: Text(
                            product.shop.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                          ),
                        ),
                        if (product.shop.isVerified) ...[const SizedBox(width: 2), const VerifiedIcon(size: 13)],
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Heart toggle in a small square (like on the old site). Guests are sent to login.
class FavoriteButton extends ConsumerWidget {
  const FavoriteButton({super.key, required this.productId, required this.isFavorite, this.onDark = true});

  final String productId;
  final bool isFavorite;
  final bool onDark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Material(
      color: onDark ? Colors.black.withValues(alpha: 0.35) : Theme.of(context).colorScheme.surfaceContainerHigh,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        onTap: () async {
          if (ref.read(currentUserProvider) == null) {
            context.push('/login');
            return;
          }
          try {
            await ref.read(favoritesProvider.notifier).toggle(productId);
          } catch (e) {
            if (context.mounted) showError(context, e);
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(6),
          child: Icon(
            isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
            size: 20,
            color: isFavorite ? AppColors.favorite : (onDark ? Colors.white : null),
            semanticLabel: context.l10n.favorites,
          ),
        ),
      ),
    );
  }
}

/// Responsive 2+ column grid of products as a sliver.
class ProductGrid extends StatelessWidget {
  const ProductGrid({super.key, required this.products, this.showShop = true});

  final List<ProductCardData> products;
  final bool showShop;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page),
      sliver: SliverGrid.builder(
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 240,
          mainAxisSpacing: AppSpacing.md,
          crossAxisSpacing: AppSpacing.md,
          mainAxisExtent: 300,
        ),
        itemCount: products.length,
        itemBuilder: (context, i) => ProductCard(product: products[i], showShop: showShop),
      ),
    );
  }
}
