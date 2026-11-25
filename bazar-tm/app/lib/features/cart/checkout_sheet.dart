import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/format/money.dart';
import '../../core/theme/tokens.dart';
import '../../data/models.dart';
import '../../ui/common.dart';
import '../chat/chat_screen.dart';
import '../orders/orders_screen.dart';

/// Normalizes a Turkmen phone number to "+993 XX XXXXXX".
/// Accepts 8 local digits ("65 123456") or the full form with 993. Returns null if invalid.
String? normalizeTmPhone(String input) {
  final digits = input.replaceAll(RegExp(r'\D'), '');
  final local = digits.length == 11 && digits.startsWith('993') ? digits.substring(3) : (digits.length == 8 ? digits : null);
  if (local == null || local.startsWith('0')) return null;
  return '+993 ${local.substring(0, 2)} ${local.substring(2)}';
}

/// The form the server stores: "+99365123456".
String? canonicalTmPhone(String input) => normalizeTmPhone(input)?.replaceAll(' ', '');

/// Checkout of one shop's items: contact, address, note on cash payment, confirmation.
Future<void> showCheckoutSheet(BuildContext context, Shop shop) async {
  final order = await showModalBottomSheet<Order>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _CheckoutSheet(shop: shop),
  );
  if (order == null || !context.mounted) return;
  await showModalBottomSheet<void>(
    context: context,
    builder: (_) => _OrderPlaced(order: order, shop: shop),
  );
}

class _CheckoutSheet extends StatefulWidget {
  const _CheckoutSheet({required this.shop});

  final Shop shop;

  @override
  State<_CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends State<_CheckoutSheet> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController(text: '+993 ');
  final _address = TextEditingController();
  final _comment = TextEditingController();

  @override
  void initState() {
    super.initState();
    final user = AppScope.of(context).auth.user;
    if (user != null) {
      _name.text = user.name;
      if (user.phone != null) _phone.text = formatPhone(user.phone!);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    _comment.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_form.currentState!.validate()) return;
    final app = context.app;
    final lines = app.cart.takeShop(widget.shop.id);
    final order = app.orders.place(shopId: widget.shop.id, lines: lines, name: _name.text.trim(), phone: normalizeTmPhone(_phone.text)!);
    Navigator.pop(context, order);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final total = context.app.cart.totalFor(widget.shop.id);
    String? required(String? v) => (v == null || v.trim().isEmpty) ? l.requiredField : null;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.xl),
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.checkoutTitle, style: context.text.titleLarge),
              const SizedBox(height: 2),
              Text(widget.shop.name, style: context.text.bodyMedium?.copyWith(color: p.textSecondary)),
              const SizedBox(height: AppSpace.xl),
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.name],
                decoration: InputDecoration(labelText: l.yourName),
                validator: required,
              ),
              const SizedBox(height: AppSpace.md),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.telephoneNumber],
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+ \-()]')), LengthLimitingTextInputFormatter(18)],
                decoration: InputDecoration(labelText: l.phone, hintText: '+993 6X XXXXXX'),
                validator: (v) => normalizeTmPhone(v ?? '') == null ? l.invalidPhone : null,
              ),
              const SizedBox(height: AppSpace.md),
              TextFormField(
                controller: _address,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(labelText: l.deliveryAddress, hintText: l.addressHint),
                validator: required,
              ),
              const SizedBox(height: AppSpace.md),
              TextFormField(
                controller: _comment,
                minLines: 2,
                maxLines: 4,
                maxLength: 500,
                decoration: InputDecoration(labelText: l.comment, helperText: l.optional),
              ),
              const SizedBox(height: AppSpace.sm),
              InfoNote(l.paymentNote, icon: Icons.payments_outlined),
              const SizedBox(height: AppSpace.lg),
              Row(
                children: [
                  Text(l.total, style: context.text.titleMedium?.copyWith(color: p.textSecondary)),
                  const Spacer(),
                  PriceText(total, style: context.text.titleLarge),
                ],
              ),
              const SizedBox(height: AppSpace.lg),
              SizedBox(
                width: double.infinity,
                child: FilledButton(onPressed: _submit, child: Text(l.placeOrder)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrderPlaced extends StatelessWidget {
  const _OrderPlaced({required this.order, required this.shop});

  final Order order;
  final Shop shop;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(color: p.accentSoft, shape: BoxShape.circle),
              child: Icon(Icons.check_rounded, color: p.accent, size: 36),
            ),
            const SizedBox(height: AppSpace.lg),
            Text(l.orderPlaced, style: context.text.titleLarge, textAlign: TextAlign.center),
            const SizedBox(height: AppSpace.xs),
            Text(l.orderNumber(order.id), style: context.text.titleMedium?.copyWith(color: p.accent)),
            const SizedBox(height: AppSpace.sm),
            Text(
              l.orderPlacedHint,
              textAlign: TextAlign.center,
              style: context.text.bodyMedium?.copyWith(color: p.textSecondary),
            ),
            const SizedBox(height: AppSpace.xl),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute<void>(builder: (_) => const OrdersScreen()));
                    },
                    child: Text(l.ordersTitle),
                  ),
                ),
                const SizedBox(width: AppSpace.md),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      Navigator.pop(context);
                      openChatWith(context, shop.id);
                    },
                    child: Text(l.openChat),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
