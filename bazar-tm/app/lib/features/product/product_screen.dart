import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/tokens.dart';
import '../../data/mock_data.dart';
import '../../data/models.dart';
import '../../ui/cards.dart';
import '../../ui/common.dart';
import '../../ui/report_sheet.dart';
import '../chat/chat_screen.dart';
import '../shop/shop_screen.dart';

/// Product card: photo gallery, price, stock, variants, description, shop, chat and cart.
class ProductScreen extends StatefulWidget {
  const ProductScreen({super.key, required this.product});

  final Product product;

  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  static const _photos = 3;
  late String? _color = widget.product.colors.firstOrNull;
  late String? _size = widget.product.sizes.firstOrNull;
  int _page = 0;

  Product get product => widget.product;

  void _addToCart() {
    final l = context.l10n;
    final added = context.app.cart.add(product, color: _color, size: _size);
    if (added) {
      context.showMessage(l.addedToCart, actionLabel: l.tabCart, onAction: () => context.goToTab(2));
    } else {
      context.showMessage(l.inStock(product.stock));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final shop = MockData.shop(product.shopId);
    final favorites = context.app.favorites;
    final more = context.app.products.ofShop(product.shopId).where((x) => x.id != product.id).toList();
    final available = product.stock > 0;

    return PageScaffold(
      extendBehindAppBar: true,
      leading: GlassIconButton(
        icon: Icons.arrow_back_rounded,
        tooltip: MaterialLocalizations.of(context).backButtonTooltip,
        onPressed: () => Navigator.maybePop(context),
      ),
      actions: [
        ListenableBuilder(
          listenable: favorites,
          builder: (context, _) {
            final on = favorites.contains(product.id);
            return GlassIconButton(
              icon: on ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              color: on ? p.danger : null,
              tooltip: on ? l.removeFromFavorites : l.addToFavorites,
              onPressed: () => favorites.toggle(product.id),
            );
          },
        ),
        GlassIconButton(icon: Icons.flag_outlined, tooltip: l.report, onPressed: () => showReportSheet(context)),
        const SizedBox(width: 8),
      ],
      bottomBar: BottomActionBar(
        children: [
          SizedBox(
            height: 50,
            child: OutlinedButton.icon(
              onPressed: () => openChatWith(context, product.shopId, productId: product.id),
              icon: const Icon(Icons.chat_bubble_outline_rounded, size: 20),
              label: Text(l.chatWithSeller),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ListenableBuilder(
              listenable: context.app.cart,
              builder: (context, _) {
                final inCart = context.app.cart.contains(product.id);
                return FilledButton.icon(
                  onPressed: !available ? null : (inCart ? () => context.goToTab(2) : _addToCart),
                  icon: Icon(inCart ? Icons.check_rounded : Icons.add_shopping_cart_rounded, size: 20),
                  label: Text(!available ? l.outOfStock : (inCart ? l.inCart : l.addToCart)),
                );
              },
            ),
          ),
        ],
      ),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Gallery: placeholders until real photos arrive on Day 3.
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 460),
            child: AspectRatio(
              aspectRatio: 1,
              child: Stack(
                children: [
                  PageView.builder(
                    itemCount: _photos,
                    onPageChanged: (i) => setState(() => _page = i),
                    itemBuilder: (context, i) => ProductImage(product: product, radius: 0, variant: i, iconSize: 96),
                  ),
                  Positioned(
                    bottom: 14,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        for (var i = 0; i < _photos; i++)
                          AnimatedContainer(
                            duration: AppMotion.of(context, AppMotion.normal),
                            curve: AppMotion.easeOut,
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: i == _page ? 18 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: i == _page ? p.text : p.text.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.lg, AppSpace.lg, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                PriceText(product.price, style: context.text.headlineSmall),
                const SizedBox(height: AppSpace.xs),
                Text(product.title, style: context.text.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: AppSpace.sm),
                Row(
                  children: [
                    Icon(
                      available ? Icons.inventory_2_outlined : Icons.remove_shopping_cart_outlined,
                      size: 18,
                      color: available ? p.ok : p.danger,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      available ? l.inStock(product.stock) : l.outOfStock,
                      style: context.text.bodyMedium?.copyWith(color: available ? p.ok : p.danger),
                    ),
                    if (available && product.stock <= 5) ...[
                      const SizedBox(width: 8),
                      Text('· ${l.lowStock}', style: context.text.bodyMedium?.copyWith(color: p.warn)),
                    ],
                  ],
                ),
                const SizedBox(height: AppSpace.lg),
                Pressable(
                  semanticLabel: shop.name,
                  onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => ShopScreen(shop: shop))),
                  child: SurfaceCard(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        ShopAvatar(shop, size: 42),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(shop.name, style: context.text.titleSmall, overflow: TextOverflow.ellipsis),
                                  ),
                                  if (shop.verified) ...[const SizedBox(width: 4), const VerifiedBadge()],
                                ],
                              ),
                              const SizedBox(height: 2),
                              RatingRow(rating: shop.rating, reviews: shop.reviews),
                            ],
                          ),
                        ),
                        Text(l.openShop, style: context.text.labelMedium?.copyWith(color: p.accent)),
                        Icon(Icons.chevron_right_rounded, color: p.accent),
                      ],
                    ),
                  ),
                ),
                if (product.colors.isNotEmpty) ...[
                  const SizedBox(height: AppSpace.xl),
                  FieldLabel(l.color),
                  _Options(values: product.colors, selected: _color, onSelected: (v) => setState(() => _color = v)),
                ],
                if (product.sizes.isNotEmpty) ...[
                  const SizedBox(height: AppSpace.lg),
                  FieldLabel(l.size),
                  _Options(values: product.sizes, selected: _size, onSelected: (v) => setState(() => _size = v)),
                ],
                const SizedBox(height: AppSpace.xl),
                FieldLabel(l.description),
                Text(product.description, style: context.text.bodyLarge),
              ],
            ),
          ),
          if (more.isNotEmpty) ...[
            SectionHeader(l.moreFromShop),
            SizedBox(
              height: 290,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
                itemCount: more.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) => SizedBox(width: 172, child: ProductCard(product: more[i])),
              ),
            ),
          ],
          SizedBox(height: 110 + MediaQuery.paddingOf(context).bottom),
        ],
      ),
    );
  }
}

class _Options extends StatelessWidget {
  const _Options({required this.values, required this.selected, required this.onSelected});

  final List<String> values;
  final String? selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final v in values)
          ChoiceChip(
            label: Text(v),
            selected: v == selected,
            showCheckmark: false,
            labelStyle: v == selected ? context.text.labelMedium?.copyWith(color: p.accent) : null,
            side: BorderSide(color: v == selected ? p.accent.withValues(alpha: 0.6) : p.line),
            onSelected: (_) => onSelected(v),
          ),
      ],
    );
  }
}
