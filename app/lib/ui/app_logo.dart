import 'package:material_ui/material_ui.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';

/// Brand mark: green rounded square with "K." and the word mark
/// KERWEN (text color) + MARKET (brand green).
class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.size = 36, this.showWordmark = true});

  final double size;
  final bool showWordmark;

  @override
  Widget build(BuildContext context) {
    final textColor = Theme.of(context).colorScheme.onSurface;
    final wordStyle = TextStyle(
      fontSize: size * 0.56,
      fontWeight: FontWeight.w800,
      letterSpacing: 0.5,
      height: 1,
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        LogoMark(size: size),
        if (showWordmark) ...[
          SizedBox(width: size * 0.3),
          Flexible(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: 'KERWEN', style: wordStyle.copyWith(color: textColor)),
                  TextSpan(text: 'MARKET', style: wordStyle.copyWith(color: AppColors.brand)),
                ],
              ),
              maxLines: 1,
              overflow: TextOverflow.fade,
              softWrap: false,
            ),
          ),
        ],
      ],
    );
  }
}

/// Square icon part of the logo (also used for the app icon).
class LogoMark extends StatelessWidget {
  const LogoMark({super.key, this.size = 36});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.brand,
        borderRadius: BorderRadius.circular(size * 0.26),
      ),
      alignment: Alignment.center,
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: 'K',
              style: TextStyle(
                color: Colors.white,
                fontSize: size * 0.58,
                fontWeight: FontWeight.w800,
                height: 1,
              ),
            ),
            TextSpan(
              text: '.',
              style: TextStyle(
                color: AppColors.brandContainerDark,
                fontSize: size * 0.58,
                fontWeight: FontWeight.w800,
                height: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Square header button like on the old site (theme / language).
class HeaderSquareButton extends StatelessWidget {
  const HeaderSquareButton({
    super.key,
    required this.onPressed,
    required this.tooltip,
    this.icon,
    this.label,
  });

  final VoidCallback onPressed;
  final String tooltip;
  final IconData? icon;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: scheme.surfaceContainerHigh,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          side: BorderSide(color: scheme.outline),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onPressed,
          child: Container(
            height: 40,
            constraints: const BoxConstraints(minWidth: 44),
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm + 2),
            alignment: Alignment.center,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) Icon(icon, size: 20, color: scheme.onSurface),
                if (icon != null && label != null) const SizedBox(width: AppSpacing.xs + 2),
                if (label != null)
                  Text(
                    label!,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
