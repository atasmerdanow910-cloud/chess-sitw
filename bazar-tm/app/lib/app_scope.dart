import 'package:material_ui/material_ui.dart';

import 'core/settings/app_settings.dart';
import 'core/theme/tokens.dart';
import 'data/auth_store.dart';
import 'data/stores.dart';
import 'l10n/app_localizations.dart';

/// A request from another screen to open the catalog in a certain state
/// (a category from the home screen, the shops list, or the search field).
class CatalogRequest {
  const CatalogRequest({this.categoryId, this.shops = false, this.focusSearch = false});

  final String? categoryId;
  final bool shops;
  final bool focusSearch;
}

/// Hands the app-wide stores to every screen. Screens listen to the store they need
/// with [ListenableBuilder], so only the affected widgets rebuild.
class AppScope extends InheritedWidget {
  const AppScope({
    super.key,
    required this.settings,
    required this.auth,
    required this.products,
    required this.cart,
    required this.favorites,
    required this.orders,
    required this.chats,
    required this.seller,
    required this.tab,
    required this.catalogRequest,
    required super.child,
  });

  final AppSettings settings;
  final AuthStore auth;
  final ProductStore products;
  final CartStore cart;
  final FavoritesStore favorites;
  final OrdersStore orders;
  final ChatStore chats;
  final SellerStore seller;

  /// Selected bottom tab (0 home, 1 catalog, 2 cart, 3 chats, 4 profile).
  final ValueNotifier<int> tab;
  final ValueNotifier<CatalogRequest?> catalogRequest;

  static AppScope of(BuildContext context) => context.getInheritedWidgetOfExactType<AppScope>()!;

  @override
  bool updateShouldNotify(AppScope oldWidget) => false;
}

extension AppContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
  AppPalette get palette => AppPalette.of(this);
  TextTheme get text => Theme.of(this).textTheme;
  AppScope get app => AppScope.of(this);
  Locale get locale => Localizations.localeOf(this);

  /// Opens a bottom tab from anywhere, closing pushed screens first.
  void goToTab(int index) {
    Navigator.of(this).popUntil((route) => route.isFirst);
    app.tab.value = index;
  }

  void openCatalog({String? categoryId, bool shops = false, bool focusSearch = false}) {
    app.catalogRequest.value = CatalogRequest(categoryId: categoryId, shops: shops, focusSearch: focusSearch);
    goToTab(1);
  }

  void showMessage(String message, {String? actionLabel, VoidCallback? onAction}) {
    ScaffoldMessenger.of(this)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          action: actionLabel == null ? null : SnackBarAction(label: actionLabel, onPressed: onAction ?? () {}),
        ),
      );
  }

  /// Placeholder for actions that arrive on later days (login, uploads, voice).
  void comingSoon() => showMessage(l10n.comingSoon);
}
