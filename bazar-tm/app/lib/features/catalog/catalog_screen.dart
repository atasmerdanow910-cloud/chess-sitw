import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/format/money.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../data/mock_data.dart';
import '../../data/models.dart';
import '../../ui/cards.dart';
import '../../ui/common.dart';
import '../shell/root_shell.dart';

enum CatalogSort { popular, cheap, expensive, newest }

/// Catalog: search over products and shops, category chips, price filter and sorting.
class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key});

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final _query = TextEditingController();
  final _focus = FocusNode();
  Timer? _debounce;
  bool _loading = false;
  bool _shops = false;
  String? _category;
  RangeValues? _price;
  CatalogSort _sort = CatalogSort.popular;
  ValueNotifier<CatalogRequest?>? _requests;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_requests == null) {
      _requests = context.app.catalogRequest..addListener(_onRequest);
      _onRequest();
    }
  }

  @override
  void dispose() {
    _requests?.removeListener(_onRequest);
    _debounce?.cancel();
    _query.dispose();
    _focus.dispose();
    super.dispose();
  }

  /// Another screen asked to open the catalog in a certain state.
  void _onRequest() {
    final r = _requests?.value;
    if (r == null) return;
    setState(() {
      _shops = r.shops;
      if (!r.shops) _category = r.categoryId;
    });
    if (r.focusSearch) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _focus.requestFocus();
      });
    }
    _requests!.value = null;
  }

  /// Shows skeletons for a moment while typing — the same pause the server search will have.
  void _onQueryChanged(String _) {
    _debounce?.cancel();
    setState(() => _loading = true);
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) setState(() => _loading = false);
    });
  }

  int get _maxPrice => MockData.products.fold(0, (m, p) => p.price > m ? p.price : m);
  bool get _filtered => _price != null || _sort != CatalogSort.popular;

  List<Product> _products(List<Product> all, Locale locale) {
    final q = _query.text.trim().toLowerCase();
    final list = all.where((p) {
      if (_category != null && p.categoryId != _category) return false;
      if (_price != null && (p.price < _price!.start || p.price > _price!.end)) return false;
      if (q.isEmpty) return true;
      final shop = MockData.shop(p.shopId);
      final cat = MockData.category(p.categoryId);
      return p.title.toLowerCase().contains(q) ||
          shop.name.toLowerCase().contains(q) ||
          cat.nameRu.toLowerCase().contains(q) ||
          cat.nameTk.toLowerCase().contains(q);
    }).toList();
    switch (_sort) {
      case CatalogSort.popular:
        list.sort((a, b) => b.views.compareTo(a.views));
      case CatalogSort.cheap:
        list.sort((a, b) => a.price.compareTo(b.price));
      case CatalogSort.expensive:
        list.sort((a, b) => b.price.compareTo(a.price));
      case CatalogSort.newest:
        list.sort((a, b) => (b.isNew ? 1 : 0).compareTo(a.isNew ? 1 : 0));
    }
    return list;
  }

  List<Shop> _shopsFound(Locale locale) {
    final q = _query.text.trim().toLowerCase();
    if (q.isEmpty) return MockData.shops;
    return MockData.shops
        .where(
          (s) => s.name.toLowerCase().contains(q) || s.description(locale).toLowerCase().contains(q) || s.market.toLowerCase().contains(q),
        )
        .toList();
  }

  Future<void> _openFilters() async {
    final result = await showModalBottomSheet<(RangeValues?, CatalogSort)>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _FilterSheet(max: _maxPrice, price: _price, sort: _sort),
    );
    if (result == null) return;
    setState(() {
      _price = result.$1;
      _sort = result.$2;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    return Column(
      children: [
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, AppSpace.sm),
            child: Column(
              children: [
                GlassSurface(
                  radius: 18,
                  shadow: false,
                  child: TextField(
                    controller: _query,
                    focusNode: _focus,
                    textInputAction: TextInputAction.search,
                    onChanged: _onQueryChanged,
                    decoration: InputDecoration(
                      filled: false,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      hintText: l.searchHint,
                      prefixIcon: Icon(Icons.search_rounded, color: p.textSecondary),
                      suffixIcon: ListenableBuilder(
                        listenable: _query,
                        builder: (context, _) => _query.text.isEmpty
                            ? const SizedBox.shrink()
                            : IconButton(
                                tooltip: l.reset,
                                icon: const Icon(Icons.close_rounded),
                                onPressed: () {
                                  _query.clear();
                                  _onQueryChanged('');
                                },
                              ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpace.md),
                SizedBox(
                  width: double.infinity,
                  child: SegmentedButton<bool>(
                    showSelectedIcon: false,
                    segments: [
                      ButtonSegment(value: false, label: Text(l.productsTab), icon: const Icon(Icons.grid_view_rounded, size: 18)),
                      ButtonSegment(value: true, label: Text(l.shopsTab), icon: const Icon(Icons.storefront_rounded, size: 18)),
                    ],
                    selected: {_shops},
                    onSelectionChanged: (s) => setState(() => _shops = s.first),
                  ),
                ),
              ],
            ),
          ),
        ),
        Expanded(child: _shops ? _buildShops(context) : _buildProducts(context)),
      ],
    );
  }

  Widget _buildProducts(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    return ListenableBuilder(
      listenable: context.app.products,
      builder: (context, _) {
        final items = _products(context.app.products.visible, context.locale);
        return CustomScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          slivers: [
            SliverToBoxAdapter(
              child: SizedBox(
                height: 48,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: 4),
                  children: [
                    _chip(l.allCategories, _category == null, () => setState(() => _category = null)),
                    for (final c in MockData.categories)
                      _chip(c.name(context.locale), _category == c.id, () => setState(() => _category = _category == c.id ? null : c.id)),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.sm, AppSpace.sm),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _loading ? ' ' : l.foundCount(items.length),
                        style: context.text.bodyMedium?.copyWith(color: p.textSecondary),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _openFilters,
                      icon: Badge(isLabelVisible: _filtered, smallSize: 8, child: const Icon(Icons.tune_rounded, size: 20)),
                      label: Text(l.filters),
                    ),
                  ],
                ),
              ),
            ),
            if (_loading)
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 260,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.62,
                  ),
                  delegate: SliverChildBuilderDelegate((context, i) => const _ProductSkeleton(), childCount: 4),
                ),
              )
            else if (items.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  icon: Icons.search_off_rounded,
                  title: l.nothingFound,
                  hint: l.nothingFoundHint,
                  actionLabel: l.reset,
                  onAction: () {
                    _query.clear();
                    setState(() {
                      _category = null;
                      _price = null;
                      _sort = CatalogSort.popular;
                    });
                  },
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
                sliver: productGrid(items),
              ),
            SliverToBoxAdapter(child: SizedBox(height: navBarSpace(context))),
          ],
        );
      },
    );
  }

  Widget _buildShops(BuildContext context) {
    final l = context.l10n;
    final shops = _shopsFound(context.locale);
    if (shops.isEmpty) {
      return EmptyState(icon: Icons.search_off_rounded, title: l.nothingFound, hint: l.nothingFoundHint);
    }
    return ListView.separated(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.lg, navBarSpace(context)),
      itemCount: shops.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, i) => ShopCard(shop: shops[i]),
    );
  }

  Widget _chip(String label, bool selected, VoidCallback onTap) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: ChoiceChip(
      label: Text(label),
      selected: selected,
      showCheckmark: false,
      onSelected: (_) => onTap(),
      labelStyle: selected ? context.text.labelMedium?.copyWith(color: context.palette.accent) : null,
      side: BorderSide(color: selected ? context.palette.accent.withValues(alpha: 0.5) : context.palette.line),
    ),
  );
}

class _ProductSkeleton extends StatelessWidget {
  const _ProductSkeleton();

  @override
  Widget build(BuildContext context) => SurfaceCard(
    padding: const EdgeInsets.all(4),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: const [
        AspectRatio(aspectRatio: 1, child: Skeleton(radius: AppRadii.md)),
        Padding(
          padding: EdgeInsets.fromLTRB(8, 12, 8, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Skeleton(width: 80, height: 16),
              SizedBox(height: 8),
              Skeleton(height: 12),
              SizedBox(height: 6),
              Skeleton(width: 100, height: 12),
            ],
          ),
        ),
      ],
    ),
  );
}

/// Price range and sorting. Returns the new values on "Apply".
class _FilterSheet extends StatefulWidget {
  const _FilterSheet({required this.max, required this.price, required this.sort});

  final int max;
  final RangeValues? price;
  final CatalogSort sort;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late RangeValues _range = widget.price ?? RangeValues(0, widget.max.toDouble());
  late CatalogSort _sort = widget.sort;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final max = widget.max.toDouble();
    final sorts = {
      CatalogSort.popular: l.sortPopular,
      CatalogSort.cheap: l.sortCheap,
      CatalogSort.expensive: l.sortExpensive,
      CatalogSort.newest: l.sortNew,
    };
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l.filters, style: context.text.titleLarge),
            const SizedBox(height: AppSpace.xl),
            FieldLabel(l.price),
            Row(
              children: [
                Text('${l.priceFrom} ${formatTmt(_range.start.round())}', style: context.text.bodyMedium),
                const Spacer(),
                Text('${l.priceTo} ${formatTmt(_range.end.round())}', style: context.text.bodyMedium),
              ],
            ),
            RangeSlider(
              values: _range,
              min: 0,
              max: max,
              divisions: (max / 50).ceil(),
              activeColor: p.accentFill,
              labels: RangeLabels(formatTmt(_range.start.round()), formatTmt(_range.end.round())),
              onChanged: (v) => setState(() => _range = v),
            ),
            const SizedBox(height: AppSpace.md),
            FieldLabel(l.sort),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final e in sorts.entries)
                  ChoiceChip(
                    label: Text(e.value),
                    selected: _sort == e.key,
                    showCheckmark: false,
                    labelStyle: _sort == e.key ? context.text.labelMedium?.copyWith(color: p.accent) : null,
                    onSelected: (_) => setState(() => _sort = e.key),
                  ),
              ],
            ),
            const SizedBox(height: AppSpace.xl),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(onPressed: () => Navigator.pop(context, (null, CatalogSort.popular)), child: Text(l.reset)),
                ),
                const SizedBox(width: AppSpace.md),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      final full = _range.start <= 0 && _range.end >= max;
                      Navigator.pop(context, (full ? null : _range, _sort));
                    },
                    child: Text(l.apply),
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
