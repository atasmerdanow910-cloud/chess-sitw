import 'package:material_ui/material_ui.dart';

/// Design tokens: every color of the app lives here, separately for the dark and light themes.
/// Accent is Turkmen green; status colors are muted so they never shout louder than the content.
@immutable
class AppPalette extends ThemeExtension<AppPalette> {
  const AppPalette({
    required this.background,
    required this.solid,
    required this.surface,
    required this.surfaceRaised,
    required this.surfacePressed,
    required this.glass,
    required this.line,
    required this.lineStrong,
    required this.highlight,
    required this.text,
    required this.textSecondary,
    required this.textTertiary,
    required this.accent,
    required this.accentFill,
    required this.onAccent,
    required this.accentSoft,
    required this.ok,
    required this.warn,
    required this.danger,
    required this.info,
    required this.violet,
    required this.glowPrimary,
    required this.glowSecondary,
    required this.shadow,
    required this.chart1,
  });

  /// Page background (deep neutral, never pure black or white).
  final Color background;

  /// Opaque surface for sheets and dialogs.
  final Color solid;

  /// Translucent card surfaces: normal, raised, pressed.
  final Color surface;
  final Color surfaceRaised;
  final Color surfacePressed;

  /// Tint of frosted-glass layers (navigation bar, app bars).
  final Color glass;

  /// 1 px hairlines and the light rim highlight on glass.
  final Color line;
  final Color lineStrong;
  final Color highlight;

  final Color text;
  final Color textSecondary;
  final Color textTertiary;

  /// [accent] for text and icons, [accentFill] behind white text (contrast ≥ 4.5:1).
  final Color accent;
  final Color accentFill;
  final Color onAccent;
  final Color accentSoft;

  final Color ok;
  final Color warn;
  final Color danger;
  final Color info;
  final Color violet;

  /// Soft glows painted behind the content.
  final Color glowPrimary;
  final Color glowSecondary;
  final Color shadow;

  /// Single-series chart marks (bars). Validated with the data-viz checks:
  /// lightness band, chroma floor and ≥ 3:1 contrast against the card surface.
  final Color chart1;

  static const AppPalette dark = AppPalette(
    background: Color(0xFF07090D),
    solid: Color(0xFF11151D),
    surface: Color(0x0AFFFFFF),
    surfaceRaised: Color(0x12FFFFFF),
    surfacePressed: Color(0x1FFFFFFF),
    glass: Color(0x9E141820),
    line: Color(0x14FFFFFF),
    lineStrong: Color(0x24FFFFFF),
    highlight: Color(0x26FFFFFF),
    text: Color(0xFFEEF2F7),
    textSecondary: Color(0xA8E2E8F4),
    textTertiary: Color(0x6BE2E8F4),
    accent: Color(0xFF3DD598),
    accentFill: Color(0xFF12845A),
    onAccent: Color(0xFFFFFFFF),
    accentSoft: Color(0x243DD598),
    ok: Color(0xFF4CC38A),
    warn: Color(0xFFE0B25B),
    danger: Color(0xFFF0726B),
    info: Color(0xFF5B96FF),
    violet: Color(0xFFA594FF),
    glowPrimary: Color(0x3812845A),
    glowSecondary: Color(0x1C765CFF),
    shadow: Color(0x80000000),
    chart1: Color(0xFF1FA36D),
  );

  static const AppPalette light = AppPalette(
    background: Color(0xFFEEF1F5),
    solid: Color(0xFFF7F9FC),
    surface: Color(0x99FFFFFF),
    surfaceRaised: Color(0xC7FFFFFF),
    surfacePressed: Color(0xF2FFFFFF),
    glass: Color(0xA6FAFCFF),
    line: Color(0x130C1424),
    lineStrong: Color(0x1F0C1424),
    highlight: Color(0xD9FFFFFF),
    text: Color(0xFF0B1220),
    textSecondary: Color(0x9E0B1220),
    textTertiary: Color(0x6B0B1220),
    accent: Color(0xFF0F7B52),
    accentFill: Color(0xFF0F7B52),
    onAccent: Color(0xFFFFFFFF),
    accentSoft: Color(0x1A0F7B52),
    ok: Color(0xFF14805A),
    warn: Color(0xFF9A6205),
    danger: Color(0xFFCC3F37),
    info: Color(0xFF2563EB),
    violet: Color(0xFF6D4AFF),
    glowPrimary: Color(0x1F0F7B52),
    glowSecondary: Color(0x127C3AED),
    shadow: Color(0x290F172A),
    chart1: Color(0xFF0F7B52),
  );

  static AppPalette of(BuildContext context) => Theme.of(context).extension<AppPalette>()!;

  @override
  AppPalette copyWith() => this;

  @override
  AppPalette lerp(ThemeExtension<AppPalette>? other, double t) => t < 0.5 ? this : (other as AppPalette? ?? this);
}

/// Corner radii used across the app.
abstract final class AppRadii {
  static const double xs = 10;
  static const double sm = 14;
  static const double md = 18;
  static const double lg = 22;
  static const double xl = 28;
}

/// Spacing scale (multiples of 4).
abstract final class AppSpace {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
}

/// Motion: ease-out for appearing, spring for moving things (tab capsule, sheets).
/// Durations collapse to zero when the system asks for reduced motion.
abstract final class AppMotion {
  static const Curve easeOut = Cubic(0.22, 1, 0.36, 1);
  static const Curve spring = Cubic(0.32, 0.72, 0, 1);
  static const Duration fast = Duration(milliseconds: 140);
  static const Duration normal = Duration(milliseconds: 240);
  static const Duration slow = Duration(milliseconds: 420);

  static Duration of(BuildContext context, Duration d) => MediaQuery.maybeDisableAnimationsOf(context) ?? false ? Duration.zero : d;
}

/// Order status colors: muted, each paired with a text label (never color alone).
Color orderStatusColor(AppPalette p, int statusIndex) => <Color>[p.info, p.violet, p.warn, p.ok, p.danger][statusIndex];
