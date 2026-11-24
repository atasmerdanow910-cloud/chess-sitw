import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/error_text.dart';
import '../../core/auth/auth_controller.dart';
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
import '../common/actions.dart';

/// Order row used by buyer and seller lists.
class OrderTile extends StatelessWidget {
  const OrderTile({super.key, required this.order, this.showBuyer = false});

  final Order order;
  final bool showBuyer;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Card(
      child: InkWell(
        onTap: () => context.push('/order/${order.id}'),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(l.orderNumber('${order.number}'), style: Theme.of(context).textTheme.titleMedium),
                  const Spacer(),
                  OrderStatusChip(status: order.status),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                showBuyer ? '${order.buyerName ?? ''} · ${order.contactPhone}' : order.shop.name,
                style: TextStyle(color: muted),
              ),
              const SizedBox(height: AppSpacing.xs),
              Row(
                children: [
                  Text('${formatDate(order.createdAt)} ${formatTime(order.createdAt)} · ${l.itemsCount(order.itemsCount)}',
                      style: Theme.of(context).textTheme.bodySmall),
                  const Spacer(),
                  PriceText(order.totalTenge, style: Theme.of(context).textTheme.titleSmall),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MyOrdersScreen extends ConsumerWidget {
  const MyOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(myOrdersProvider);
    return Scaffold(
      appBar: AppBar(title: Text(context.l10n.myOrders)),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(myOrdersProvider.future),
        child: AsyncView(
          value: orders,
          onRetry: () => ref.invalidate(myOrdersProvider),
          data: (list) => list.isEmpty
              ? ListView(children: [EmptyState(icon: Icons.receipt_long_outlined, title: context.l10n.noOrdersYet)])
              : ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.page),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
                  itemBuilder: (_, i) => OrderTile(order: list[i]),
                ),
        ),
      ),
    );
  }
}

class OrderScreen extends ConsumerStatefulWidget {
  const OrderScreen({super.key, required this.orderId, this.justCreated = false});

  final String orderId;
  final bool justCreated;

  @override
  ConsumerState<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends ConsumerState<OrderScreen> {
  bool _busy = false;

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
      ref.invalidate(orderProvider(widget.orderId));
      ref.invalidate(myOrdersProvider);
      ref.invalidate(sellerOrdersProvider);
      ref.invalidate(sellerDashboardProvider);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _review(Order order) async {
    final l = context.l10n;
    var rating = 5;
    final text = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialog) => AlertDialog(
          title: Text(l.leaveReview),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 1; i <= 5; i++)
                    IconButton(
                      onPressed: () => setDialog(() => rating = i),
                      icon: Icon(i <= rating ? Icons.star_rounded : Icons.star_border_rounded, color: AppColors.rating, size: 34),
                    ),
                ],
              ),
              TextField(controller: text, maxLines: 3, maxLength: 1000, decoration: InputDecoration(hintText: l.reviewHint)),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l.send)),
          ],
        ),
      ),
    );
    if (ok == true) await _run(() => ref.read(ordersApiProvider).review(order.id, rating, text.text.trim()));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final order = ref.watch(orderProvider(widget.orderId));
    final me = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: Text(order.value == null ? l.orders : l.orderNumber('${order.value!.number}'))),
      body: AsyncView(
        value: order,
        onRetry: () => ref.invalidate(orderProvider(widget.orderId)),
        data: (o) {
          final iAmSeller = me?.shopId == o.shop.id;
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.page),
            children: [
              if (widget.justCreated)
                Card(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(child: Text(l.orderCreated)),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  OrderStatusChip(status: o.status),
                  const Spacer(),
                  Text('${formatDate(o.createdAt)} ${formatTime(o.createdAt)}'),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(iAmSeller ? l.buyer : l.shop, style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: AppSpacing.xs),
              if (iAmSeller) ...[
                Text(o.buyerName ?? ''),
                InkWell(
                  onTap: () => launchUrl(Uri.parse('tel:${o.contactPhone}')),
                  child: Text(o.contactPhone, style: TextStyle(color: Theme.of(context).colorScheme.primary)),
                ),
              ] else
                InkWell(onTap: () => context.push('/shop/${o.shop.id}'), child: Text(o.shop.name)),
              if (o.address.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.md),
                Text(l.deliveryAddress, style: Theme.of(context).textTheme.titleSmall),
                Text(o.address),
              ],
              if (o.comment.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.md),
                Text(l.orderComment, style: Theme.of(context).textTheme.titleSmall),
                Text(o.comment),
              ],
              const Divider(height: AppSpacing.xxl),
              for (final item in o.items)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: SizedBox(
                    width: 52,
                    height: 52,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      child: NetImage(url: item.imageUrl, seed: item.productId ?? item.title, memCacheWidth: 160),
                    ),
                  ),
                  title: Text(item.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                  subtitle: Text([if (item.variantLabel.isNotEmpty) item.variantLabel, '× ${item.qty}'].join(' · ')),
                  trailing: PriceText(item.priceTenge * item.qty, style: Theme.of(context).textTheme.bodyMedium),
                  onTap: item.productId == null ? null : () => context.push('/product/${item.productId}'),
                ),
              const Divider(height: AppSpacing.xl),
              Row(
                children: [
                  Text(l.total, style: Theme.of(context).textTheme.titleMedium),
                  const Spacer(),
                  PriceText(o.totalTenge, style: Theme.of(context).textTheme.titleLarge),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              if (!iAmSeller)
                OutlinedButton.icon(
                  onPressed: () => openChatWithShop(context, ref, shopId: o.shop.id, orderId: o.id),
                  icon: const Icon(Icons.chat_bubble_outline),
                  label: Text(l.writeToSeller),
                ),
              if (iAmSeller)
                for (final next in o.nextStatuses)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.sm),
                    child: next == OrderStatus.cancelled
                        ? OutlinedButton(
                            onPressed: _busy
                                ? null
                                : () async {
                                    if (await confirm(context, l.cancelOrderConfirm, danger: true)) {
                                      await _run(() => ref.read(ordersApiProvider).setStatus(o.id, next));
                                    }
                                  },
                            child: Text(l.cancelOrder),
                          )
                        : FilledButton(
                            onPressed: _busy ? null : () => _run(() => ref.read(ordersApiProvider).setStatus(o.id, next)),
                            child: Text('${l.markAs}: ${OrderStatusChip.labelOf(context, next)}'),
                          ),
                  ),
              if (o.canCancel && !iAmSeller)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  child: TextButton(
                    onPressed: _busy
                        ? null
                        : () async {
                            if (await confirm(context, l.cancelOrderConfirm, danger: true)) {
                              await _run(() => ref.read(ordersApiProvider).cancel(o.id));
                            }
                          },
                    child: Text(l.cancelOrder),
                  ),
                ),
              if (!iAmSeller && o.status == OrderStatus.delivered && !o.hasReview)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  child: FilledButton.icon(
                    onPressed: _busy ? null : () => _review(o),
                    icon: const Icon(Icons.star_outline),
                    label: Text(l.leaveReview),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
