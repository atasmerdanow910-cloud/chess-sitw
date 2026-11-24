import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../ui/async_view.dart';
import '../../ui/common.dart';
import '../../ui/net_image.dart';
import '../../ui/product_card.dart';
import '../../ui/shop_card.dart';
import '../../ui/video_view.dart';
import '../common/actions.dart';

class ProductScreen extends ConsumerStatefulWidget {
  const ProductScreen({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends ConsumerState<ProductScreen> {
  final _selected = <String, String>{}; // kind -> variant id
  int _page = 0;

  int _price(ProductDetails p) =>
      p.priceTenge + p.variants.where((v) => _selected[v.kind] == v.id).fold(0, (s, v) => s + v.priceDeltaTenge);

  void _addToCart(ProductDetails p) {
    final l = context.l10n;
    final kinds = p.variants.map((v) => v.kind).toSet();
    if (kinds.any((k) => !_selected.containsKey(k))) {
      showMessage(context, l.chooseVariant);
      return;
    }
    final chosen = p.variants.where((v) => _selected[v.kind] == v.id).toList();
    ref.read(cartProvider.notifier).add(CartLine(
          productId: p.id,
          shopId: p.shop.id,
          shopName: p.shop.name,
          title: p.title,
          unitPriceTenge: _price(p),
          qty: 1,
          stock: p.stock,
          imageUrl: p.firstImageUrl,
          variantIds: chosen.map((v) => v.id).toList(),
          variantLabel: chosen.map((v) => v.value).join(' · '),
        ));
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text(l.addedToCart),
        action: SnackBarAction(label: l.navCart, onPressed: () => context.go('/cart')),
      ));
  }

  @override
  Widget build(BuildContext context) {
    final product = ref.watch(productProvider(widget.productId));
    final l = context.l10n;
    final p = product.value;
    final isFavorite = ref.watch(favoritesProvider).value?.contains(widget.productId) ?? p?.isFavorite ?? false;

    return Scaffold(
      appBar: AppBar(
        actions: [
          if (p != null) FavoriteButton(productId: p.id, isFavorite: isFavorite, onDark: false),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'report') reportDialog(context, ref, 'product', widget.productId);
            },
            itemBuilder: (_) => [PopupMenuItem(value: 'report', child: Text(l.report))],
          ),
        ],
      ),
      body: AsyncView(
        value: product,
        onRetry: () => ref.invalidate(productProvider(widget.productId)),
        data: (p) => ListView(
          children: [
            _Gallery(product: p, onPage: (i) => setState(() => _page = i), page: _page),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.page),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PriceText(_price(p), style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: AppSpacing.xs),
                  Text(p.title, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      Icon(
                        p.stock > 0 ? Icons.check_circle : Icons.cancel,
                        size: 18,
                        color: p.stock > 0 ? AppColors.brand : AppColors.danger,
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Text(p.stock > 0 ? l.inStock(p.stock) : l.outOfStock),
                    ],
                  ),
                  for (final kind in ['color', 'size'])
                    if (p.variantsOf(kind).isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.lg),
                      Text(kind == 'color' ? l.variantColor : l.variantSize, style: Theme.of(context).textTheme.titleSmall),
                      const SizedBox(height: AppSpacing.sm),
                      Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: [
                          for (final v in p.variantsOf(kind))
                            ChoiceChip(
                              label: Text(v.value),
                              selected: _selected[kind] == v.id,
                              onSelected: (_) => setState(() => _selected[kind] = v.id),
                            ),
                        ],
                      ),
                    ],
                  if (p.description.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xl),
                    Text(l.description, style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: AppSpacing.sm),
                    Text(p.description, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                  const SizedBox(height: AppSpacing.xl),
                  Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
                      leading: ShopLogo(shop: p.shop),
                      title: Row(
                        children: [
                          Flexible(child: Text(p.shop.name, overflow: TextOverflow.ellipsis)),
                          if (p.shop.isVerified) ...[const SizedBox(width: AppSpacing.xs), const VerifiedIcon()],
                        ],
                      ),
                      subtitle: RatingView(rating: p.shop.rating, reviewsCount: p.shop.reviewsCount),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/shop/${p.shop.id}'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: p == null
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Row(
                  children: [
                    OutlinedButton(
                      onPressed: () => openChatWithShop(context, ref, shopId: p.shop.id, productId: p.id),
                      child: Row(
                        children: [
                          const Icon(Icons.chat_bubble_outline, size: 20),
                          const SizedBox(width: AppSpacing.sm),
                          Text(l.writeToSellerShort),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: p.stock > 0 ? () => _addToCart(p) : null,
                        icon: const Icon(Icons.add_shopping_cart),
                        label: Text(p.stock > 0 ? l.addToCart : l.outOfStock),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _Gallery extends StatelessWidget {
  const _Gallery({required this.product, required this.page, required this.onPage});

  final ProductDetails product;
  final int page;
  final ValueChanged<int> onPage;

  @override
  Widget build(BuildContext context) {
    final media = product.media;
    return AspectRatio(
      aspectRatio: 1,
      child: Stack(
        children: [
          if (media.isEmpty)
            Positioned.fill(child: NetImage(url: null, seed: product.id))
          else
            PageView.builder(
              itemCount: media.length,
              onPageChanged: onPage,
              itemBuilder: (context, i) => media[i].isVideo
                  ? TapToPlayVideo(url: media[i].url)
                  : InteractiveViewer(child: NetImage(url: media[i].url, fit: BoxFit.contain, seed: product.id)),
            ),
          if (media.length > 1)
            Positioned(
              bottom: AppSpacing.md,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < media.length; i++)
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: i == page ? 16 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: i == page ? Colors.white : Colors.white54,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
