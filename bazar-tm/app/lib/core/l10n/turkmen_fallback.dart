import 'package:cupertino_ui/cupertino_ui.dart' show CupertinoLocalizations, GlobalCupertinoLocalizations;
import 'package:flutter_localizations/flutter_localizations.dart' show GlobalWidgetsLocalizations;
import 'package:material_ui/material_ui.dart';

/// Flutter ships no Turkmen texts for its own widgets (back-button tooltip, date picker,
/// text selection menu). Without these delegates a Turkmen locale would crash those widgets.
/// For them we load the Russian built-in texts; all of the app's own texts are Turkmen
/// (lib/l10n/app_tk.arb).
class _TurkmenFallbackDelegate<T> extends LocalizationsDelegate<T> {
  const _TurkmenFallbackDelegate(this._inner);

  final LocalizationsDelegate<T> _inner;
  static const Locale _fallback = Locale('ru');

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'tk';

  @override
  Future<T> load(Locale locale) => _inner.load(_fallback);

  @override
  bool shouldReload(covariant LocalizationsDelegate<T> old) => false;
}

const List<LocalizationsDelegate<dynamic>> turkmenFallbackDelegates = <LocalizationsDelegate<dynamic>>[
  _TurkmenFallbackDelegate<MaterialLocalizations>(GlobalMaterialLocalizations.delegate),
  _TurkmenFallbackDelegate<CupertinoLocalizations>(GlobalCupertinoLocalizations.delegate),
  _TurkmenFallbackDelegate<WidgetsLocalizations>(GlobalWidgetsLocalizations.delegate),
];
