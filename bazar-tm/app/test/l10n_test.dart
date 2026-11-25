import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _arb(String locale) => jsonDecode(File('lib/l10n/app_$locale.arb').readAsStringSync()) as Map<String, dynamic>;

Iterable<String> _messages(Map<String, dynamic> arb) => arb.keys.where((k) => !k.startsWith('@'));

void main() {
  final ru = _arb('ru');
  final tk = _arb('tk');

  test('Russian and Turkmen have exactly the same texts', () {
    expect(_messages(tk).toSet().difference(_messages(ru).toSet()), isEmpty, reason: 'extra keys in tk');
    expect(_messages(ru).toSet().difference(_messages(tk).toSet()), isEmpty, reason: 'missing keys in tk');
  });

  test('no empty translations', () {
    for (final arb in [ru, tk]) {
      for (final key in _messages(arb)) {
        expect((arb[key] as String).trim(), isNotEmpty, reason: key);
      }
    }
  });

  test('Turkmen texts avoid ICU plurals (intl has no Turkmen plural rules)', () {
    for (final key in _messages(tk)) {
      expect(tk[key] as String, isNot(contains(', plural,')), reason: key);
    }
  });

  test('placeholders match between languages', () {
    final placeholder = RegExp(r'\{(\w+)[},]');
    for (final key in _messages(ru)) {
      final inRu = placeholder.allMatches(ru[key] as String).map((m) => m[1]).toSet()..remove('count');
      final inTk = placeholder.allMatches(tk[key] as String).map((m) => m[1]).toSet()..remove('count');
      expect(inTk, inRu, reason: key);
      if ((ru[key] as String).contains('{count')) expect(tk[key] as String, contains('{count}'), reason: key);
    }
  });
}
