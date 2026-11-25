/// Whole number with thousands separated by a narrow no-break space: 12345 → "12 345".
String formatNumber(int value) {
  final digits = value.abs().toString();
  final out = StringBuffer(value < 0 ? '−' : '');
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) out.write('\u202F');
    out.write(digits[i]);
  }
  return out.toString();
}

/// Formats an amount in Turkmen manat: 1250 → "1 250 TMT", 99.5 → "99,50 TMT".
/// Thousands are separated with a narrow no-break space so the number never wraps.
String formatTmt(num value) {
  final negative = value < 0;
  final cents = (value.abs() * 100).round();
  final whole = (cents ~/ 100).toString();
  final fraction = cents % 100;
  final grouped = StringBuffer();
  for (var i = 0; i < whole.length; i++) {
    if (i > 0 && (whole.length - i) % 3 == 0) grouped.write(' ');
    grouped.write(whole[i]);
  }
  final decimals = fraction == 0 ? '' : ',${fraction.toString().padLeft(2, '0')}';
  return '${negative ? '−' : ''}$grouped$decimals TMT';
}

/// Date as dd.MM.yyyy — the same in Russian and Turkmen.
String formatDate(DateTime d) => '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';

/// Time as HH:mm.
String formatTime(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
