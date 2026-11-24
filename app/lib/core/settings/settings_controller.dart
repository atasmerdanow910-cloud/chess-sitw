import 'dart:ui' show PlatformDispatcher;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../l10n/l10n.dart';

/// Provided in `main()` after SharedPreferences is loaded.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider must be overridden'),
);

@immutable
class AppSettings {
  const AppSettings({required this.themeMode, required this.locale});

  final ThemeMode themeMode;
  final Locale locale;

  AppSettings copyWith({ThemeMode? themeMode, Locale? locale}) => AppSettings(
        themeMode: themeMode ?? this.themeMode,
        locale: locale ?? this.locale,
      );
}

/// Theme and language chosen by the user. Saved on the device only.
class SettingsController extends Notifier<AppSettings> {
  static const _themeKey = 'settings.theme_mode';
  static const _localeKey = 'settings.locale';

  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);

  @override
  AppSettings build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    final themeName = prefs.getString(_themeKey);
    final themeMode = ThemeMode.values.firstWhere(
      (m) => m.name == themeName,
      // Dark by default, like the old SystemMarket site.
      orElse: () => ThemeMode.dark,
    );
    final localeCode = prefs.getString(_localeKey);
    final locale = supportedLocales.firstWhere(
      (l) => l.languageCode == localeCode,
      orElse: () => resolveInitialLocale(PlatformDispatcher.instance.locale),
    );
    return AppSettings(themeMode: themeMode, locale: locale);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = state.copyWith(themeMode: mode);
    await _prefs.setString(_themeKey, mode.name);
  }

  /// Switches between light and dark, based on what is visible right now.
  Future<void> toggleDarkLight(Brightness current) =>
      setThemeMode(current == Brightness.dark ? ThemeMode.light : ThemeMode.dark);

  Future<void> setLocale(Locale locale) async {
    state = state.copyWith(locale: locale);
    await _prefs.setString(_localeKey, locale.languageCode);
  }

  Future<void> toggleLocale() => setLocale(
        state.locale.languageCode == 'tk' ? const Locale('ru') : const Locale('tk'),
      );
}

final settingsProvider =
    NotifierProvider<SettingsController, AppSettings>(SettingsController.new);
