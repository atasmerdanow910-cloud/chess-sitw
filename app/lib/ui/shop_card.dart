import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../core/l10n/l10n.dart';
import '../core/theme/app_spacing.dart';
import '../data/models.dart';
import 'common.dart';
import 'media_placeholder.dart';
import 'net_image.dart';

/// Round shop logo (photo or initials).
class ShopLogo extends StatelessWidget {
  const ShopLogo({super.key, required this.shop, this.size = 44});

  final ShopSummary shop;
  final double size;

  @override
  Widget build(BuildContext context) {
    final color = MediaPlaceholder.colorFor(shop.id);
    if (shop.logoUrl == null) return ShopAvatar(initials: shop.initials, color: color, size: size);
    return ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: NetImage(url: shop.logoUrl, seed: shop.id, placeholderIcon: Icons.storefront, memCacheWidth: 200),
      ),
    );
  }
}

/// Full-width shop row for lists.
class ShopCard extends StatelessWidget {
  const ShopCard({super.key, required this.shop});

  final Shop shop;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    return Card(
      child: InkWell(
        onTap: () => context.push('/shop/${shop.id}'),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              ShopLogo(shop: shop, size: 52),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(shop.name, style: textTheme.titleMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                        if (shop.isVerified) ...[const SizedBox(width: AppSpacing.xs), const VerifiedIcon()],
                      ],
                    ),
                    if (shop.description.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        shop.description,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        RatingView(rating: shop.rating),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          context.l10n.productsCount(shop.productsCount),
                          style: textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

/// Compact vertical shop tile for horizontal carousels.
class ShopTile extends StatelessWidget {
  const ShopTile({super.key, required this.shop});

  final Shop shop;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 132,
      child: Card(
        child: InkWell(
          onTap: () => context.push('/shop/${shop.id}'),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              children: [
                ShopLogo(shop: shop, size: 56),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        shop.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    if (shop.isVerified) ...[const SizedBox(width: 2), const VerifiedIcon(size: 14)],
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                RatingView(rating: shop.rating),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
