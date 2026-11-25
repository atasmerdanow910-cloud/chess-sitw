import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/format/money.dart';
import '../../core/theme/tokens.dart';
import '../../data/mock_data.dart';
import '../../data/models.dart';
import '../../data/stores.dart';
import '../../l10n/app_localizations.dart';
import '../../ui/common.dart';
import '../orders/orders_screen.dart';
import 'product_edit_screen.dart';

String planLabel(AppLocalizations l, SubscriptionPlan plan) => switch (plan) {
  SubscriptionPlan.trial => l.planTrial,
  SubscriptionPlan.start => l.planStart,
  SubscriptionPlan.business => l.planBusiness,
  SubscriptionPlan.pro => l.planPro,
};

/// Seller panel (inside the app): overview, products, orders, shop profile.
/// Day 1 shows the demo shop; from Day 2 the panel opens only for the "seller" role.
class SellerPanelScreen extends StatelessWidget {
  const SellerPanelScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final shop = MockData.shop(context.app.seller.shopId);
    // A real seller (signed in through the server) sees their own shop name; products and orders
    // are still demo data until Day 3–5.
    final realShop = context.app.auth.user?.shop;
    return DefaultTabController(
      length: 4,
      child: PageScaffold(
        title: l.sellerPanel,
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.lg, 0, AppSpace.lg, AppSpace.sm),
              child: Row(
                children: [
                  ShopAvatar(realShop == null ? shop : _realShopLook(shop, realShop.name), size: 36),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(realShop?.name ?? shop.name, style: context.text.titleMedium, overflow: TextOverflow.ellipsis),
                  ),
                ],
              ),
            ),
            TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
              dividerColor: Colors.transparent,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(color: p.accentSoft, borderRadius: BorderRadius.circular(99)),
              labelColor: p.accent,
              unselectedLabelColor: p.textSecondary,
              labelStyle: context.text.labelMedium,
              splashBorderRadius: BorderRadius.circular(99),
              tabs: [
                Tab(height: 38, text: l.sellerOverview),
                Tab(height: 38, text: l.sellerProducts),
                Tab(height: 38, text: l.sellerOrders),
                Tab(height: 38, text: l.shopProfile),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            const Expanded(child: TabBarView(children: [_Overview(), _Products(), _Orders(), _ShopProfile()])),
          ],
        ),
      ),
    );
  }
}

/// The seller's real shop drawn like the demo one (same colour), with its own initials.
Shop _realShopLook(Shop demo, String name) => Shop(
  id: demo.id,
  name: name,
  descriptionRu: '',
  descriptionTk: '',
  market: '',
  hours: '',
  rating: 0,
  reviews: 0,
  verified: false,
  color: demo.color,
);

EdgeInsets _listPadding(BuildContext context) =>
    EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.lg, AppSpace.xxl + MediaQuery.paddingOf(context).bottom);

class _Overview extends StatelessWidget {
  const _Overview();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final app = context.app;
    return ListenableBuilder(
      listenable: Listenable.merge([app.products, app.orders]),
      builder: (context, _) {
        final seller = app.seller;
        final products = seller.products;
        final orders = app.orders.incoming;
        final views = products.fold(0, (sum, x) => sum + x.views);
        final revenue = orders.where((o) => o.status != OrderStatus.cancelled).fold(0, (sum, o) => sum + o.total);
        final popular = [...products]..sort((a, b) => b.views.compareTo(a.views));
        return ListView(
          padding: _listPadding(context),
          children: [
            InfoNote(l.demoData, icon: Icons.science_outlined),
            const SizedBox(height: AppSpace.md),
            _SubscriptionCard(seller: seller),
            const SizedBox(height: AppSpace.xl),
            Row(
              children: [
                Expanded(child: Text(l.statistics, style: context.text.titleLarge)),
                Text(l.last30Days, style: context.text.bodySmall?.copyWith(color: p.textTertiary)),
              ],
            ),
            const SizedBox(height: AppSpace.md),
            LayoutBuilder(
              builder: (context, c) {
                final columns = c.maxWidth >= 560 ? 4 : 2;
                final width = (c.maxWidth - (columns - 1) * AppSpace.md) / columns;
                return Wrap(
                  spacing: AppSpace.md,
                  runSpacing: AppSpace.md,
                  children: [
                    for (final (label, value) in [
                      (l.statViews, formatNumber(views)),
                      (l.statOrders, formatNumber(orders.length)),
                      (l.statRevenue, formatNumber(revenue)),
                      (l.statProducts, formatNumber(products.length)),
                    ])
                      SizedBox(
                        width: width,
                        child: _StatTile(label: label, value: value),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: AppSpace.xl),
            Text(l.popularProducts, style: context.text.titleLarge),
            Text('${l.statViews} · ${l.last30Days}', style: context.text.bodySmall?.copyWith(color: p.textTertiary)),
            const SizedBox(height: AppSpace.md),
            SurfaceCard(
              padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, AppSpace.md),
              child: popular.isEmpty
                  ? Text(l.productsEmpty, style: context.text.bodyMedium?.copyWith(color: p.textSecondary))
                  : _RankedBars(items: [for (final x in popular.take(5)) (x.title, x.views)]),
            ),
          ],
        );
      },
    );
  }
}

/// Subscription status with a meter of days left in the paid month.
/// The fill turns to the warning color 5 days before the end (spec, section 4).
class _SubscriptionCard extends StatelessWidget {
  const _SubscriptionCard({required this.seller});

  final SellerStore seller;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final realShop = context.app.auth.user?.shop;
    final paidUntil = realShop?.subscriptionUntil ?? seller.paidUntil;
    // New sellers start with the free trial month (spec, section 9).
    final plan = realShop != null ? SubscriptionPlan.trial : seller.plan;
    final daysLeft = (paidUntil.difference(DateTime.now()).inHours / 24).ceil().clamp(0, 9999);
    final soon = daysLeft <= 5;
    final fill = soon ? p.warn : p.chart1;
    final ratio = (daysLeft / 30).clamp(0.0, 1.0);
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.workspace_premium_outlined, color: p.textSecondary, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(l.subscription, style: context.text.titleMedium)),
              Text(l.planName(planLabel(l, plan)), style: context.text.labelMedium?.copyWith(color: p.textSecondary)),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          Text(l.paidUntil(formatDate(paidUntil)), style: context.text.titleLarge),
          const SizedBox(height: AppSpace.md),
          Semantics(
            label: l.daysLeft(daysLeft),
            // Meter: the track is a light step of the fill's own hue, so the bar reads end to end.
            child: Container(
              height: 8,
              width: double.infinity,
              alignment: Alignment.centerLeft,
              decoration: BoxDecoration(color: fill.withValues(alpha: 0.24), borderRadius: BorderRadius.circular(4)),
              child: FractionallySizedBox(
                widthFactor: ratio,
                heightFactor: 1,
                child: DecoratedBox(
                  decoration: BoxDecoration(color: fill, borderRadius: BorderRadius.circular(4)),
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpace.sm),
          Row(
            children: [
              if (soon) ...[Icon(Icons.warning_amber_rounded, size: 18, color: p.warn), const SizedBox(width: 6)],
              Text(l.daysLeft(daysLeft), style: context.text.bodyMedium?.copyWith(color: p.textSecondary)),
            ],
          ),
          if (soon) ...[
            const SizedBox(height: AppSpace.md),
            Text(l.subscriptionSoon, style: context.text.bodyMedium),
            const SizedBox(height: AppSpace.md),
            OutlinedButton.icon(
              onPressed: context.comingSoon,
              icon: const Icon(Icons.support_agent_rounded, size: 20),
              label: Text(l.contactOwner),
            ),
          ],
        ],
      ),
    );
  }
}

/// Stat tile: label, then the value in semibold with proportional figures.
class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      label: '$label: $value',
      excludeSemantics: true,
      child: SurfaceCard(
        padding: const EdgeInsets.all(AppSpace.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.text.bodySmall?.copyWith(color: p.textSecondary),
            ),
            const SizedBox(height: 6),
            Text(value, style: context.text.headlineSmall?.copyWith(fontWeight: FontWeight.w600, letterSpacing: -0.3)),
          ],
        ),
      ),
    );
  }
}

/// Ranked horizontal bars, one hue, largest first. Each row is name · bar · figure, so every
/// value is printed — no tooltip needed and the list doubles as the table view.
class _RankedBars extends StatelessWidget {
  const _RankedBars({required this.items});

  final List<(String, int)> items;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final max = items.fold(1, (m, e) => e.$2 > m ? e.$2 : m);
    return Column(
      children: [
        for (final (name, value) in items)
          Semantics(
            label: '$name: ${formatNumber(value)}',
            excludeSemantics: true,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 7),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.bodyMedium),
                      ),
                      const SizedBox(width: AppSpace.md),
                      Text(
                        formatNumber(value),
                        style: context.text.labelMedium?.copyWith(
                          color: p.textSecondary,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Bar: 10 px thick, square at the baseline, 4 px rounded data end.
                  FractionallySizedBox(
                    widthFactor: (value / max).clamp(0.02, 1.0),
                    child: Container(
                      height: 10,
                      decoration: BoxDecoration(
                        color: p.chart1,
                        borderRadius: const BorderRadius.horizontal(right: Radius.circular(4)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _Products extends StatelessWidget {
  const _Products();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final app = context.app;
    return ListenableBuilder(
      listenable: app.products,
      builder: (context, _) {
        final products = app.seller.products;
        return ListView(
          padding: _listPadding(context),
          children: [
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => const ProductEditScreen())),
                icon: const Icon(Icons.add_rounded),
                label: Text(l.addProduct),
              ),
            ),
            const SizedBox(height: AppSpace.md),
            if (products.isEmpty) EmptyState(icon: Icons.inventory_2_outlined, title: l.productsEmpty),
            for (final x in products) ...[_SellerProductRow(product: x), const SizedBox(height: AppSpace.sm)],
          ],
        );
      },
    );
  }
}

enum _ProductAction { edit, toggle, delete }

class _SellerProductRow extends StatelessWidget {
  const _SellerProductRow({required this.product});

  final Product product;

  Future<void> _confirmDelete(BuildContext context) async {
    final l = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: Text(l.deleteProductQuestion),
        content: Text(l.deleteProductText),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialog, false), child: Text(l.cancel)),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: context.palette.danger),
            onPressed: () => Navigator.pop(dialog, true),
            child: Text(l.delete),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) context.app.products.delete(product);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final stockColor = product.stock == 0 ? p.danger : (product.stock <= 5 ? p.warn : p.textSecondary);
    final stockText = product.stock == 0
        ? l.outOfStock
        : (product.stock <= 5 ? '${l.inStock(product.stock)} · ${l.lowStock}' : l.inStock(product.stock));
    return Opacity(
      opacity: product.visible ? 1 : 0.6,
      child: SurfaceCard(
        padding: const EdgeInsets.fromLTRB(10, 10, 4, 10),
        child: Row(
          children: [
            SizedBox(width: 58, height: 58, child: ProductImage(product: product, radius: 14, iconSize: 24)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.titleSmall),
                  const SizedBox(height: 2),
                  Text(formatTmt(product.price), style: context.text.bodyMedium),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (product.stock <= 5) ...[
                        Icon(
                          product.stock == 0 ? Icons.remove_shopping_cart_outlined : Icons.warning_amber_rounded,
                          size: 14,
                          color: stockColor,
                        ),
                        const SizedBox(width: 4),
                      ],
                      Flexible(
                        child: Text(
                          stockText,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.bodySmall?.copyWith(color: stockColor),
                        ),
                      ),
                      if (!product.visible) ...[
                        const SizedBox(width: 6),
                        Icon(Icons.visibility_off_outlined, size: 14, color: p.textTertiary),
                        const SizedBox(width: 3),
                        Text(l.hidden, style: context.text.bodySmall?.copyWith(color: p.textTertiary)),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            PopupMenuButton<_ProductAction>(
              tooltip: l.editProduct,
              onSelected: (a) {
                switch (a) {
                  case _ProductAction.edit:
                    Navigator.push(context, MaterialPageRoute<void>(builder: (_) => ProductEditScreen(product: product)));
                  case _ProductAction.toggle:
                    context.app.products.toggleVisible(product);
                    if (product.visible) context.showMessage(l.hiddenHint);
                  case _ProductAction.delete:
                    _confirmDelete(context);
                }
              },
              itemBuilder: (_) => [
                PopupMenuItem(value: _ProductAction.edit, child: Text(l.editProduct)),
                PopupMenuItem(value: _ProductAction.toggle, child: Text(product.visible ? l.hide : l.show)),
                PopupMenuItem(
                  value: _ProductAction.delete,
                  child: Text(l.delete, style: TextStyle(color: p.danger)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Orders extends StatefulWidget {
  const _Orders();

  @override
  State<_Orders> createState() => _OrdersState();
}

class _OrdersState extends State<_Orders> {
  OrderStatus? _filter;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final orders = context.app.orders;
    final labels = {
      OrderStatus.created: l.statusNew,
      OrderStatus.confirmed: l.statusConfirmed,
      OrderStatus.shipping: l.statusShipping,
      OrderStatus.delivered: l.statusDelivered,
      OrderStatus.cancelled: l.statusCancelled,
    };
    return ListenableBuilder(
      listenable: orders,
      builder: (context, _) {
        final all = orders.incoming;
        final shown = _filter == null ? all : all.where((o) => o.status == _filter).toList();
        Widget chip(String label, OrderStatus? value, int count) => Padding(
          padding: const EdgeInsets.only(right: 8),
          child: ChoiceChip(
            label: Text('$label · $count'),
            selected: _filter == value,
            showCheckmark: false,
            labelStyle: _filter == value ? context.text.labelMedium?.copyWith(color: p.accent) : null,
            onSelected: (_) => setState(() => _filter = value),
          ),
        );
        return Column(
          children: [
            SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: 4),
                children: [
                  chip(l.seeAll, null, all.length),
                  for (final e in labels.entries) chip(e.value, e.key, all.where((o) => o.status == e.key).length),
                ],
              ),
            ),
            Expanded(
              child: shown.isEmpty
                  ? EmptyState(icon: Icons.receipt_long_outlined, title: l.ordersEmpty)
                  : ListView.separated(
                      padding: _listPadding(context),
                      itemCount: shown.length,
                      separatorBuilder: (_, _) => const SizedBox(height: AppSpace.md),
                      itemBuilder: (context, i) =>
                          OrderCard(order: shown[i], showCustomer: true, onTap: () => showOrderDetails(context, shown[i], forSeller: true)),
                    ),
            ),
          ],
        );
      },
    );
  }
}

class _ShopProfile extends StatefulWidget {
  const _ShopProfile();

  @override
  State<_ShopProfile> createState() => _ShopProfileState();
}

class _ShopProfileState extends State<_ShopProfile> {
  final _form = GlobalKey<FormState>();
  late final Shop _shop = MockData.shop(context.app.seller.shopId);
  late final _name = TextEditingController(text: _shop.name);
  late final _description = TextEditingController(text: _shop.description(context.locale));
  late final _market = TextEditingController(text: _shop.market);
  late final _hours = TextEditingController(text: _shop.hours);
  final _phone = TextEditingController(text: '+993 ');
  final _legal = TextEditingController();
  final _returns = TextEditingController();

  @override
  void dispose() {
    for (final c in [_name, _description, _market, _hours, _phone, _legal, _returns]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    String? required(String? v) => (v == null || v.trim().isEmpty) ? l.requiredField : null;
    const gap = SizedBox(height: AppSpace.md);
    return Form(
      key: _form,
      child: ListView(
        padding: _listPadding(context),
        children: [
          SurfaceCard(
            padding: const EdgeInsets.all(AppSpace.md),
            child: Row(
              children: [
                ShopAvatar(_shop, size: 56),
                const SizedBox(width: AppSpace.md),
                Expanded(child: Text(l.logo, style: context.text.titleSmall)),
                OutlinedButton(onPressed: context.comingSoon, child: Text(l.addPhoto)),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.lg),
          TextFormField(
            controller: _name,
            decoration: InputDecoration(labelText: l.shopName),
            validator: required,
            maxLength: 60,
          ),
          gap,
          TextFormField(
            controller: _description,
            decoration: InputDecoration(labelText: l.shopDescription),
            minLines: 2,
            maxLines: 5,
            maxLength: 600,
          ),
          gap,
          TextFormField(
            controller: _market,
            decoration: InputDecoration(labelText: l.marketAddress),
            validator: required,
          ),
          gap,
          TextFormField(
            controller: _hours,
            decoration: InputDecoration(labelText: l.workingHours),
          ),
          gap,
          TextFormField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(labelText: l.phone),
          ),
          gap,
          TextFormField(
            controller: _legal,
            decoration: InputDecoration(labelText: l.legalName),
          ),
          gap,
          TextFormField(
            controller: _returns,
            decoration: InputDecoration(labelText: l.returnPolicy),
            minLines: 2,
            maxLines: 5,
            maxLength: 1000,
          ),
          const SizedBox(height: AppSpace.sm),
          Text(l.demoData, style: context.text.bodySmall?.copyWith(color: p.textTertiary)),
          const SizedBox(height: AppSpace.lg),
          FilledButton(
            onPressed: () {
              if (_form.currentState!.validate()) context.showMessage(l.saved);
            },
            child: Text(l.save),
          ),
        ],
      ),
    );
  }
}
