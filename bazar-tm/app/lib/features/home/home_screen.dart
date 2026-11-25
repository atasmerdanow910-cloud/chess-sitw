import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../data/mock_data.dart';
import '../../data/models.dart';
import '../../ui/cards.dart';
import '../../ui/common.dart';
import '../shell/root_shell.dart';

/// Home: greeting, search pill, banners, categories, popular shops, new products.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, 0),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(color: p.accentFill, borderRadius: BorderRadius.circular(13)),
                    child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l.greeting, style: context.text.bodySmall?.copyWith(color: p.textSecondary)),
                        Text(l.appName, style: context.text.titleLarge),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.lg, AppSpace.lg, 0),
            child: Pressable(
              semanticLabel: l.searchHint,
              onTap: () => context.openCatalog(focusSearch: true),
              child: GlassSurface(
                radius: 18,
                shadow: false,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                child: Row(
                  children: [
                    Icon(Icons.search_rounded, color: p.textSecondary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(l.searchHint, style: context.text.bodyLarge?.copyWith(color: p.textTertiary)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SliverToBoxAdapter(child: _Banners()),
        SliverToBoxAdapter(child: SectionHeader(l.categories)),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 92,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
              itemCount: MockData.categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 6),
              itemBuilder: (context, i) => _CategoryTile(category: MockData.categories[i]),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: SectionHeader(l.popularShops, actionLabel: l.seeAll, onAction: () => context.openCatalog(shops: true)),
        ),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 94,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
              itemCount: MockData.shops.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) => ShopCard(shop: MockData.shops[i], width: 280),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: SectionHeader(l.newProducts, actionLabel: l.seeAll, onAction: () => context.openCatalog()),
        ),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
          sliver: ListenableBuilder(
            listenable: context.app.products,
            builder: (context, _) => productGrid(context.app.products.visible.where((x) => x.isNew).toList()),
          ),
        ),
        SliverToBoxAdapter(child: SizedBox(height: navBarSpace(context))),
      ],
    );
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({required this.category});

  final Category category;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Pressable(
      semanticLabel: category.name(context.locale),
      onTap: () => context.openCatalog(categoryId: category.id),
      child: SizedBox(
        width: 84,
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: category.color.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: p.line),
              ),
              child: Icon(category.icon, color: category.color),
            ),
            const SizedBox(height: 6),
            // Long names ("Электроника", "Çagalar üçin") shrink a little instead of being cut.
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(category.name(context.locale), maxLines: 1, style: context.text.labelMedium?.copyWith(color: p.textSecondary)),
            ),
          ],
        ),
      ),
    );
  }
}

class _Banners extends StatefulWidget {
  const _Banners();

  @override
  State<_Banners> createState() => _BannersState();
}

class _BannersState extends State<_Banners> {
  final _controller = PageController(viewportFraction: 0.9);
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final banners = [
      (l.bannerTitle1, l.bannerText1, Icons.local_shipping_rounded, const Color(0xFF12845A)),
      (l.bannerTitle2, l.bannerText2, Icons.verified_user_rounded, const Color(0xFF5B4BD6)),
      (l.bannerTitle3, l.bannerText3, Icons.payments_rounded, const Color(0xFFB7791F)),
    ];
    return Column(
      children: [
        const SizedBox(height: AppSpace.lg),
        SizedBox(
          height: 136,
          child: PageView.builder(
            controller: _controller,
            itemCount: banners.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (context, i) {
              final (title, text, icon, color) = banners[i];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 5),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(AppRadii.lg),
                    gradient: LinearGradient(colors: [color, Color.lerp(color, Colors.black, 0.35)!]),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: context.text.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800, height: 1.2),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                text,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: context.text.bodySmall?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Icon(icon, color: Colors.white.withValues(alpha: 0.9), size: 46),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < banners.length; i++)
              AnimatedContainer(
                duration: AppMotion.of(context, AppMotion.normal),
                curve: AppMotion.easeOut,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == _page ? 18 : 6,
                height: 6,
                decoration: BoxDecoration(color: i == _page ? p.accent : p.lineStrong, borderRadius: BorderRadius.circular(3)),
              ),
          ],
        ),
      ],
    );
  }
}
