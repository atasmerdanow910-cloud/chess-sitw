import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/api/error_text.dart';
import '../../core/format/formatters.dart';
import '../../core/l10n/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models.dart';
import '../../ui/async_view.dart';
import '../../ui/common.dart';
import '../common/actions.dart';

typedef J = Map<String, dynamic>;

final _statsProvider = FutureProvider.autoDispose<J>((ref) => ref.watch(adminApiProvider).stats());
final _shopsProvider = FutureProvider.autoDispose.family<List<J>, (String, String?)>(
  (ref, a) => ref.watch(adminApiProvider).shops(filter: a.$1, q: a.$2),
);
final _shopProvider = FutureProvider.autoDispose.family<J, String>((ref, id) => ref.watch(adminApiProvider).shop(id));
final _plansProvider = FutureProvider.autoDispose<List<Plan>>((ref) => ref.watch(adminApiProvider).plans());
final _reportsProvider =
    FutureProvider.autoDispose.family<List<J>, String>((ref, s) => ref.watch(adminApiProvider).reports(status: s));
final _usersProvider = FutureProvider.autoDispose.family<List<J>, String?>((ref, q) => ref.watch(adminApiProvider).users(q: q));
final _adminCategoriesProvider = FutureProvider.autoDispose<List<Category>>((ref) => ref.watch(adminApiProvider).categories());
final _bannersProvider = FutureProvider.autoDispose<List<J>>((ref) => ref.watch(adminApiProvider).banners());
final _paymentsProvider = FutureProvider.autoDispose<List<J>>((ref) => ref.watch(adminApiProvider).payments());

DateTime _d(Object? v) => DateTime.tryParse('$v')?.toLocal() ?? DateTime.now();
int _i(Object? v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;

Future<void> _act(BuildContext context, Future<void> Function() action, {String? done}) async {
  try {
    await action();
    if (context.mounted) showMessage(context, done ?? context.l10n.saved);
  } catch (e) {
    if (context.mounted) showError(context, e);
  }
}

// ---------------- Dashboard ----------------

class OwnerDashboardScreen extends ConsumerWidget {
  const OwnerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final stats = ref.watch(_statsProvider);
    Widget tile(String label, Object? value, IconData icon, {Color? color}) => Card(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: color ?? Theme.of(context).colorScheme.primary),
                const SizedBox(height: AppSpacing.xs),
                Text('$value', style: Theme.of(context).textTheme.titleLarge),
                Text(label, style: Theme.of(context).textTheme.bodySmall, maxLines: 2),
              ],
            ),
          ),
        );
    Widget menu(IconData icon, String title, String route) => ListTile(
          leading: Icon(icon),
          title: Text(title),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => context.push(route),
        );

    return Scaffold(
      appBar: AppBar(title: Text(l.ownerPanel)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/owner/shops/new'),
        icon: const Icon(Icons.add_business_outlined),
        label: Text(l.newSeller),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(_statsProvider.future),
        child: AsyncView(
          value: stats,
          onRetry: () => ref.invalidate(_statsProvider),
          data: (s) {
            final users = Map<String, dynamic>.from(s['users'] as Map);
            final shops = Map<String, dynamic>.from(s['shops'] as Map);
            final orders = Map<String, dynamic>.from(s['orders'] as Map);
            final revenue = Map<String, dynamic>.from(s['revenueTenge'] as Map);
            final totalOrders = orders.values.fold<int>(0, (a, b) => a + _i(b));
            return ListView(
              padding: const EdgeInsets.fromLTRB(AppSpacing.page, 0, AppSpacing.page, 96),
              children: [
                GridView.count(
                  crossAxisCount: 3,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: AppSpacing.sm,
                  crossAxisSpacing: AppSpacing.sm,
                  childAspectRatio: 0.95,
                  children: [
                    tile(l.statBuyers, users['buyer'] ?? 0, Icons.people_outline),
                    tile(l.statSellers, users['seller'] ?? 0, Icons.storefront_outlined),
                    tile(l.statActiveShops, shops['active'] ?? 0, Icons.check_circle_outline),
                    tile(l.statExpiredShops, shops['expired'] ?? 0, Icons.timer_off_outlined, color: AppColors.warning),
                    tile(l.statOrders, totalOrders, Icons.receipt_long_outlined),
                    tile(l.statReports, s['openReports'] ?? 0, Icons.flag_outlined, color: AppColors.danger),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.payments_outlined),
                    title: Text(l.revenueThisMonth),
                    subtitle: Text('${l.revenueTotal}: ${formatPrice(_i(revenue['total']))}'),
                    trailing: PriceText(_i(revenue['thisMonth'])),
                    onTap: () => context.push('/owner/payments'),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Card(
                  child: Column(
                    children: [
                      menu(Icons.storefront_outlined, l.shopsAndSellers, '/owner/shops'),
                      menu(Icons.flag_outlined, l.moderation, '/owner/reports'),
                      menu(Icons.people_outline, l.users, '/owner/users'),
                      menu(Icons.category_outlined, l.categories, '/owner/categories'),
                      menu(Icons.view_carousel_outlined, l.banners, '/owner/banners'),
                      menu(Icons.sell_outlined, l.plans, '/owner/plans'),
                      menu(Icons.campaign_outlined, l.broadcast, '/owner/broadcast'),
                      menu(Icons.history, l.paymentsHistory, '/owner/payments'),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

// ---------------- Shops ----------------

class OwnerShopsScreen extends ConsumerStatefulWidget {
  const OwnerShopsScreen({super.key});

  @override
  ConsumerState<OwnerShopsScreen> createState() => _OwnerShopsScreenState();
}

class _OwnerShopsScreenState extends ConsumerState<OwnerShopsScreen> {
  String _filter = 'all';
  String? _q;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final key = (_filter, _q);
    final shops = ref.watch(_shopsProvider(key));
    final filters = {
      'all': l.seeAll,
      'active': l.filterActive,
      'ending': l.filterEnding,
      'expired': l.filterExpired,
      'blocked': l.filterBlocked,
      'unclaimed': l.filterUnclaimed,
    };
    return Scaffold(
      appBar: AppBar(title: Text(l.shopsAndSellers)),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/owner/shops/new'),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page),
            child: TextField(
              decoration: InputDecoration(hintText: l.searchHint, prefixIcon: const Icon(Icons.search), isDense: true),
              onSubmitted: (v) => setState(() => _q = v.trim().isEmpty ? null : v.trim()),
            ),
          ),
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, 0),
              children: [
                for (final e in filters.entries)
                  Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.sm),
                    child: ChoiceChip(label: Text(e.value), selected: _filter == e.key, onSelected: (_) => setState(() => _filter = e.key)),
                  ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(_shopsProvider(key).future),
              child: AsyncView(
                value: shops,
                onRetry: () => ref.invalidate(_shopsProvider(key)),
                data: (list) => list.isEmpty
                    ? ListView(children: [EmptyState(icon: Icons.storefront_outlined, title: l.noShopsYet)])
                    : ListView.builder(
                        padding: const EdgeInsets.only(bottom: 96),
                        itemCount: list.length,
                        itemBuilder: (context, i) {
                          final s = list[i];
                          final until = _d(s['subscriptionUntil']);
                          final expired = until.isBefore(DateTime.now());
                          final owner = s['owner'] as Map?;
                          return ListTile(
                            leading: Icon(
                              s['status'] == 'blocked'
                                  ? Icons.block
                                  : s['claimed'] == true
                                      ? Icons.storefront
                                      : Icons.hourglass_empty,
                              color: s['status'] == 'blocked' ? AppColors.danger : null,
                            ),
                            title: Text('${s['name']}'),
                            subtitle: Text([
                              owner == null ? l.notActivatedYet : '${owner['name']} · ${owner['phone'] ?? ''}',
                              '${l.paidUntil}: ${formatDate(until)} · ${s['planId']}',
                            ].join('\n')),
                            isThreeLine: true,
                            trailing: expired ? const Icon(Icons.timer_off_outlined, color: AppColors.warning) : null,
                            onTap: () => context.push('/owner/shops/${s['id']}'),
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

/// Shows the invite code big, with instructions for the seller.
Future<void> showInviteCode(BuildContext context, String code, DateTime expires) {
  final l = context.l10n;
  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(l.inviteCode),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SelectableText(code, style: Theme.of(context).textTheme.headlineMedium?.copyWith(letterSpacing: 4, fontWeight: FontWeight.w800)),
          const SizedBox(height: AppSpacing.md),
          Text(l.inviteInstructions),
          const SizedBox(height: AppSpacing.sm),
          Text('${l.validUntil}: ${formatDate(expires)}', style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            Clipboard.setData(ClipboardData(text: code));
            showMessage(context, l.copied);
          },
          child: Text(l.copy),
        ),
        FilledButton(onPressed: () => Navigator.pop(context), child: Text(l.ok)),
      ],
    ),
  );
}

class OwnerCreateShopScreen extends ConsumerStatefulWidget {
  const OwnerCreateShopScreen({super.key});

  @override
  ConsumerState<OwnerCreateShopScreen> createState() => _OwnerCreateShopScreenState();
}

class _OwnerCreateShopScreenState extends ConsumerState<OwnerCreateShopScreen> {
  final _form = GlobalKey<FormState>();
  final _shop = TextEditingController();
  final _seller = TextEditingController();
  final _phone = TextEditingController(text: '+993 ');
  final _trial = TextEditingController(text: '30');
  String _plan = 'trial';
  bool _busy = false;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final res = await ref.read(adminApiProvider).createShop({
        'shopName': _shop.text.trim(),
        'sellerName': _seller.text.trim(),
        'sellerPhone': _phone.text,
        'planId': _plan,
        'trialDays': int.tryParse(_trial.text) ?? 30,
      });
      final invite = Map<String, dynamic>.from(res['invite'] as Map);
      ref.invalidate(_shopsProvider);
      ref.invalidate(_statsProvider);
      if (!mounted) return;
      await showInviteCode(context, invite['code'] as String, _d(invite['expiresAt']));
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final plans = ref.watch(_plansProvider).value ?? const <Plan>[];
    final locale = Localizations.localeOf(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.newSeller)),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.page),
          children: [
            Text(l.newSellerHint),
            const SizedBox(height: AppSpacing.lg),
            TextFormField(
              controller: _shop,
              decoration: InputDecoration(labelText: l.shopName),
              validator: (v) => (v ?? '').trim().length < 2 ? l.fieldRequired : null,
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _seller,
              decoration: InputDecoration(labelText: l.sellerName),
              validator: (v) => (v ?? '').trim().length < 2 ? l.fieldRequired : null,
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: l.phone),
              validator: (v) => (v ?? '').replaceAll(RegExp(r'\D'), '').length < 8 ? l.errInvalidPhone : null,
            ),
            const SizedBox(height: AppSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: _plan,
              decoration: InputDecoration(labelText: l.plan),
              items: [
                for (final p in plans) DropdownMenuItem(value: p.id, child: Text('${p.name(locale)} · ${formatPrice(p.priceTenge)}')),
                if (plans.isEmpty) const DropdownMenuItem(value: 'trial', child: Text('trial')),
              ],
              onChanged: (v) => setState(() => _plan = v ?? 'trial'),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _trial,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: l.freeDays),
            ),
            const SizedBox(height: AppSpacing.xl),
            FilledButton(onPressed: _busy ? null : _submit, child: Text(l.createAndGetCode)),
          ],
        ),
      ),
    );
  }
}

class OwnerShopScreen extends ConsumerWidget {
  const OwnerShopScreen({super.key, required this.shopId});

  final String shopId;

  Future<void> _payment(BuildContext context, WidgetRef ref, J shop) async {
    final l = context.l10n;
    final plans = await ref.read(adminApiProvider).plans();
    if (!context.mounted) return;
    final locale = Localizations.localeOf(context);
    var plan = plans.firstWhere((p) => p.id == shop['planId'], orElse: () => plans.first);
    var months = 1;
    var method = 'cash';
    final amount = TextEditingController(text: '${plan.priceTenge ~/ 100}');
    final note = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setD) => AlertDialog(
          title: Text(l.recordPayment),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: plan.id,
                  decoration: InputDecoration(labelText: l.plan),
                  items: [for (final p in plans) DropdownMenuItem(value: p.id, child: Text(p.name(locale)))],
                  onChanged: (v) => setD(() {
                    plan = plans.firstWhere((p) => p.id == v);
                    amount.text = '${plan.priceTenge * months ~/ 100}';
                  }),
                ),
                DropdownButtonFormField<int>(
                  initialValue: months,
                  decoration: InputDecoration(labelText: l.months),
                  items: [for (final m in [1, 2, 3, 6, 12]) DropdownMenuItem(value: m, child: Text('$m'))],
                  onChanged: (v) => setD(() {
                    months = v ?? 1;
                    amount.text = '${plan.priceTenge * months ~/ 100}';
                  }),
                ),
                TextField(controller: amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: l.amountTmt)),
                DropdownButtonFormField<String>(
                  initialValue: method,
                  decoration: InputDecoration(labelText: l.paymentMethod),
                  items: [
                    DropdownMenuItem(value: 'cash', child: Text(l.methodCash)),
                    DropdownMenuItem(value: 'transfer', child: Text(l.methodTransfer)),
                    DropdownMenuItem(value: 'other', child: Text(l.methodOther)),
                  ],
                  onChanged: (v) => method = v ?? 'cash',
                ),
                TextField(controller: note, decoration: InputDecoration(labelText: l.note)),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l.save)),
          ],
        ),
      ),
    );
    if (ok != true || !context.mounted) return;
    await _act(context, () async {
      await ref.read(adminApiProvider).addPayment(shopId, {
        'planId': plan.id,
        'amountTenge': parsePriceToTenge(amount.text) ?? 0,
        'months': months,
        'method': method,
        'note': note.text.trim(),
      });
      ref.invalidate(_shopProvider(shopId));
      ref.invalidate(_statsProvider);
    });
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final shop = ref.watch(_shopProvider(shopId));
    return Scaffold(
      appBar: AppBar(title: Text(shop.value?['name'] as String? ?? l.shop)),
      body: AsyncView(
        value: shop,
        onRetry: () => ref.invalidate(_shopProvider(shopId)),
        data: (s) {
          final owner = s['owner'] as Map?;
          final blocked = s['status'] == 'blocked';
          final payments = (s['payments'] as List).cast<Map>();
          final invites = (s['invites'] as List).cast<Map>();
          final until = _d(s['subscriptionUntil']);
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.page),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(owner == null ? l.notActivatedYet : '${owner['name']} · ${owner['phone'] ?? ''}'),
                      Text('${l.paidUntil}: ${formatDate(until)} (${s['planId']})'),
                      Text('${l.products}: ${s['productsCount']}'),
                      if (blocked) Text(l.filterBlocked, style: const TextStyle(color: AppColors.danger)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              FilledButton.icon(
                onPressed: () => _payment(context, ref, s),
                icon: const Icon(Icons.payments_outlined),
                label: Text(l.recordPayment),
              ),
              const SizedBox(height: AppSpacing.sm),
              if (owner == null)
                OutlinedButton.icon(
                  onPressed: () async {
                    try {
                      final inv = await ref.read(adminApiProvider).newInvite(shopId);
                      ref.invalidate(_shopProvider(shopId));
                      if (context.mounted) await showInviteCode(context, inv['code'] as String, _d(inv['expiresAt']));
                    } catch (e) {
                      if (context.mounted) showError(context, e);
                    }
                  },
                  icon: const Icon(Icons.key_outlined),
                  label: Text(l.newInviteCode),
                ),
              SwitchListTile(
                value: s['isVerified'] == true,
                title: Text(l.verifiedSeller),
                onChanged: (v) => _act(context, () async {
                  await ref.read(adminApiProvider).updateShop(shopId, {'isVerified': v});
                  ref.invalidate(_shopProvider(shopId));
                }),
              ),
              SwitchListTile(
                value: blocked,
                title: Text(l.blockShop),
                subtitle: Text(l.blockShopHint),
                onChanged: (v) async {
                  if (v && !await confirm(context, l.blockShopConfirm, danger: true)) return;
                  if (!context.mounted) return;
                  await _act(context, () async {
                    await ref.read(adminApiProvider).updateShop(shopId, {'status': v ? 'blocked' : 'active'});
                    ref.invalidate(_shopProvider(shopId));
                  });
                },
              ),
              ListTile(
                leading: const Icon(Icons.open_in_new),
                title: Text(l.viewAsBuyer),
                onTap: () => context.push('/shop/$shopId'),
              ),
              SectionHeader(title: l.paymentsHistory),
              if (payments.isEmpty) Text(l.noPayments),
              for (final p in payments)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('${formatPrice(_i(p['amountTenge']))} · ${p['planId']} · ${p['method']}'),
                  subtitle: Text('${formatDate(_d(p['paidFrom']))} → ${formatDate(_d(p['paidUntil']))}'
                      '${(p['note'] as String? ?? '').isEmpty ? '' : '\n${p['note']}'}'),
                ),
              if (invites.isNotEmpty) ...[
                SectionHeader(title: l.inviteCodes),
                for (final i in invites)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${i['code']}'),
                    subtitle: Text(i['usedAt'] != null
                        ? '${l.used}: ${formatDate(_d(i['usedAt']))}'
                        : '${l.validUntil}: ${formatDate(_d(i['expiresAt']))}'),
                  ),
              ],
            ],
          );
        },
      ),
    );
  }
}

// ---------------- Moderation ----------------

class OwnerReportsScreen extends ConsumerStatefulWidget {
  const OwnerReportsScreen({super.key});

  @override
  ConsumerState<OwnerReportsScreen> createState() => _OwnerReportsScreenState();
}

class _OwnerReportsScreenState extends ConsumerState<OwnerReportsScreen> {
  String _status = 'open';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final reports = ref.watch(_reportsProvider(_status));
    return Scaffold(
      appBar: AppBar(title: Text(l.moderation)),
      body: Column(
        children: [
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'open', label: Text(l.reportOpen)),
              ButtonSegment(value: 'resolved', label: Text(l.reportResolved)),
              ButtonSegment(value: 'rejected', label: Text(l.reportRejected)),
            ],
            selected: {_status},
            onSelectionChanged: (s) => setState(() => _status = s.first),
          ),
          Expanded(
            child: AsyncView(
              value: reports,
              onRetry: () => ref.invalidate(_reportsProvider(_status)),
              data: (list) => list.isEmpty
                  ? EmptyState(icon: Icons.verified_user_outlined, title: l.noReports)
                  : ListView.builder(
                      itemCount: list.length,
                      itemBuilder: (context, i) {
                        final r = list[i];
                        final type = r['targetType'] as String;
                        final id = r['targetId'] as String;
                        return Card(
                          margin: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, 0),
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('$type · ${r['reporterName']} · ${formatDate(_d(r['createdAt']))}',
                                    style: Theme.of(context).textTheme.bodySmall),
                                const SizedBox(height: AppSpacing.xs),
                                Text('${r['reason']}'),
                                if ((r['snapshot'] as String? ?? '').isNotEmpty)
                                  Container(
                                    margin: const EdgeInsets.only(top: AppSpacing.xs),
                                    padding: const EdgeInsets.all(AppSpacing.sm),
                                    color: Theme.of(context).colorScheme.surfaceContainerHigh,
                                    child: Text('${r['snapshot']}'),
                                  ),
                                if (_status == 'open')
                                  Wrap(
                                    spacing: AppSpacing.sm,
                                    children: [
                                      if (type == 'product') ...[
                                        TextButton(onPressed: () => context.push('/product/$id'), child: Text(l.open)),
                                        TextButton(
                                          onPressed: () => _act(context, () async {
                                            await ref.read(adminApiProvider).setProductStatus(id, 'blocked');
                                            await ref.read(adminApiProvider).resolveReport(r['id'] as String, 'resolved');
                                            ref.invalidate(_reportsProvider(_status));
                                          }),
                                          child: Text(l.hideProduct),
                                        ),
                                      ],
                                      if (type == 'shop') TextButton(onPressed: () => context.push('/owner/shops/$id'), child: Text(l.open)),
                                      if (type == 'user')
                                        TextButton(
                                          onPressed: () => _act(context, () async {
                                            await ref.read(adminApiProvider).setUserBlocked(id, true);
                                            await ref.read(adminApiProvider).resolveReport(r['id'] as String, 'resolved');
                                            ref.invalidate(_reportsProvider(_status));
                                          }),
                                          child: Text(l.blockUser),
                                        ),
                                      TextButton(
                                        onPressed: () => _act(context, () async {
                                          await ref.read(adminApiProvider).resolveReport(r['id'] as String, 'resolved');
                                          ref.invalidate(_reportsProvider(_status));
                                        }),
                                        child: Text(l.markResolved),
                                      ),
                                      TextButton(
                                        onPressed: () => _act(context, () async {
                                          await ref.read(adminApiProvider).resolveReport(r['id'] as String, 'rejected');
                                          ref.invalidate(_reportsProvider(_status));
                                        }),
                                        child: Text(l.reject),
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class OwnerUsersScreen extends ConsumerStatefulWidget {
  const OwnerUsersScreen({super.key});

  @override
  ConsumerState<OwnerUsersScreen> createState() => _OwnerUsersScreenState();
}

class _OwnerUsersScreenState extends ConsumerState<OwnerUsersScreen> {
  String? _q;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final users = ref.watch(_usersProvider(_q));
    return Scaffold(
      appBar: AppBar(title: Text(l.users)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page),
            child: TextField(
              decoration: InputDecoration(hintText: l.searchUsers, prefixIcon: const Icon(Icons.search), isDense: true),
              onSubmitted: (v) => setState(() => _q = v.trim().isEmpty ? null : v.trim()),
            ),
          ),
          Expanded(
            child: AsyncView(
              value: users,
              onRetry: () => ref.invalidate(_usersProvider(_q)),
              data: (list) => ListView.builder(
                itemCount: list.length,
                itemBuilder: (context, i) {
                  final u = list[i];
                  final blocked = u['isBlocked'] == true;
                  return SwitchListTile(
                    title: Text('${u['name']}'),
                    subtitle: Text('${u['phone'] ?? u['email'] ?? ''} · ${u['role']}'),
                    value: !blocked,
                    onChanged: u['role'] == 'owner'
                        ? null
                        : (active) => _act(context, () async {
                              await ref.read(adminApiProvider).setUserBlocked(u['id'] as String, !active);
                              ref.invalidate(_usersProvider(_q));
                            }),
                    secondary: Icon(blocked ? Icons.block : Icons.person_outline, color: blocked ? AppColors.danger : null),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------- Catalog settings ----------------

class OwnerCategoriesScreen extends ConsumerWidget {
  const OwnerCategoriesScreen({super.key});

  Future<void> _edit(BuildContext context, WidgetRef ref, [Category? c]) async {
    final l = context.l10n;
    final ru = TextEditingController(text: c?.nameRu);
    final tk = TextEditingController(text: c?.nameTk);
    final sort = TextEditingController(text: '${c?.sort ?? 0}');
    var icon = c?.icon ?? 'category';
    var active = c?.isActive ?? true;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setD) => AlertDialog(
          title: Text(c == null ? l.addCategory : l.edit),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: ru, decoration: const InputDecoration(labelText: 'Русский')),
                TextField(controller: tk, decoration: const InputDecoration(labelText: 'Türkmen')),
                TextField(controller: sort, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: l.sortOrder)),
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: AppSpacing.xs,
                  children: [
                    for (final k in categoryIconKeys)
                      ChoiceChip(label: Icon(categoryIcon(k), size: 20), selected: icon == k, onSelected: (_) => setD(() => icon = k)),
                  ],
                ),
                SwitchListTile(value: active, title: Text(l.active), onChanged: (v) => setD(() => active = v)),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l.save)),
          ],
        ),
      ),
    );
    if (ok != true || !context.mounted) return;
    final body = {'nameRu': ru.text.trim(), 'nameTk': tk.text.trim(), 'icon': icon, 'sort': int.tryParse(sort.text) ?? 0, 'isActive': active};
    await _act(context, () async {
      final api = ref.read(adminApiProvider);
      c == null ? await api.createCategory(body) : await api.updateCategory(c.id, body);
      ref.invalidate(_adminCategoriesProvider);
    });
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final cats = ref.watch(_adminCategoriesProvider);
    final locale = Localizations.localeOf(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.categories)),
      floatingActionButton: FloatingActionButton(onPressed: () => _edit(context, ref), child: const Icon(Icons.add)),
      body: AsyncView(
        value: cats,
        onRetry: () => ref.invalidate(_adminCategoriesProvider),
        data: (list) => ListView(
          children: [
            for (final c in list)
              ListTile(
                leading: Icon(c.iconData),
                title: Text(c.name(locale)),
                subtitle: Text('${c.nameRu} / ${c.nameTk}${c.isActive ? '' : ' · ${l.hidden}'}'),
                onTap: () => _edit(context, ref, c),
              ),
          ],
        ),
      ),
    );
  }
}

class OwnerBannersScreen extends ConsumerWidget {
  const OwnerBannersScreen({super.key});

  Future<void> _edit(BuildContext context, WidgetRef ref, [J? b]) async {
    final l = context.l10n;
    final c = {
      for (final k in ['titleRu', 'titleTk', 'subtitleRu', 'subtitleTk', 'color'])
        k: TextEditingController(text: b?[k] as String? ?? (k == 'color' ? '#0F4A23' : '')),
    };
    var active = b?['isActive'] as bool? ?? true;
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setD) => AlertDialog(
          title: Text(b == null ? l.addBanner : l.edit),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: c['titleRu'], decoration: const InputDecoration(labelText: 'Заголовок (RU)')),
                TextField(controller: c['titleTk'], decoration: const InputDecoration(labelText: 'Sözbaşy (TM)')),
                TextField(controller: c['subtitleRu'], decoration: const InputDecoration(labelText: 'Текст (RU)')),
                TextField(controller: c['subtitleTk'], decoration: const InputDecoration(labelText: 'Tekst (TM)')),
                TextField(controller: c['color'], decoration: InputDecoration(labelText: l.colorHex)),
                SwitchListTile(value: active, title: Text(l.active), onChanged: (v) => setD(() => active = v)),
              ],
            ),
          ),
          actions: [
            if (b != null)
              TextButton(
                onPressed: () => Navigator.pop(context, null),
                child: Text(l.cancel),
              ),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l.save)),
          ],
        ),
      ),
    );
    if (ok != true || !context.mounted) return;
    final body = {for (final e in c.entries) e.key: e.value.text.trim(), 'isActive': active};
    await _act(context, () async {
      final api = ref.read(adminApiProvider);
      b == null ? await api.createBanner(body) : await api.updateBanner(b['id'] as String, body);
      ref.invalidate(_bannersProvider);
    });
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final banners = ref.watch(_bannersProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.banners)),
      floatingActionButton: FloatingActionButton(onPressed: () => _edit(context, ref), child: const Icon(Icons.add)),
      body: AsyncView(
        value: banners,
        onRetry: () => ref.invalidate(_bannersProvider),
        data: (list) => ListView(
          children: [
            for (final b in list)
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: Color(int.parse('FF${(b['color'] as String).substring(1)}', radix: 16)),
                ),
                title: Text('${b['titleRu']}'),
                subtitle: Text('${b['titleTk']}${b['isActive'] == true ? '' : ' · ${l.hidden}'}'),
                onTap: () => _edit(context, ref, b),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () async {
                    if (!await confirm(context, l.deleteConfirm, danger: true) || !context.mounted) return;
                    await _act(context, () async {
                      await ref.read(adminApiProvider).deleteBanner(b['id'] as String);
                      ref.invalidate(_bannersProvider);
                    });
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class OwnerPlansScreen extends ConsumerWidget {
  const OwnerPlansScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final plans = ref.watch(_plansProvider);
    final locale = Localizations.localeOf(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.plans)),
      body: AsyncView(
        value: plans,
        onRetry: () => ref.invalidate(_plansProvider),
        data: (list) => ListView(
          padding: const EdgeInsets.all(AppSpacing.page),
          children: [
            Text(l.plansHint),
            const SizedBox(height: AppSpacing.md),
            for (final p in list)
              Card(
                child: ListTile(
                  title: Text(p.name(locale)),
                  subtitle: Text('${formatPrice(p.priceTenge)} / ${l.month} · ${p.productLimit == null ? l.unlimited : l.productsCount(p.productLimit!)}'),
                  trailing: const Icon(Icons.edit_outlined),
                  onTap: () async {
                    final price = TextEditingController(text: '${p.priceTenge ~/ 100}');
                    final limit = TextEditingController(text: p.productLimit?.toString() ?? '');
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: Text(p.name(locale)),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            TextField(controller: price, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: l.amountTmt)),
                            TextField(
                              controller: limit,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(labelText: l.productLimit, helperText: l.emptyUnlimited),
                            ),
                          ],
                        ),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
                          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l.save)),
                        ],
                      ),
                    );
                    if (ok != true || !context.mounted) return;
                    await _act(context, () async {
                      await ref.read(adminApiProvider).updatePlan(p.id, {
                        'priceTenge': parsePriceToTenge(price.text) ?? p.priceTenge,
                        'productLimit': int.tryParse(limit.text.trim()),
                      });
                      ref.invalidate(_plansProvider);
                    });
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class OwnerBroadcastScreen extends ConsumerStatefulWidget {
  const OwnerBroadcastScreen({super.key});

  @override
  ConsumerState<OwnerBroadcastScreen> createState() => _OwnerBroadcastScreenState();
}

class _OwnerBroadcastScreenState extends ConsumerState<OwnerBroadcastScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  String _audience = 'all';
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.broadcast)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.page),
        children: [
          Text(l.broadcastHint),
          const SizedBox(height: AppSpacing.lg),
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'all', label: Text(l.seeAll)),
              ButtonSegment(value: 'buyers', label: Text(l.statBuyers)),
              ButtonSegment(value: 'sellers', label: Text(l.statSellers)),
            ],
            selected: {_audience},
            onSelectionChanged: (s) => setState(() => _audience = s.first),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(controller: _title, maxLength: 100, decoration: InputDecoration(labelText: l.titleLabel)),
          TextField(controller: _body, maxLength: 1000, maxLines: 4, decoration: InputDecoration(labelText: l.messageLabel)),
          const SizedBox(height: AppSpacing.md),
          FilledButton.icon(
            onPressed: _busy
                ? null
                : () async {
                    if (_title.text.trim().isEmpty) return;
                    if (!await confirm(context, l.broadcastConfirm)) return;
                    setState(() => _busy = true);
                    try {
                      final res = await ref
                          .read(adminApiProvider)
                          .broadcast({'title': _title.text.trim(), 'body': _body.text.trim(), 'audience': _audience});
                      if (context.mounted) {
                        showMessage(context, l.broadcastSent(_i(res['recipients'])));
                        _title.clear();
                        _body.clear();
                      }
                    } catch (e) {
                      if (context.mounted) showError(context, e);
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
            icon: const Icon(Icons.send),
            label: Text(l.send),
          ),
        ],
      ),
    );
  }
}

class OwnerPaymentsScreen extends ConsumerWidget {
  const OwnerPaymentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final payments = ref.watch(_paymentsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.paymentsHistory)),
      body: AsyncView(
        value: payments,
        onRetry: () => ref.invalidate(_paymentsProvider),
        data: (list) => list.isEmpty
            ? EmptyState(icon: Icons.payments_outlined, title: l.noPayments)
            : ListView.separated(
                itemCount: list.length,
                separatorBuilder: (_, _) => const Divider(),
                itemBuilder: (context, i) {
                  final p = list[i];
                  return ListTile(
                    title: Text('${p['shopName']} · ${formatPrice(_i(p['amountTenge']))}'),
                    subtitle: Text('${formatDate(_d(p['createdAt']))} · ${p['method']} · ${p['planId']}'
                        '\n${l.paidUntil}: ${formatDate(_d(p['paidUntil']))} · ${p['createdByName'] ?? ''}'),
                    isThreeLine: true,
                    onTap: () => context.push('/owner/shops/${p['shopId']}'),
                  );
                },
              ),
      ),
    );
  }
}
