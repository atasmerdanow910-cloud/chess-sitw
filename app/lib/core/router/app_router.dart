import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../features/cart/cart_screen.dart';
import '../../features/cart/checkout_screen.dart';
import '../../features/chat/chat_screen.dart';
import '../../features/chat/chats_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/orders/orders_screens.dart';
import '../../features/owner/owner_screens.dart';
import '../../features/product/product_screen.dart';
import '../../features/profile/auth_screens.dart';
import '../../features/profile/more_screens.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/search/search_screen.dart';
import '../../features/seller/product_edit_screen.dart';
import '../../features/seller/seller_screens.dart';
import '../../features/shell/main_shell.dart';
import '../../features/shop/shop_screen.dart';
import '../../features/shops/shops_screen.dart';
import '../../ui/common.dart';
import '../auth/auth_controller.dart';
import '../l10n/l10n.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

/// Re-checks route permissions when the user logs in/out.
class _AuthChanges extends ChangeNotifier {
  _AuthChanges(Ref ref) {
    ref.listen(currentUserProvider, (_, _) => notifyListeners());
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final changes = _AuthChanges(ref);
  ref.onDispose(changes.dispose);

  GoRoute page(String path, Widget Function(GoRouterState s) build) =>
      GoRoute(path: path, parentNavigatorKey: rootNavigatorKey, builder: (_, s) => build(s));

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    refreshListenable: changes,
    redirect: (context, state) {
      final user = ref.read(currentUserProvider);
      final loc = state.matchedLocation;
      final needsLogin = ['/orders', '/favorites', '/notifications', '/invite', '/seller', '/owner'].any(loc.startsWith);
      if (needsLogin && user == null) return '/login';
      if (loc.startsWith('/seller') && !(user?.isSeller ?? false)) return '/profile';
      if (loc.startsWith('/owner') && !(user?.isOwner ?? false)) return '/profile';
      return null;
    },
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(),
      body: EmptyState(
        icon: Icons.link_off,
        title: context.l10n.pageNotFound,
        action: FilledButton(onPressed: () => context.go('/'), child: Text(context.l10n.goHome)),
      ),
    ),
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => MainShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/', builder: (_, _) => const HomeScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/shops', builder: (_, _) => const ShopsScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/cart', builder: (_, _) => const CartScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/chats', builder: (_, _) => const ChatsScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen())]),
        ],
      ),
      page('/search', (s) => SearchScreen(initialCategoryId: s.uri.queryParameters['category'])),
      page('/shop/:id', (s) => ShopScreen(shopId: s.pathParameters['id']!)),
      page('/product/:id', (s) => ProductScreen(productId: s.pathParameters['id']!)),
      page('/checkout/:shopId', (s) => CheckoutScreen(shopId: s.pathParameters['shopId']!)),
      page('/order/:id', (s) => OrderScreen(orderId: s.pathParameters['id']!, justCreated: s.uri.queryParameters['created'] == '1')),
      page('/orders', (_) => const MyOrdersScreen()),
      page('/chat/:id', (s) => ChatScreen(conversationId: s.pathParameters['id']!)),
      page('/login', (_) => const LoginScreen()),
      page('/register', (_) => const RegisterScreen()),
      page('/invite', (_) => const InviteScreen()),
      page('/favorites', (_) => const FavoritesScreen()),
      page('/notifications', (_) => const NotificationsScreen()),
      page('/legal/:kind', (s) => LegalScreen(kind: s.pathParameters['kind']!)),
      // Seller panel
      page('/seller', (_) => const SellerDashboardScreen()),
      page('/seller/products', (_) => const SellerProductsScreen()),
      page('/seller/products/new', (_) => const ProductEditScreen()),
      page('/seller/products/:id', (s) => ProductEditScreen(productId: s.pathParameters['id'])),
      page('/seller/orders', (_) => const SellerOrdersScreen()),
      page('/seller/shop', (_) => const SellerShopEditScreen()),
      page('/seller/chats', (_) => const ChatsScreen(sellerOnly: true)),
      // Owner panel
      page('/owner', (_) => const OwnerDashboardScreen()),
      page('/owner/shops', (_) => const OwnerShopsScreen()),
      page('/owner/shops/new', (_) => const OwnerCreateShopScreen()),
      page('/owner/shops/:id', (s) => OwnerShopScreen(shopId: s.pathParameters['id']!)),
      page('/owner/reports', (_) => const OwnerReportsScreen()),
      page('/owner/users', (_) => const OwnerUsersScreen()),
      page('/owner/categories', (_) => const OwnerCategoriesScreen()),
      page('/owner/banners', (_) => const OwnerBannersScreen()),
      page('/owner/plans', (_) => const OwnerPlansScreen()),
      page('/owner/broadcast', (_) => const OwnerBroadcastScreen()),
      page('/owner/payments', (_) => const OwnerPaymentsScreen()),
    ],
  );
});
