import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// User preferences kept on the device: language, theme and the seller-panel preview switch.
class AppSettings extends ChangeNotifier {
  AppSettings(this._prefs)
    : _locale = _readLocale(_prefs.getString(_kLocale)),
      _themeMode = ThemeMode.values.firstWhere((m) => m.name == _prefs.getString(_kTheme), orElse: () => ThemeMode.system),
      _sellerPreview = _prefs.getBool(_kSellerPreview) ?? false;

  static const supportedLocales = <Locale>[Locale('ru'), Locale('tk')];
  static const _kLocale = 'locale';
  static const _kTheme = 'theme';
  static const _kSellerPreview = 'seller_preview';

  final SharedPreferences _prefs;
  Locale? _locale;
  ThemeMode _themeMode;
  bool _sellerPreview;

  /// Null until the user picks a language on the first launch.
  Locale? get locale => _locale;
  bool get hasChosenLanguage => _locale != null;
  ThemeMode get themeMode => _themeMode;

  /// Day 1 preview of the seller panel; on Day 2 the role comes from the server.
  bool get sellerPreview => _sellerPreview;

  Future<void> setLocale(Locale locale) async {
    _locale = locale;
    notifyListeners();
    await _prefs.setString(_kLocale, locale.languageCode);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    notifyListeners();
    await _prefs.setString(_kTheme, mode.name);
  }

  Future<void> setSellerPreview(bool value) async {
    _sellerPreview = value;
    notifyListeners();
    await _prefs.setBool(_kSellerPreview, value);
  }

  static Locale? _readLocale(String? code) => supportedLocales.where((l) => l.languageCode == code).firstOrNull;
}
