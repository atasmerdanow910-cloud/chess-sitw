import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/format/formatters.dart';
import '../../core/l10n/l10n.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/providers.dart';
import '../../ui/async_view.dart';
import '../../ui/common.dart';
import '../../ui/product_card.dart';
import '../../ui/shop_card.dart';

/// Search over products and shops with category, price and sort filters.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key, this.initialCategoryId});

  final String? initialCategoryId;

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  String _q = '';
  late String? _categoryId = widget.initialCategoryId;
  String _sort = 'new';
  int? _minPrice;
  int? _maxPrice;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String text) {
    _debounce?.cancel();
    // Wait until the user stops typing: fewer requests on slow internet.
    _debounce = Timer(const Duration(milliseconds: 450), () => setState(() => _q = text.trim()));
  }

  Future<void> _openFilters() async {
    final l = context.l10n;
    final minCtrl = TextEditingController(text: _minPrice == null ? '' : '${_minPrice! ~/ 100}');
    final maxCtrl = TextEditingController(text: _maxPrice == null ? '' : '${_maxPrice! ~/ 100}');
    var sort = _sort;
    final apply = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheet) => Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.page,
            0,
            AppSpacing.page,
            MediaQuery.viewInsetsOf(context).bottom + AppSpacing.page,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l.filters, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: AppSpacing.lg),
              Text(l.sortBy, style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  for (final (value, label) in [
                    ('new', l.sortNew),
                    ('price_asc', l.sortPriceAsc),
                    ('price_desc', l.sortPriceDesc),
                    ('popular', l.sortPopular),
                  ])
                    ChoiceChip(
                      label: Text(label),
                      selected: sort == value,
                      onSelected: (_) => setSheet(() => sort = value),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(l.priceRange, style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: minCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: l.priceFrom, suffixText: 'TMT'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: TextField(
                      controller: maxCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: l.priceTo, suffixText: 'TMT'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l.apply)),
              TextButton(
                onPressed: () {
                  minCtrl.clear();
                  maxCtrl.clear();
                  setSheet(() => sort = 'new');
                },
                child: Text(l.reset),
              ),
            ],
          ),
        ),
      ),
    );
    if (apply == true) {
      setState(() {
        _sort = sort;
        _minPrice = parsePriceToTenge(minCtrl.text);
        _maxPrice = parsePriceToTenge(maxCtrl.text);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final categories = ref.watch(categoriesProvider).value ?? const [];
    final productQuery = (
      q: _q.isEmpty ? null : _q,
      categoryId: _categoryId,
      shopId: null,
      minPrice: _minPrice,
      maxPrice: _maxPrice,
      sort: _sort,
    );
    final products = ref.watch(productsProvider(productQuery));
    final shops = _q.length >= 2 ? ref.watch(shopsProvider((q: _q, categoryId: null))).value ?? const [] : const [];
    final hasFilters = _minPrice != null || _maxPrice != null || _sort != 'new';

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: TextField(
          controller: _controller,
          autofocus: widget.initialCategoryId == null,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(hintText: context.l10n.searchHint, prefixIcon: const Icon(Icons.search), isDense: true),
          onChanged: _onChanged,
          onSubmitted: (t) => setState(() => _q = t.trim()),
        ),
        actions: [
          IconButton(
            tooltip: context.l10n.filters,
            onPressed: _openFilters,
            icon: Badge(isLabelVisible: hasFilters, smallSize: 8, child: const Icon(Icons.tune)),
          ),
          const SizedBox(width: AppSpacing.sm),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: SizedBox(
              height: 52,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, 0),
                children: [
                  for (final c in categories)
                    Padding(
                      padding: const EdgeInsets.only(right: AppSpacing.sm),
                      child: FilterChip(
                        avatar: Icon(c.iconData, size: 18),
                        label: Text(c.name(locale)),
                        selected: _categoryId == c.id,
                        onSelected: (on) => setState(() => _categoryId = on ? c.id : null),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (shops.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.md, AppSpacing.page, 0),
              sliver: SliverList.separated(
                itemCount: shops.length,
                separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, i) => ShopCard(shop: shops[i]),
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.md)),
          ...products.when(
            skipLoadingOnReload: true,
            loading: () => [const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))],
            error: (e, _) => [
              SliverFillRemaining(
                hasScrollBody: false,
                child: ErrorView(error: e, onRetry: () => ref.invalidate(productsProvider(productQuery))),
              ),
            ],
            data: (list) => [
              if (list.isEmpty && shops.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyState(icon: Icons.search_off, title: context.l10n.searchNothingFound),
                )
              else
                ProductGrid(products: list),
            ],
          ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),
        ],
      ),
    );
  }
}
