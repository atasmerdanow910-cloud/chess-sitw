import 'package:flutter/gestures.dart';
import 'package:material_ui/material_ui.dart';

import 'app_scope.dart';
import 'core/l10n/turkmen_fallback.dart';
import 'core/settings/app_settings.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/tokens.dart';
import 'data/auth_store.dart';
import 'data/stores.dart';
import 'features/onboarding/language_screen.dart';
import 'features/shell/root_shell.dart';
import 'l10n/app_localizations.dart';

/// Root widget: creates the stores once, then rebuilds MaterialApp when language or theme change.
class BazarApp extends StatefulWidget {
  const BazarApp({super.key, required this.settings, required this.auth});

  final AppSettings settings;
  final AuthStore auth;

  @override
  State<BazarApp> createState() => _BazarAppState();
}

class _BazarAppState extends State<BazarApp> {
  static final _light = buildAppTheme(Brightness.light);
  static final _dark = buildAppTheme(Brightness.dark);

  late final ProductStore _products = ProductStore();
  late final CartStore _cart = CartStore();
  late final FavoritesStore _favorites = FavoritesStore();
  late final OrdersStore _orders = OrdersStore();
  late final ChatStore _chats = ChatStore();
  late final SellerStore _seller = SellerStore(_products);
  final ValueNotifier<int> _tab = ValueNotifier(0);
  final ValueNotifier<CatalogRequest?> _catalogRequest = ValueNotifier(null);

  @override
  void initState() {
    super.initState();
    widget.auth.restore().catchError((Object _) {});
    // The server keeps the user's language for messages and notifications.
    widget.settings.addListener(_syncLocale);
  }

  void _syncLocale() {
    final locale = widget.settings.locale;
    if (locale != null) widget.auth.updateLocale(locale.languageCode);
  }

  @override
  void dispose() {
    widget.settings.removeListener(_syncLocale);
    for (final n in <ChangeNotifier>[_products, _cart, _favorites, _orders, _chats, _tab, _catalogRequest]) {
      n.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settings = widget.settings;
    return AppScope(
      settings: settings,
      auth: widget.auth,
      products: _products,
      cart: _cart,
      favorites: _favorites,
      orders: _orders,
      chats: _chats,
      seller: _seller,
      tab: _tab,
      catalogRequest: _catalogRequest,
      child: ListenableBuilder(
        listenable: settings,
        builder: (context, _) => MaterialApp(
          debugShowCheckedModeBanner: false,
          onGenerateTitle: (context) => AppLocalizations.of(context).appName,
          theme: _light,
          darkTheme: _dark,
          themeMode: settings.themeMode,
          themeAnimationDuration: AppMotion.normal,
          locale: settings.locale,
          supportedLocales: AppSettings.supportedLocales,
          localizationsDelegates: const [AppLocalizations.delegate, ...GlobalMaterialLocalizations.delegates, ...turkmenFallbackDelegates],
          scrollBehavior: const _AppScrollBehavior(),
          home: const _Gate(),
        ),
      ),
    );
  }
}

/// Shows the language picker on the very first launch, then the main frame.
class _Gate extends StatelessWidget {
  const _Gate();

  @override
  Widget build(BuildContext context) {
    final settings = context.app.settings;
    return ListenableBuilder(
      listenable: settings,
      builder: (context, _) => AnimatedSwitcher(
        duration: AppMotion.of(context, AppMotion.slow),
        switchInCurve: AppMotion.easeOut,
        child: settings.hasChosenLanguage ? const RootShell() : const LanguageScreen(),
      ),
    );
  }
}

/// Lets mouse and trackpad drag horizontal lists too (web build, desktop testing).
class _AppScrollBehavior extends MaterialScrollBehavior {
  const _AppScrollBehavior();

  @override
  Set<PointerDeviceKind> get dragDevices => {...super.dragDevices, PointerDeviceKind.mouse, PointerDeviceKind.trackpad};
}
