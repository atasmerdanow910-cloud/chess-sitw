import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/l10n/l10n.dart';
import '../../data/providers.dart';

/// Bottom navigation with 5 tabs. Each tab keeps its own history.
class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final cartCount = ref.watch(cartCountProvider);
    final unread = ref.watch(unreadChatsProvider);
    final notifications = ref.watch(notificationsProvider).value?.$2 ?? 0;

    Widget badged(IconData icon, int count) =>
        count > 0 ? Badge(label: Text(count > 99 ? '99+' : '$count'), child: Icon(icon)) : Icon(icon);

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(border: Border(top: BorderSide(color: Theme.of(context).colorScheme.outline))),
        child: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: (i) => navigationShell.goBranch(i, initialLocation: i == navigationShell.currentIndex),
          destinations: [
            NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home_rounded), label: l.navHome),
            NavigationDestination(
              icon: const Icon(Icons.storefront_outlined),
              selectedIcon: const Icon(Icons.storefront_rounded),
              label: l.navShops,
            ),
            NavigationDestination(
              icon: badged(Icons.shopping_bag_outlined, cartCount),
              selectedIcon: badged(Icons.shopping_bag_rounded, cartCount),
              label: l.navCart,
            ),
            NavigationDestination(
              icon: badged(Icons.chat_bubble_outline_rounded, unread),
              selectedIcon: badged(Icons.chat_bubble_rounded, unread),
              label: l.navChats,
            ),
            NavigationDestination(
              icon: badged(Icons.person_outline_rounded, notifications),
              selectedIcon: badged(Icons.person_rounded, notifications),
              label: l.navProfile,
            ),
          ],
        ),
      ),
    );
  }
}
