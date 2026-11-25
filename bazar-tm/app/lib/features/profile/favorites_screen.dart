import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/tokens.dart';
import '../../ui/cards.dart';
import '../../ui/common.dart';

class FavoritesScreen extends StatelessWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final app = context.app;
    return PageScaffold(
      title: l.favorites,
      body: ListenableBuilder(
        listenable: Listenable.merge([app.favorites, app.products]),
        builder: (context, _) {
          final items = app.products.visible.where((p) => app.favorites.contains(p.id)).toList();
          if (items.isEmpty) {
            return EmptyState(
              icon: Icons.favorite_border_rounded,
              title: l.favoritesEmpty,
              hint: l.favoritesEmptyHint,
              actionLabel: l.goToCatalog,
              onAction: () => context.openCatalog(),
            );
          }
          return CustomScrollView(
            slivers: [
              SliverPadding(padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.lg, 0), sliver: productGrid(items)),
              SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl + MediaQuery.paddingOf(context).bottom)),
            ],
          );
        },
      ),
    );
  }
}
