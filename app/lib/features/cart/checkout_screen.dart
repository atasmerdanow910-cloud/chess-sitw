import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/api/error_text.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/l10n/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/providers.dart';
import '../../ui/common.dart';

/// Order form for ONE shop. Payment is agreed with the seller in chat (no online payment in v1).
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _form = GlobalKey<FormState>();
  late final _phone = TextEditingController(text: ref.read(currentUserProvider)?.phone ?? '+993 ');
  final _address = TextEditingController();
  final _comment = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _phone.dispose();
    _address.dispose();
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit(List<CartLine> lines) async {
    if (!_form.currentState!.validate()) return;
    setState(() => _sending = true);
    try {
      final order = await ref.read(ordersApiProvider).create(
            shopId: widget.shopId,
            items: [
              for (final line in lines) {'productId': line.productId, 'variantIds': line.variantIds, 'qty': line.qty},
            ],
            contactPhone: _phone.text,
            address: _address.text.trim(),
            comment: _comment.text.trim(),
          );
      ref.read(cartProvider.notifier).clearShop(widget.shopId);
      ref.invalidate(myOrdersProvider);
      if (!mounted) return;
      context.pushReplacement('/order/${order.id}?created=1');
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final user = ref.watch(currentUserProvider);
    final lines = ref.watch(cartProvider).where((c) => c.shopId == widget.shopId).toList();
    final total = lines.fold<int>(0, (s, i) => s + i.totalTenge);

    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: Text(l.checkout)),
        body: EmptyState(
          icon: Icons.lock_outline,
          title: l.loginPrompt,
          action: FilledButton(onPressed: () => context.push('/login'), child: Text(l.login)),
        ),
      );
    }
    if (lines.isEmpty) {
      return Scaffold(appBar: AppBar(), body: EmptyState(icon: Icons.shopping_bag_outlined, title: l.cartEmpty));
    }

    return Scaffold(
      appBar: AppBar(title: Text(l.checkout)),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.page),
          children: [
            Text(lines.first.shopName, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            for (final line in lines)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${line.title}${line.variantLabel.isEmpty ? '' : ' (${line.variantLabel})'} × ${line.qty}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    PriceText(line.totalTenge, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
            const Divider(height: AppSpacing.xl),
            Row(
              children: [
                Text(l.total, style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                PriceText(total, style: Theme.of(context).textTheme.titleLarge),
              ],
            ),
            Text(l.finalPriceHint, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: AppSpacing.xl),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: l.phone, prefixIcon: const Icon(Icons.phone_outlined)),
              validator: (v) => (v ?? '').replaceAll(RegExp(r'\D'), '').length < 8 ? l.errInvalidPhone : null,
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _address,
              maxLength: 300,
              decoration: InputDecoration(labelText: l.deliveryAddress, prefixIcon: const Icon(Icons.place_outlined)),
            ),
            TextFormField(
              controller: _comment,
              maxLength: 1000,
              maxLines: 3,
              decoration: InputDecoration(labelText: l.orderComment),
            ),
            const SizedBox(height: AppSpacing.sm),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Row(
                  children: [
                    const Icon(Icons.payments_outlined),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(child: Text(l.paymentHint)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            FilledButton(
              onPressed: _sending ? null : () => _submit(lines),
              child: _sending
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(l.placeOrder),
            ),
          ],
        ),
      ),
    );
  }
}
