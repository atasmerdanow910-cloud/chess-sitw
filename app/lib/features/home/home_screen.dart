import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/l10n/l10n.dart';
import '../../core/settings/settings_controller.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models.dart';
import '../../data/providers.dart';
import '../../ui/app_logo.dart';
import '../../ui/async_view.dart';
import '../../ui/common.dart';
import '../../ui/net_image.dart';
import '../../ui/product_card.dart';
import '../../ui/shop_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final home = ref.watch(homeProvider);
    final locale = Localizations.localeOf(context);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(homeProvider.future),
          child: CustomScrollView(
            slivers: [
              const SliverToBoxAdapter(child: HomeHeader()),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, AppSpacing.md),
                  child: SearchBox(onTap: () => context.push('/search')),
                ),
              ),
              ...home.when(
                skipLoadingOnRefresh: true,
                loading: () => [const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))],
                error: (e, _) => [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: ErrorView(error: e, onRetry: () => ref.invalidate(homeProvider)),
                  ),
                ],
                data: (data) => [
                  if (data.banners.isNotEmpty) SliverToBoxAdapter(child: _Banners(banners: data.banners)),
                  SliverToBoxAdapter(child: SectionHeader(title: l.categories)),
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 96,
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page),
                        scrollDirection: Axis.horizontal,
                        itemCount: data.categories.length,
                        separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.md),
                        itemBuilder: (context, i) {
                          final c = data.categories[i];
                          return _CategoryItem(
                            icon: c.iconData,
                            label: c.name(locale),
                            onTap: () => context.push('/search?category=${c.id}'),
                          );
                        },
                      ),
                    ),
                  ),
                  if (data.popularShops.isNotEmpty) ...[
                    SliverToBoxAdapter(
                      child: SectionHeader(title: l.popularShops, actionLabel: l.seeAll, onAction: () => context.go('/shops')),
                    ),
                    SliverToBoxAdapter(
                      child: SizedBox(
                        height: 150,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page),
                          scrollDirection: Axis.horizontal,
                          itemCount: data.popularShops.length,
                          separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.md),
                          itemBuilder: (context, i) => ShopTile(shop: data.popularShops[i]),
                        ),
                      ),
                    ),
                  ],
                  SliverToBoxAdapter(
                    child: SectionHeader(
                      title: l.newProducts,
                      actionLabel: l.seeAll,
                      onAction: () => context.push('/search'),
                    ),
                  ),
                  if (data.newProducts.isEmpty)
                    SliverToBoxAdapter(child: EmptyState(icon: Icons.inventory_2_outlined, title: l.noProductsYet))
                  else
                    ProductGrid(products: data.newProducts),
                  const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Logo + theme button + language button (same layout as the old site).
class HomeHeader extends ConsumerWidget {
  const HomeHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final brightness = Theme.of(context).brightness;
    final l = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.md, AppSpacing.page, 0),
      child: Row(
        children: [
          const Expanded(child: Align(alignment: Alignment.centerLeft, child: AppLogo())),
          const SizedBox(width: AppSpacing.sm),
          HeaderSquareButton(
            tooltip: l.theme,
            icon: brightness == Brightness.dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
            onPressed: () => ref.read(settingsProvider.notifier).toggleDarkLight(brightness),
          ),
          const SizedBox(width: AppSpacing.sm),
          HeaderSquareButton(
            tooltip: l.language,
            icon: Icons.language,
            label: localeShortLabel(settings.locale),
            onPressed: () => ref.read(settingsProvider.notifier).toggleLocale(),
          ),
        ],
      ),
    );
  }
}

class SearchBox extends StatelessWidget {
  const SearchBox({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: BorderSide(color: scheme.outline),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: onTap,
        child: SizedBox(
          height: 52,
          child: Row(
            children: [
              const SizedBox(width: AppSpacing.lg),
              Icon(Icons.search, color: scheme.onSurfaceVariant),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  context.l10n.searchHint,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: scheme.onSurfaceVariant),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Banners extends StatefulWidget {
  const _Banners({required this.banners});

  final List<BannerItem> banners;

  @override
  State<_Banners> createState() => _BannersState();
}

class _BannersState extends State<_Banners> {
  final _controller = PageController(viewportFraction: 0.92);
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final banners = widget.banners;
    return Column(
      children: [
        SizedBox(
          height: 128,
          child: PageView.builder(
            controller: _controller,
            itemCount: banners.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (context, i) {
              final b = banners[i];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  child: InkWell(
                    onTap: b.shopId == null ? null : () => context.push('/shop/${b.shopId}'),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(colors: [b.color, Color.lerp(b.color, Colors.black, 0.35)!]),
                          ),
                        ),
                        if (b.imageUrl != null) NetImage(url: b.imageUrl),
                        Padding(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                b.title(locale),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                    ),
                              ),
                              if (b.subtitle(locale).isNotEmpty) ...[
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  b.subtitle(locale),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: Colors.white.withValues(alpha: 0.85),
                                      ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        if (banners.length > 1) ...[
          const SizedBox(height: AppSpacing.sm),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < banners.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == _page ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: i == _page ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.outline,
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _CategoryItem extends StatelessWidget {
  const _CategoryItem({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: onTap,
      child: SizedBox(
        width: 72,
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: scheme.surface,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: scheme.outline),
              ),
              child: Icon(icon, color: scheme.primary),
            ),
            const SizedBox(height: AppSpacing.xs + 2),
            Text(
              label,
              maxLines: 2,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        ),
      ),
    );
  }
}
