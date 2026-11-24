import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/api/error_text.dart';
import '../../core/format/formatters.dart';
import '../../core/l10n/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../ui/async_view.dart';
import '../../ui/common.dart';
import '../../ui/net_image.dart';
import '../orders/orders_screens.dart';

/// Subscription status banner: green / yellow (≤5 days) / red (expired).
class SubscriptionCard extends StatelessWidget {
  const SubscriptionCard({super.key, required this.subscription, this.blocked = false});

  final SubscriptionInfo subscription;
  final bool blocked;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final s = subscription;
    final (color, icon, text) = blocked
        ? (AppColors.danger, Icons.block, l.shopBlockedText)
        : s.expired
            ? (AppColors.danger, Icons.error_outline, l.subscriptionExpired)
            : s.endsSoon
                ? (AppColors.warning, Icons.warning_amber_rounded, l.subscriptionEndsSoon(s.daysLeft))
                : (AppColors.brand, Icons.verified_outlined, l.subscriptionPaidUntil(formatDate(s.until)));
    return Card(
      color: color.withValues(alpha: 0.14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: BorderSide(color: color.withValues(alpha: 0.5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          children: [
            Icon(icon, color: color),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(text),
                  if (!blocked && (s.expired || s.endsSoon))
                    Text(l.subscriptionPaidUntil(formatDate(s.until)), style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.icon});

  final String label;
  final int value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: AppSpacing.sm),
              Text(formatCount(value), style: Theme.of(context).textTheme.titleLarge),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

class SellerDashboardScreen extends ConsumerWidget {
  const SellerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final dash = ref.watch(sellerDashboardProvider);
    final shop = ref.watch(sellerShopProvider);
    return Scaffold(
      appBar: AppBar(title: Text(shop.value?.name ?? l.myShop)),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(sellerDashboardProvider);
          ref.invalidate(sellerShopProvider);
        },
        child: AsyncView(
          value: dash,
          onRetry: () => ref.invalidate(sellerDashboardProvider),
          data: (d) => ListView(
            padding: const EdgeInsets.all(AppSpacing.page),
            children: [
              SubscriptionCard(subscription: d.subscription, blocked: d.shopStatus == 'blocked'),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  _Stat(label: l.statViews, value: d.views, icon: Icons.visibility_outlined),
                  const SizedBox(width: AppSpacing.sm),
                  _Stat(label: l.statOrders, value: d.orders, icon: Icons.receipt_long_outlined),
                  const SizedBox(width: AppSpacing.sm),
                  _Stat(label: l.statProducts, value: d.products, icon: Icons.inventory_2_outlined),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.inventory_2_outlined),
                      title: Text(l.products),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/seller/products'),
                    ),
                    ListTile(
                      leading: Badge(
                        isLabelVisible: d.pendingOrders > 0,
                        label: Text('${d.pendingOrders}'),
                        child: const Icon(Icons.receipt_long_outlined),
                      ),
                      title: Text(l.orders),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/seller/orders'),
                    ),
                    ListTile(
                      leading: const Icon(Icons.chat_bubble_outline),
                      title: Text(l.messages),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/seller/chats'),
                    ),
                    ListTile(
                      leading: const Icon(Icons.storefront_outlined),
                      title: Text(l.shopProfile),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/seller/shop'),
                    ),
                    if (shop.value != null)
                      ListTile(
                        leading: const Icon(Icons.open_in_new),
                        title: Text(l.viewAsBuyer),
                        onTap: () => context.push('/shop/${shop.value!.id}'),
                      ),
                  ],
                ),
              ),
              if (d.popular.isNotEmpty) ...[
                SectionHeader(title: l.popularProducts),
                Card(
                  child: Column(
                    children: [
                      for (final p in d.popular)
                        ListTile(
                          title: Text(p.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: Text('${l.views(p.views)} · ${l.statOrders}: ${p.ordersCount}'),
                          onTap: () => context.push('/seller/products/${p.id}'),
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class SellerProductsScreen extends ConsumerStatefulWidget {
  const SellerProductsScreen({super.key});

  @override
  ConsumerState<SellerProductsScreen> createState() => _SellerProductsScreenState();
}

class _SellerProductsScreenState extends ConsumerState<SellerProductsScreen> {
  String? _q;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final products = ref.watch(sellerProductsProvider(_q));
    return Scaffold(
      appBar: AppBar(title: Text(l.products)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/seller/products/new'),
        icon: const Icon(Icons.add),
        label: Text(l.addProduct),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.page, 0, AppSpacing.page, AppSpacing.sm),
            child: TextField(
              decoration: InputDecoration(hintText: l.searchHint, prefixIcon: const Icon(Icons.search), isDense: true),
              onSubmitted: (v) => setState(() => _q = v.trim().isEmpty ? null : v.trim()),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(sellerProductsProvider(_q).future),
              child: AsyncView(
                value: products,
                onRetry: () => ref.invalidate(sellerProductsProvider(_q)),
                data: (list) => list.isEmpty
                    ? ListView(children: [EmptyState(icon: Icons.inventory_2_outlined, title: l.noProductsYet, hint: l.addFirstProduct)])
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(AppSpacing.page, 0, AppSpacing.page, 96),
                        itemCount: list.length,
                        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
                        itemBuilder: (context, i) {
                          final p = list[i];
                          return Card(
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(AppSpacing.sm),
                              leading: SizedBox(
                                width: 56,
                                height: 56,
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                  child: NetImage(url: p.imageUrl, seed: p.id, memCacheWidth: 160),
                                ),
                              ),
                              title: Text(p.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                              subtitle: Text('${formatPrice(p.priceTenge)} · ${l.stockShort(p.stock)} · ${l.views(p.views)}'),
                              trailing: p.status == 'active'
                                  ? null
                                  : TagLabel(
                                      label: p.status == 'blocked' ? l.blockedByModerator : l.hidden,
                                      background: AppColors.warning.withValues(alpha: 0.2),
                                      foreground: AppColors.warning,
                                    ),
                              onTap: () => context.push('/seller/products/${p.id}'),
                            ),
                          );
                        },
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SellerOrdersScreen extends ConsumerStatefulWidget {
  const SellerOrdersScreen({super.key});

  @override
  ConsumerState<SellerOrdersScreen> createState() => _SellerOrdersScreenState();
}

class _SellerOrdersScreenState extends ConsumerState<SellerOrdersScreen> {
  OrderStatus? _status;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final orders = ref.watch(sellerOrdersProvider(_status));
    return Scaffold(
      appBar: AppBar(title: Text(l.orders)),
      body: Column(
        children: [
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page),
              children: [
                Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.sm),
                  child: ChoiceChip(label: Text(l.seeAll), selected: _status == null, onSelected: (_) => setState(() => _status = null)),
                ),
                for (final s in OrderStatus.values)
                  Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.sm),
                    child: ChoiceChip(
                      label: Text(OrderStatusChip.labelOf(context, s)),
                      selected: _status == s,
                      onSelected: (_) => setState(() => _status = s),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(sellerOrdersProvider(_status).future),
              child: AsyncView(
                value: orders,
                onRetry: () => ref.invalidate(sellerOrdersProvider(_status)),
                data: (list) => list.isEmpty
                    ? ListView(children: [EmptyState(icon: Icons.receipt_long_outlined, title: l.noOrdersYet)])
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppSpacing.page),
                        itemCount: list.length,
                        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
                        itemBuilder: (_, i) => OrderTile(order: list[i], showBuyer: true),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Picks an image (compressed on the phone) and uploads it. Returns the media JSON.
Future<Map<String, dynamic>?> pickAndUploadImage(BuildContext context, WidgetRef ref, String purpose) async {
  final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1280, maxHeight: 1280, imageQuality: 80);
  if (file == null) return null;
  try {
    return await ref.read(apiClientProvider).upload(file.path, purpose);
  } catch (e) {
    if (context.mounted) showError(context, e);
    return null;
  }
}

class SellerShopEditScreen extends ConsumerStatefulWidget {
  const SellerShopEditScreen({super.key});

  @override
  ConsumerState<SellerShopEditScreen> createState() => _SellerShopEditScreenState();
}

class _SellerShopEditScreenState extends ConsumerState<SellerShopEditScreen> {
  final _form = GlobalKey<FormState>();
  final _c = <String, TextEditingController>{};
  String? _logoId;
  String? _logoUrl;
  bool _filled = false;
  bool _busy = false;

  TextEditingController _ctrl(String key) => _c.putIfAbsent(key, TextEditingController.new);

  void _fill(SellerShop s) {
    if (_filled) return;
    _filled = true;
    _ctrl('name').text = s.name;
    _ctrl('description').text = s.description;
    _ctrl('address').text = s.address;
    _ctrl('phone').text = s.phone;
    _ctrl('workingHours').text = s.workingHours;
    _ctrl('legalName').text = s.legalName;
    _ctrl('returnPolicy').text = s.returnPolicy;
    _logoId = s.logoMediaId;
    _logoUrl = s.logoUrl;
  }

  @override
  void dispose() {
    for (final c in _c.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref.read(sellerApiProvider).updateShop({
        for (final e in _c.entries) e.key: e.value.text.trim(),
        'logoMediaId': _logoId,
      });
      ref.invalidate(sellerShopProvider);
      if (mounted) {
        showMessage(context, context.l10n.saved);
        context.pop();
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final shop = ref.watch(sellerShopProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.shopProfile)),
      body: AsyncView(
        value: shop,
        onRetry: () => ref.invalidate(sellerShopProvider),
        data: (s) {
          _fill(s);
          return Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.page),
              children: [
                Center(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(60),
                    onTap: () async {
                      final up = await pickAndUploadImage(context, ref, 'logo');
                      if (up != null) {
                        setState(() {
                          _logoId = up['id'] as String;
                          _logoUrl = up['url'] as String;
                        });
                      }
                    },
                    child: Stack(
                      children: [
                        ClipOval(child: SizedBox(width: 96, height: 96, child: NetImage(url: _logoUrl, placeholderIcon: Icons.storefront))),
                        const Positioned(right: 0, bottom: 0, child: CircleAvatar(radius: 16, child: Icon(Icons.edit, size: 16))),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                TextFormField(
                  controller: _ctrl('name'),
                  maxLength: 80,
                  decoration: InputDecoration(labelText: l.shopName),
                  validator: (v) => (v ?? '').trim().length < 2 ? l.fieldRequired : null,
                ),
                TextFormField(controller: _ctrl('description'), maxLength: 2000, maxLines: 4, decoration: InputDecoration(labelText: l.description)),
                TextFormField(controller: _ctrl('address'), maxLength: 200, decoration: InputDecoration(labelText: l.addressOrMarket)),
                TextFormField(controller: _ctrl('phone'), maxLength: 32, keyboardType: TextInputType.phone, decoration: InputDecoration(labelText: l.shopPhone)),
                TextFormField(controller: _ctrl('workingHours'), maxLength: 80, decoration: InputDecoration(labelText: l.workingHours, hintText: '09:00–18:00')),
                TextFormField(controller: _ctrl('legalName'), maxLength: 200, decoration: InputDecoration(labelText: l.legalName)),
                TextFormField(controller: _ctrl('returnPolicy'), maxLength: 2000, maxLines: 3, decoration: InputDecoration(labelText: l.returnPolicy)),
                const SizedBox(height: AppSpacing.lg),
                FilledButton(onPressed: _busy ? null : _save, child: Text(l.save)),
              ],
            ),
          );
        },
      ),
    );
  }
}
