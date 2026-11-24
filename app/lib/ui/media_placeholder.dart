import 'package:material_ui/material_ui.dart';

/// Stand-in for product photos until uploads exist (Day 3).
/// Draws a soft gradient with the category icon. No network needed.
class MediaPlaceholder extends StatelessWidget {
  const MediaPlaceholder({
    super.key,
    required this.seed,
    required this.icon,
    this.iconSize = 44,
    this.borderRadius,
  });

  /// Any stable string (e.g. product id) to pick a color.
  final String seed;
  final IconData icon;
  final double iconSize;
  final BorderRadius? borderRadius;

  static const _palette = <Color>[
    Color(0xFF0EA5E9),
    Color(0xFF8B5CF6),
    Color(0xFFF97316),
    Color(0xFF10B981),
    Color(0xFFEC4899),
    Color(0xFF6366F1),
    Color(0xFFEAB308),
    Color(0xFF14B8A6),
  ];

  static Color colorFor(String seed) =>
      _palette[seed.codeUnits.fold<int>(0, (a, b) => a + b) % _palette.length];

  @override
  Widget build(BuildContext context) {
    final base = colorFor(seed);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.zero,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              base.withValues(alpha: isDark ? 0.35 : 0.22),
              base.withValues(alpha: isDark ? 0.12 : 0.08),
            ],
          ),
        ),
        child: Center(
          child: Icon(icon, size: iconSize, color: base.withValues(alpha: 0.9)),
        ),
      ),
    );
  }
}

/// Round shop logo placeholder with initials.
class ShopAvatar extends StatelessWidget {
  const ShopAvatar({super.key, required this.initials, required this.color, this.size = 44});

  final String initials;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        shape: BoxShape.circle,
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w800,
          fontSize: size * 0.36,
        ),
      ),
    );
  }
}
