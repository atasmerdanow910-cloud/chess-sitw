import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/format/money.dart';
import '../../core/theme/tokens.dart';
import '../../data/mock_data.dart';
import '../../data/models.dart';
import '../../ui/common.dart';
import '../shell/root_shell.dart';
import '../shop/shop_screen.dart';
import 'checkout_sheet.dart';

/// Cart tab: items grouped by shop; each shop is checked out separately.
class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final cart = context.app.cart;
    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, AppSpace.sm),
            child: Text(l.cartTitle, style: context.text.headlineSmall),
          ),
          Expanded(
            child: ListenableBuilder(
              listenable: cart,
              builder: (context, _) {
                final groups = cart.byShop;
                if (groups.isEmpty) {
                  return EmptyState(
                    icon: Icons.shopping_bag_outlined,
                    title: l.cartEmpty,
                    hint: l.cartEmptyHint,
                    actionLabel: l.goToCatalog,
                    onAction: () => context.openCatalog(),
                  );
                }
                return ListView(
                  padding: EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.lg, navBarSpace(context)),
                  children: [
                    if (groups.length > 1) ...[InfoNote(l.oneShopNote), const SizedBox(height: AppSpace.md)],
                    for (final entry in groups.entries) ...[
                      _ShopGroup(shop: MockData.shop(entry.key), lines: entry.value),
                      const SizedBox(height: AppSpace.md),
                    ],
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ShopGroup extends StatelessWidget {
  const _ShopGroup({required this.shop, required this.lines});

  final Shop shop;
  final List<CartLine> lines;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final total = context.app.cart.totalFor(shop.id);
    return SurfaceCard(
      padding: const EdgeInsets.all(AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(AppRadii.sm),
            onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => ShopScreen(shop: shop))),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Row(
                children: [
                  ShopAvatar(shop, size: 34),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(shop.name, style: context.text.titleSmall, overflow: TextOverflow.ellipsis),
                  ),
                  if (shop.verified) const VerifiedBadge(),
                  Icon(Icons.chevron_right_rounded, color: p.textTertiary),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpace.sm),
          for (final line in lines) _LineRow(line: line),
          const Divider(height: AppSpace.xl),
          Row(
            children: [
              Text(l.total, style: context.text.titleMedium?.copyWith(color: p.textSecondary)),
              const Spacer(),
              PriceText(total, style: context.text.titleLarge),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          SizedBox(
            width: double.infinity,
            child: FilledButton(onPressed: () => showCheckoutSheet(context, shop), child: Text(l.checkout)),
          ),
        ],
      ),
    );
  }
}

class _LineRow extends StatelessWidget {
  const _LineRow({required this.line});

  final CartLine line;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final variant = [line.color, line.size].whereType<String>().join(' · ');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(width: 64, height: 64, child: ProductImage(product: line.product, radius: 14, iconSize: 26)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(line.product.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: context.text.bodyMedium),
                if (variant.isNotEmpty) Text(variant, style: context.text.bodySmall?.copyWith(color: p.textTertiary)),
                const SizedBox(height: 2),
                Text(formatTmt(line.total), style: context.text.titleSmall),
              ],
            ),
          ),
          const SizedBox(width: 8),
          QtyStepper(value: line.qty, max: line.product.stock, onChanged: (v) => context.app.cart.setQty(line, v)),
        ],
      ),
    );
  }
}
