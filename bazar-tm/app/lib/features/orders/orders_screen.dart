import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/format/money.dart';
import '../../core/theme/tokens.dart';
import '../../data/mock_data.dart';
import '../../data/models.dart';
import '../../ui/common.dart';
import '../chat/chat_screen.dart';

/// Buyer's order history with live statuses.
class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final orders = context.app.orders;
    return PageScaffold(
      title: l.ordersTitle,
      body: ListenableBuilder(
        listenable: orders,
        builder: (context, _) {
          if (orders.mine.isEmpty) {
            return EmptyState(
              icon: Icons.receipt_long_outlined,
              title: l.ordersEmpty,
              actionLabel: l.goToCatalog,
              onAction: () => context.openCatalog(),
            );
          }
          return ListView.separated(
            padding: EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.lg, AppSpace.xxl + MediaQuery.paddingOf(context).bottom),
            itemCount: orders.mine.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpace.md),
            itemBuilder: (context, i) =>
                OrderCard(order: orders.mine[i], onTap: () => showOrderDetails(context, orders.mine[i], forSeller: false)),
          );
        },
      ),
    );
  }
}

/// Order summary used by both the buyer's history and the seller panel.
class OrderCard extends StatelessWidget {
  const OrderCard({super.key, required this.order, required this.onTap, this.showCustomer = false});

  final Order order;
  final VoidCallback onTap;
  final bool showCustomer;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final shop = MockData.shop(order.shopId);
    return Pressable(
      semanticLabel: l.orderNumber(order.id),
      onTap: onTap,
      child: SurfaceCard(
        padding: const EdgeInsets.all(AppSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(l.orderNumber(order.id), style: context.text.titleSmall)),
                StatusChip(order.status),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${showCustomer ? order.customerName : shop.name} · ${relativeDay(context, order.createdAt)}',
              style: context.text.bodySmall?.copyWith(color: p.textTertiary),
            ),
            const SizedBox(height: AppSpace.md),
            Row(
              children: [
                for (final line in order.lines.take(4))
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: SizedBox(width: 44, height: 44, child: ProductImage(product: line.product, radius: 10, iconSize: 20)),
                  ),
                const Spacer(),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    PriceText(order.total),
                    Text(l.productsCount(order.itemCount), style: context.text.bodySmall?.copyWith(color: p.textTertiary)),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Order details. The seller additionally sees the customer and can move the status.
Future<void> showOrderDetails(BuildContext context, Order order, {required bool forSeller}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _OrderDetails(order: order, forSeller: forSeller),
  );
}

class _OrderDetails extends StatelessWidget {
  const _OrderDetails({required this.order, required this.forSeller});

  final Order order;
  final bool forSeller;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final orders = context.app.orders;
    final shop = MockData.shop(order.shopId);
    return ListenableBuilder(
      listenable: orders,
      builder: (context, _) {
        final next = switch (order.status) {
          OrderStatus.created => (OrderStatus.confirmed, l.markConfirmed),
          OrderStatus.confirmed => (OrderStatus.shipping, l.markShipping),
          OrderStatus.shipping => (OrderStatus.delivered, l.markDelivered),
          _ => null,
        };
        final canCancel = forSeller && order.status != OrderStatus.delivered && order.status != OrderStatus.cancelled;
        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(child: Text(l.orderNumber(order.id), style: context.text.titleLarge)),
                  StatusChip(order.status),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '${formatDate(order.createdAt)}, ${formatTime(order.createdAt)} · ${shop.name}',
                style: context.text.bodySmall?.copyWith(color: p.textTertiary),
              ),
              const SizedBox(height: AppSpace.lg),
              _Timeline(status: order.status),
              const SizedBox(height: AppSpace.lg),
              if (forSeller) ...[
                FieldLabel(l.customer),
                SurfaceCard(
                  padding: const EdgeInsets.all(AppSpace.md),
                  child: Row(
                    children: [
                      Icon(Icons.person_outline_rounded, color: p.textSecondary),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(order.customerName, style: context.text.titleSmall),
                            Text(order.customerPhone, style: context.text.bodyMedium?.copyWith(color: p.textSecondary)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpace.lg),
              ],
              FieldLabel(l.productsTab),
              for (final line in order.lines)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 5),
                  child: Row(
                    children: [
                      SizedBox(width: 48, height: 48, child: ProductImage(product: line.product, radius: 12, iconSize: 22)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(line.product.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.bodyMedium),
                            Text(
                              [line.color, line.size, '× ${line.qty}'].whereType<String>().join(' · '),
                              style: context.text.bodySmall?.copyWith(color: p.textTertiary),
                            ),
                          ],
                        ),
                      ),
                      Text(formatTmt(line.total), style: context.text.titleSmall),
                    ],
                  ),
                ),
              const Divider(height: AppSpace.xl),
              Row(
                children: [
                  Text(l.total, style: context.text.titleMedium?.copyWith(color: p.textSecondary)),
                  const Spacer(),
                  PriceText(order.total, style: context.text.titleLarge),
                ],
              ),
              const SizedBox(height: AppSpace.lg),
              if (forSeller && next != null)
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(onPressed: () => orders.setStatus(order, next.$1), child: Text(next.$2)),
                ),
              if (canCancel) ...[
                const SizedBox(height: AppSpace.sm),
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    style: TextButton.styleFrom(foregroundColor: p.danger),
                    onPressed: () => orders.setStatus(order, OrderStatus.cancelled),
                    child: Text(l.markCancelled),
                  ),
                ),
              ],
              if (!forSeller)
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      openChatWith(context, order.shopId);
                    },
                    icon: const Icon(Icons.chat_bubble_outline_rounded, size: 20),
                    label: Text(l.chatWithSeller),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// Four steps of an order; a cancelled order shows one red step instead.
class _Timeline extends StatelessWidget {
  const _Timeline({required this.status});

  final OrderStatus status;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (status == OrderStatus.cancelled) return const StatusChip(OrderStatus.cancelled);
    const steps = [OrderStatus.created, OrderStatus.confirmed, OrderStatus.shipping, OrderStatus.delivered];
    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AnimatedContainer(
                  duration: AppMotion.of(context, AppMotion.normal),
                  height: 4,
                  decoration: BoxDecoration(
                    color: steps[i].index <= status.index ? orderStatusColor(p, status.index) : p.line,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 6),
                Opacity(opacity: steps[i].index <= status.index ? 1 : 0.45, child: _StepLabel(steps[i])),
              ],
            ),
          ),
          if (i < steps.length - 1) const SizedBox(width: 6),
        ],
      ],
    );
  }
}

class _StepLabel extends StatelessWidget {
  const _StepLabel(this.status);

  final OrderStatus status;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final label = switch (status) {
      OrderStatus.created => l.statusNew,
      OrderStatus.confirmed => l.statusConfirmed,
      OrderStatus.shipping => l.statusShipping,
      OrderStatus.delivered => l.statusDelivered,
      OrderStatus.cancelled => l.statusCancelled,
    };
    return Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.labelSmall?.copyWith(letterSpacing: 0));
  }
}
