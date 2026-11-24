/// Locale-neutral formatters.
///
/// `intl` has no Turkmen number/date data, so we format by hand.
/// Money is always stored as an integer number of tenge (1 TMT = 100 tenge)
/// to avoid floating point errors.
library;

const _nbsp = ' ';

/// 120000 tenge -> "1 200 TMT"; 12550 -> "125,50 TMT".
String formatPrice(int tenge) {
  final negative = tenge < 0;
  final abs = tenge.abs();
  final manat = abs ~/ 100;
  final rest = abs % 100;
  final grouped = _groupThousands(manat);
  final sign = negative ? '-' : '';
  final fraction = rest == 0 ? '' : ',${rest.toString().padLeft(2, '0')}';
  return '$sign$grouped$fraction${_nbsp}TMT';
}

/// 1248 -> "1 248".
String formatCount(int value) => _groupThousands(value);

String _groupThousands(int value) {
  final digits = value.toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    final fromEnd = digits.length - i;
    buffer.write(digits[i]);
    if (fromEnd > 1 && fromEnd % 3 == 1) buffer.write(_nbsp);
  }
  return buffer.toString();
}

String _two(int v) => v.toString().padLeft(2, '0');

/// "24.11.2026"
String formatDate(DateTime d) => '${_two(d.day)}.${_two(d.month)}.${d.year}';

/// "18:05"
String formatTime(DateTime d) => '${_two(d.hour)}:${_two(d.minute)}';

/// Time for today, otherwise short date ("24.11").
String formatShortDateTime(DateTime d, {DateTime? now}) {
  final n = now ?? DateTime.now();
  final sameDay = d.year == n.year && d.month == n.month && d.day == n.day;
  return sameDay ? formatTime(d) : '${_two(d.day)}.${_two(d.month)}';
}

/// Parses a price typed by a seller ("1200", "1 200", "125,5") into tenge.
/// Returns null if the text is not a valid non-negative amount.
int? parsePriceToTenge(String input) {
  final cleaned = input.replaceAll(RegExp(r'[\s ]'), '').replaceAll(',', '.');
  if (!RegExp(r'^\d{1,9}(\.\d{1,2})?$').hasMatch(cleaned)) return null;
  final parts = cleaned.split('.');
  final manat = int.parse(parts[0]);
  final tenge = parts.length == 2 ? int.parse(parts[1].padRight(2, '0')) : 0;
  return manat * 100 + tenge;
}
