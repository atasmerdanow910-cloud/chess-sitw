import 'package:cupertino_ui/cupertino_ui.dart' show CupertinoLocalizations, GlobalCupertinoLocalizations;
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart' show GlobalWidgetsLocalizations;
import 'package:material_ui/material_ui.dart' show GlobalMaterialLocalizations, MaterialLocalizations;

import '../../l10n/app_localizations.dart';

export '../../l10n/app_localizations.dart';

/// Languages of the app. Russian is the fallback.
const supportedLocales = <Locale>[Locale('ru'), Locale('tk')];

/// Short labels for the language switch button ("TM" as on the old site).
String localeShortLabel(Locale locale) => locale.languageCode == 'tk' ? 'TM' : 'RU';

/// Native language names.
String localeName(Locale locale) => locale.languageCode == 'tk' ? 'Türkmen dili' : 'Русский';

/// Flutter has no built-in Turkmen strings for system widgets
/// (date pickers, copy/paste menu, tooltips). For `tk` we load the Turkish
/// ones: the closest Latin-script language. Our own texts are fully Turkmen.
const Locale _tkSystemFallback = Locale('tr');

class _TkFallbackDelegate<T> extends LocalizationsDelegate<T> {
  const _TkFallbackDelegate(this._base);

  final LocalizationsDelegate<T> _base;

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'tk';

  @override
  Future<T> load(Locale locale) => _base.load(_tkSystemFallback);

  @override
  bool shouldReload(covariant LocalizationsDelegate<T> old) => false;
}

/// All delegates the app needs, including Turkmen fallbacks.
const List<LocalizationsDelegate<dynamic>> localizationsDelegates = [
  AppLocalizations.delegate,
  GlobalMaterialLocalizations.delegate,
  GlobalCupertinoLocalizations.delegate,
  GlobalWidgetsLocalizations.delegate,
  _TkFallbackDelegate<MaterialLocalizations>(GlobalMaterialLocalizations.delegate),
  _TkFallbackDelegate<CupertinoLocalizations>(GlobalCupertinoLocalizations.delegate),
  _TkFallbackDelegate<WidgetsLocalizations>(GlobalWidgetsLocalizations.delegate),
];

/// Picks `tk` if the phone is in Turkmen, otherwise Russian.
Locale resolveInitialLocale(Locale deviceLocale) =>
    deviceLocale.languageCode == 'tk' ? const Locale('tk') : const Locale('ru');

extension L10nContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
}

@visibleForTesting
bool isTkFallbackDelegate(LocalizationsDelegate<dynamic> d) => d is _TkFallbackDelegate;
