import 'dart:ui' show ImageFilter;

import 'package:material_ui/material_ui.dart';

import 'tokens.dart';

/// Frosted glass: blurs what is behind, tints it, adds a 1 px rim and a soft top highlight.
/// Used only for floating layers (navigation bar, bars over content) — cards in lists stay
/// translucent without blur so weak phones scroll smoothly.
class GlassSurface extends StatelessWidget {
  const GlassSurface({
    super.key,
    required this.child,
    this.radius = AppRadii.lg,
    this.padding = EdgeInsets.zero,
    this.blur = 20,
    this.shadow = true,
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry padding;
  final double blur;
  final bool shadow;

  @override
  Widget build(BuildContext context) {
    final p = AppPalette.of(context);
    final shape = BorderRadius.circular(radius);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: shape,
        boxShadow: shadow ? [BoxShadow(color: p.shadow, blurRadius: 30, offset: const Offset(0, 12))] : null,
      ),
      child: ClipRRect(
        borderRadius: shape,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: p.glass,
              borderRadius: shape,
              border: Border.all(color: p.lineStrong),
            ),
            child: DecoratedBox(
              // light rim along the top edge
              decoration: BoxDecoration(
                borderRadius: shape,
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.center,
                  colors: [
                    p.highlight.withValues(alpha: p.highlight.a * 0.35),
                    p.highlight.withValues(alpha: 0),
                  ],
                ),
              ),
              child: Padding(padding: padding, child: child),
            ),
          ),
        ),
      ),
    );
  }
}

/// Page background with two soft glows, like light falling through glass.
class GlowBackground extends StatelessWidget {
  const GlowBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final p = AppPalette.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(color: p.background),
      child: Stack(
        children: [
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(-0.9, -1.1),
                    radius: 1.1,
                    colors: [p.glowPrimary, p.glowPrimary.withValues(alpha: 0)],
                  ),
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(1.1, -0.4),
                    radius: 0.9,
                    colors: [p.glowSecondary, p.glowSecondary.withValues(alpha: 0)],
                  ),
                ),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}
