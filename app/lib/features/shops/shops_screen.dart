import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/providers.dart';
import '../../ui/async_view.dart';
import '../../ui/common.dart';
import '../../ui/shop_card.dart';

class ShopsScreen extends ConsumerStatefulWidget {
  const ShopsScreen({super.key});

  @override
  ConsumerState<ShopsScreen> createState() => _ShopsScreenState();
}

class _ShopsScreenState extends ConsumerState<ShopsScreen> {
  String? _categoryId;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final categories = ref.watch(categoriesProvider).value ?? const [];
    final query = (q: null, categoryId: _categoryId);
    final shops = ref.watch(shopsProvider(query));

    return Scaffold(
      appBar: AppBar(title: Text(context.l10n.allShops)),
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
                  child: ChoiceChip(
                    label: Text(context.l10n.seeAll),
                    selected: _categoryId == null,
                    onSelected: (_) => setState(() => _categoryId = null),
                  ),
                ),
                for (final c in categories)
                  Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.sm),
                    child: ChoiceChip(
                      label: Text(c.name(locale)),
                      selected: _categoryId == c.id,
                      onSelected: (_) => setState(() => _categoryId = c.id),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(shopsProvider(query).future),
              child: AsyncView(
                value: shops,
                onRetry: () => ref.invalidate(shopsProvider(query)),
                data: (list) => list.isEmpty
                    ? ListView(children: [EmptyState(icon: Icons.storefront_outlined, title: context.l10n.noShopsYet)])
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppSpacing.page),
                        itemCount: list.length,
                        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
                        itemBuilder: (context, i) => ShopCard(shop: list[i]),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
