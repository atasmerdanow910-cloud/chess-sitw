import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/tokens.dart';
import '../../data/mock_data.dart';
import '../../data/models.dart';
import '../../ui/common.dart';

/// Create or edit a product of the seller's own shop. The shop is never taken from the form:
/// the store writes it from the signed-in seller (on the server: from the token, Day 2–3).
class ProductEditScreen extends StatefulWidget {
  const ProductEditScreen({super.key, this.product});

  final Product? product;

  @override
  State<ProductEditScreen> createState() => _ProductEditScreenState();
}

class _ProductEditScreenState extends State<ProductEditScreen> {
  final _form = GlobalKey<FormState>();
  late final _title = TextEditingController(text: widget.product?.title);
  late final _price = TextEditingController(text: widget.product?.price.toString());
  late final _stock = TextEditingController(text: widget.product?.stock.toString());
  late final _description = TextEditingController(text: widget.product?.description);
  late final _colors = TextEditingController(text: widget.product?.colors.join(', '));
  late final _sizes = TextEditingController(text: widget.product?.sizes.join(', '));
  late String _category = widget.product?.categoryId ?? MockData.categories.first.id;

  @override
  void dispose() {
    for (final c in [_title, _price, _stock, _description, _colors, _sizes]) {
      c.dispose();
    }
    super.dispose();
  }

  static List<String> _split(String s) => s.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toSet().toList();

  void _save() {
    if (!_form.currentState!.validate()) return;
    final app = context.app;
    app.products.save(
      id: widget.product?.id,
      shopId: app.seller.shopId,
      title: _title.text.trim(),
      description: _description.text.trim(),
      categoryId: _category,
      price: int.parse(_price.text),
      stock: int.parse(_stock.text),
      colors: _split(_colors.text),
      sizes: _split(_sizes.text),
    );
    context.showMessage(context.l10n.saved);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    String? required(String? v) => (v == null || v.trim().isEmpty) ? l.requiredField : null;
    String? number(String? v, {int min = 0}) {
      final n = int.tryParse(v ?? '');
      return n == null || n < min ? l.invalidNumber : null;
    }

    const gap = SizedBox(height: AppSpace.md);
    final digits = [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(7)];
    return PageScaffold(
      title: widget.product == null ? l.addProduct : l.editProduct,
      bottomBar: BottomActionBar(
        children: [
          Expanded(
            child: FilledButton(onPressed: _save, child: Text(l.save)),
          ),
        ],
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.lg, 120 + MediaQuery.paddingOf(context).bottom),
          children: [
            FieldLabel(l.photosVideo),
            SizedBox(
              height: 92,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  Pressable(
                    semanticLabel: l.addPhoto,
                    onTap: context.comingSoon,
                    child: Container(
                      width: 92,
                      decoration: BoxDecoration(
                        color: p.accentSoft,
                        borderRadius: BorderRadius.circular(AppRadii.md),
                        border: Border.all(color: p.accent.withValues(alpha: 0.4)),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_a_photo_outlined, color: p.accent),
                          const SizedBox(height: 4),
                          Text(l.addPhoto, style: context.text.labelSmall?.copyWith(color: p.accent, letterSpacing: 0)),
                        ],
                      ),
                    ),
                  ),
                  if (widget.product != null)
                    for (var i = 0; i < 2; i++)
                      Padding(
                        padding: const EdgeInsets.only(left: 8),
                        child: SizedBox(
                          width: 92,
                          child: ProductImage(product: widget.product!, variant: i, iconSize: 30),
                        ),
                      ),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            Text(l.photoCompressNote, style: context.text.bodySmall?.copyWith(color: p.textTertiary)),
            const SizedBox(height: AppSpace.xl),
            TextFormField(
              controller: _title,
              decoration: InputDecoration(labelText: l.productTitle),
              validator: required,
              maxLength: 120,
            ),
            gap,
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _price,
                    keyboardType: TextInputType.number,
                    inputFormatters: digits,
                    decoration: InputDecoration(labelText: l.price),
                    validator: (v) => number(v, min: 1),
                  ),
                ),
                const SizedBox(width: AppSpace.md),
                Expanded(
                  child: TextFormField(
                    controller: _stock,
                    keyboardType: TextInputType.number,
                    inputFormatters: digits,
                    decoration: InputDecoration(labelText: l.stock),
                    validator: number,
                  ),
                ),
              ],
            ),
            gap,
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: InputDecoration(labelText: l.category),
              borderRadius: BorderRadius.circular(AppRadii.sm),
              items: [for (final c in MockData.categories) DropdownMenuItem(value: c.id, child: Text(c.name(context.locale)))],
              onChanged: (v) => setState(() => _category = v ?? _category),
            ),
            gap,
            TextFormField(
              controller: _description,
              decoration: InputDecoration(labelText: l.description),
              minLines: 3,
              maxLines: 8,
              maxLength: 2000,
            ),
            const SizedBox(height: AppSpace.lg),
            FieldLabel(l.variants),
            TextFormField(
              controller: _colors,
              decoration: InputDecoration(labelText: l.color, hintText: l.variantsHint),
            ),
            gap,
            TextFormField(
              controller: _sizes,
              decoration: InputDecoration(labelText: l.size, hintText: 'S, M, L, XL'),
            ),
          ],
        ),
      ),
    );
  }
}
