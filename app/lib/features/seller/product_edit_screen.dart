import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/api/error_text.dart';
import '../../core/format/formatters.dart';
import '../../core/l10n/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../ui/common.dart';
import '../../ui/net_image.dart';
import '../common/actions.dart';

class _MediaRef {
  _MediaRef(this.id, this.url, this.isVideo);
  final String id;
  final String url;
  final bool isVideo;
}

class _VariantRow {
  _VariantRow(this.kind, String value, int delta)
      : value = TextEditingController(text: value),
        delta = TextEditingController(text: delta == 0 ? '' : '${delta ~/ 100}');
  String kind;
  final TextEditingController value;
  final TextEditingController delta;
}

/// Create or edit a product: photos/videos, title, price, stock, category, variants, visibility.
class ProductEditScreen extends ConsumerStatefulWidget {
  const ProductEditScreen({super.key, this.productId});

  final String? productId;

  @override
  ConsumerState<ProductEditScreen> createState() => _ProductEditScreenState();
}

class _ProductEditScreenState extends ConsumerState<ProductEditScreen> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _price = TextEditingController();
  final _stock = TextEditingController(text: '1');
  final _description = TextEditingController();
  String? _categoryId;
  bool _visible = true;
  String _status = 'active';
  final _media = <_MediaRef>[];
  final _variants = <_VariantRow>[];
  bool _loading = false;
  bool _busy = false;
  int _uploading = 0;

  bool get _isNew => widget.productId == null;

  @override
  void initState() {
    super.initState();
    if (!_isNew) _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final p = await ref.read(sellerApiProvider).product(widget.productId!);
      _title.text = p.title;
      _price.text = formatPrice(p.priceTenge).replaceAll(RegExp(r'[^\d,]'), '');
      _stock.text = '${p.stock}';
      _description.text = p.description;
      _categoryId = p.categoryId;
      _status = p.status;
      _visible = p.status == 'active';
      _media
        ..clear()
        ..addAll(p.media.map((m) => _MediaRef(m.id, m.url, m.isVideo)));
      _variants
        ..clear()
        ..addAll(p.variants.map((v) => _VariantRow(v.kind, v.value, v.priceDeltaTenge)));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addMedia() async {
    final l = context.l10n;
    if (_media.length >= 10) return;
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(leading: const Icon(Icons.photo_camera_outlined), title: Text(l.takePhoto), onTap: () => Navigator.pop(context, 'camera')),
            ListTile(leading: const Icon(Icons.photo_library_outlined), title: Text(l.photoFromGallery), onTap: () => Navigator.pop(context, 'gallery')),
            ListTile(leading: const Icon(Icons.videocam_outlined), title: Text(l.video), onTap: () => Navigator.pop(context, 'video')),
          ],
        ),
      ),
    );
    if (choice == null) return;
    final picker = ImagePicker();
    final XFile? file = choice == 'video'
        ? await picker.pickVideo(source: ImageSource.gallery, maxDuration: const Duration(minutes: 1))
        : await picker.pickImage(
            source: choice == 'camera' ? ImageSource.camera : ImageSource.gallery,
            maxWidth: 1280,
            maxHeight: 1280,
            imageQuality: 80,
          );
    if (file == null) return;
    if (choice == 'video' && await File(file.path).length() > 12 * 1024 * 1024) {
      if (mounted) showMessage(context, l.videoTooLarge);
      return;
    }
    setState(() => _uploading++);
    try {
      final up = await ref.read(apiClientProvider).upload(file.path, 'product');
      setState(() => _media.add(_MediaRef(up['id'] as String, up['url'] as String, up['kind'] == 'video')));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _uploading--);
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    final body = {
      'title': _title.text.trim(),
      'description': _description.text.trim(),
      'priceTenge': parsePriceToTenge(_price.text)!,
      'stock': int.parse(_stock.text.trim()),
      'categoryId': _categoryId,
      if (_status != 'blocked') 'status': _visible ? 'active' : 'hidden',
      'mediaIds': _media.map((m) => m.id).toList(),
      'variants': [
        for (final v in _variants)
          if (v.value.text.trim().isNotEmpty)
            {'kind': v.kind, 'value': v.value.text.trim(), 'priceDeltaTenge': (parsePriceToTenge(v.delta.text) ?? 0)},
      ],
    };
    try {
      final api = ref.read(sellerApiProvider);
      _isNew ? await api.create(body) : await api.update(widget.productId!, body);
      ref.invalidate(sellerProductsProvider);
      ref.invalidate(sellerDashboardProvider);
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

  Future<void> _delete() async {
    final l = context.l10n;
    if (!await confirm(context, l.deleteProductConfirm, yes: l.delete, danger: true)) return;
    try {
      await ref.read(sellerApiProvider).delete(widget.productId!);
      ref.invalidate(sellerProductsProvider);
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final locale = Localizations.localeOf(context);
    final categories = ref.watch(categoriesProvider).value ?? const <Category>[];

    return Scaffold(
      appBar: AppBar(
        title: Text(_isNew ? l.addProduct : l.editProduct),
        actions: [
          if (!_isNew) IconButton(tooltip: l.delete, onPressed: _delete, icon: const Icon(Icons.delete_outline)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _form,
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.page),
                children: [
                  if (_status == 'blocked')
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: Text(l.productBlockedText, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ),
                  Text(l.productPhotos, style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: AppSpacing.sm),
                  SizedBox(
                    height: 96,
                    child: ReorderableListView(
                      scrollDirection: Axis.horizontal,
                      buildDefaultDragHandles: true,
                      onReorderItem: (from, to) => setState(() => _media.insert(to, _media.removeAt(from))),
                      footer: _media.length < 10
                          ? InkWell(
                              onTap: _uploading > 0 ? null : _addMedia,
                              child: Container(
                                width: 96,
                                margin: const EdgeInsets.only(right: AppSpacing.sm),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Theme.of(context).colorScheme.outline),
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                                child: Center(
                                  child: _uploading > 0 ? const CircularProgressIndicator() : const Icon(Icons.add_a_photo_outlined),
                                ),
                              ),
                            )
                          : null,
                      children: [
                        for (final m in _media)
                          Padding(
                            key: ValueKey(m.id),
                            padding: const EdgeInsets.only(right: AppSpacing.sm),
                            child: Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                  child: SizedBox(
                                    width: 96,
                                    height: 96,
                                    child: m.isVideo
                                        ? const ColoredBox(color: Colors.black, child: Icon(Icons.videocam, color: Colors.white))
                                        : NetImage(url: m.url, memCacheWidth: 240),
                                  ),
                                ),
                                Positioned(
                                  right: 2,
                                  top: 2,
                                  child: InkWell(
                                    onTap: () => setState(() => _media.remove(m)),
                                    child: const CircleAvatar(radius: 12, child: Icon(Icons.close, size: 14)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  TextFormField(
                    controller: _title,
                    maxLength: 120,
                    decoration: InputDecoration(labelText: l.productTitle),
                    validator: (v) => (v ?? '').trim().length < 2 ? l.fieldRequired : null,
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _price,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: InputDecoration(labelText: l.productPrice),
                          validator: (v) => parsePriceToTenge(v ?? '') == null ? l.fieldInvalidNumber : null,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: TextFormField(
                          controller: _stock,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(labelText: l.productStock),
                          validator: (v) => int.tryParse((v ?? '').trim()) == null ? l.fieldInvalidNumber : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<String?>(
                    initialValue: _categoryId,
                    decoration: InputDecoration(labelText: l.productCategory),
                    items: [
                      DropdownMenuItem(value: null, child: Text(l.noCategory)),
                      for (final c in categories) DropdownMenuItem(value: c.id, child: Text(c.name(locale))),
                    ],
                    onChanged: (v) => setState(() => _categoryId = v),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  TextFormField(
                    controller: _description,
                    maxLength: 4000,
                    maxLines: 5,
                    decoration: InputDecoration(labelText: l.description),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Expanded(child: Text(l.variants, style: Theme.of(context).textTheme.titleSmall)),
                      TextButton.icon(
                        onPressed: () => setState(() => _variants.add(_VariantRow('color', '', 0))),
                        icon: const Icon(Icons.add),
                        label: Text(l.addVariant),
                      ),
                    ],
                  ),
                  for (final v in _variants)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Row(
                        children: [
                          DropdownButton<String>(
                            value: v.kind,
                            items: [
                              DropdownMenuItem(value: 'color', child: Text(l.variantColor)),
                              DropdownMenuItem(value: 'size', child: Text(l.variantSize)),
                            ],
                            onChanged: (k) => setState(() => v.kind = k ?? 'color'),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            flex: 2,
                            child: TextField(controller: v.value, maxLength: 40, decoration: InputDecoration(hintText: l.variantValueHint, counterText: '', isDense: true)),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: TextField(
                              controller: v.delta,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(hintText: '+TMT', isDense: true),
                            ),
                          ),
                          IconButton(onPressed: () => setState(() => _variants.remove(v)), icon: const Icon(Icons.close)),
                        ],
                      ),
                    ),
                  if (_status != 'blocked')
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _visible,
                      onChanged: (v) => setState(() => _visible = v),
                      title: Text(l.visibleToBuyers),
                      subtitle: Text(_visible ? l.visibleHint : l.hiddenHint),
                    ),
                  const SizedBox(height: AppSpacing.lg),
                  FilledButton(
                    onPressed: _busy || _uploading > 0 ? null : _save,
                    child: _busy
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(l.save),
                  ),
                ],
              ),
            ),
    );
  }
}
