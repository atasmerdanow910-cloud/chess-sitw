import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../core/theme/tokens.dart';
import '../data/mock_data.dart';
import '../data/models.dart';
import '../features/product/product_screen.dart';
import '../features/shop/shop_screen.dart';
import 'common.dart';

/// Product tile used in grids: photo, favorite toggle, "new" badge, price, title, shop.
class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final shop = MockData.shop(product.shopId);
    final favorites = context.app.favorites;
    return Pressable(
      semanticLabel: product.title,
      onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ProductScreen(product: product))),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: BorderRadius.circular(AppRadii.lg),
          border: Border.all(color: p.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Padding(
                      padding: const EdgeInsets.all(4),
                      child: ProductImage(product: product),
                    ),
                  ),
                  if (product.isNew)
                    Positioned(
                      left: 12,
                      top: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: p.accentFill, borderRadius: BorderRadius.circular(99)),
                        child: Text(context.l10n.newBadge, style: context.text.labelSmall?.copyWith(color: p.onAccent, letterSpacing: 0.2)),
                      ),
                    ),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: ListenableBuilder(
                      listenable: favorites,
                      builder: (context, _) {
                        final on = favorites.contains(product.id);
                        return IconButton(
                          tooltip: on ? context.l10n.removeFromFavorites : context.l10n.addToFavorites,
                          style: IconButton.styleFrom(backgroundColor: p.glass, minimumSize: const Size(36, 36)),
                          onPressed: () => favorites.toggle(product.id),
                          icon: Icon(on ? Icons.favorite_rounded : Icons.favorite_border_rounded, size: 18, color: on ? p.danger : p.text),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PriceText(product.price),
                  const SizedBox(height: 2),
                  Text(
                    product.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.bodyMedium?.copyWith(color: p.textSecondary),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          shop.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.bodySmall?.copyWith(color: p.textTertiary),
                        ),
                      ),
                      if (shop.verified) ...[const SizedBox(width: 4), const VerifiedBadge()],
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

/// Shop tile: logo, name, verified badge, rating and number of products.
class ShopCard extends StatelessWidget {
  const ShopCard({super.key, required this.shop, this.width});

  final Shop shop;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final count = context.app.products.ofShop(shop.id).length;
    return Pressable(
      semanticLabel: shop.name,
      onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ShopScreen(shop: shop))),
      child: SizedBox(
        width: width,
        child: SurfaceCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              ShopAvatar(shop),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(shop.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.titleSmall),
                        ),
                        if (shop.verified) ...[const SizedBox(width: 4), const VerifiedBadge()],
                      ],
                    ),
                    const SizedBox(height: 4),
                    RatingRow(rating: shop.rating, reviews: shop.reviews),
                    const SizedBox(height: 2),
                    Text(
                      '${context.l10n.productsCount(count)} · ${shop.market.split(',').first}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.bodySmall?.copyWith(color: p.textTertiary),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Two-column product grid that grows with screen width.
SliverGrid productGrid(List<Product> products) => SliverGrid(
  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
    maxCrossAxisExtent: 260,
    mainAxisSpacing: 12,
    crossAxisSpacing: 12,
    childAspectRatio: 0.62,
  ),
  delegate: SliverChildBuilderDelegate((context, i) => ProductCard(product: products[i]), childCount: products.length),
);
