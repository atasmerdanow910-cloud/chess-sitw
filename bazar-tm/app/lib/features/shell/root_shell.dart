import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/glass.dart';
import '../../ui/glass_nav_bar.dart';
import '../cart/cart_screen.dart';
import '../catalog/catalog_screen.dart';
import '../chat/chats_screen.dart';
import '../home/home_screen.dart';
import '../profile/profile_screen.dart';

/// Main frame: five tabs kept alive in an [IndexedStack] under the floating glass bar.
class RootShell extends StatelessWidget {
  const RootShell({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.app;
    final l = context.l10n;
    final items = [
      NavItem(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: l.tabHome),
      NavItem(icon: Icons.search_rounded, activeIcon: Icons.manage_search_rounded, label: l.tabCatalog),
      NavItem(
        icon: Icons.shopping_bag_outlined,
        activeIcon: Icons.shopping_bag_rounded,
        label: l.tabCart,
        badgeSource: app.cart,
        badgeCount: () => app.cart.count,
      ),
      NavItem(
        icon: Icons.chat_bubble_outline_rounded,
        activeIcon: Icons.chat_bubble_rounded,
        label: l.tabChats,
        badgeSource: app.chats,
        badgeCount: () => app.chats.unread,
      ),
      NavItem(icon: Icons.person_outline_rounded, activeIcon: Icons.person_rounded, label: l.tabProfile),
    ];
    return ValueListenableBuilder<int>(
      valueListenable: app.tab,
      builder: (context, index, _) => Scaffold(
        extendBody: true,
        body: GlowBackground(
          child: IndexedStack(index: index, children: const [HomeScreen(), CatalogScreen(), CartScreen(), ChatsScreen(), ProfileScreen()]),
        ),
        bottomNavigationBar: GlassNavBar(items: items, index: index, onTap: (i) => app.tab.value = i),
      ),
    );
  }
}

/// Bottom padding so the last content is not hidden under the floating bar.
double navBarSpace(BuildContext context) => 96 + MediaQuery.paddingOf(context).bottom;
