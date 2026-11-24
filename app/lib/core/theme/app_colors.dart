import 'package:material_ui/material_ui.dart';

/// Brand and neutral color tokens.
///
/// Style follows the owner's previous SystemMarket site:
/// near-black surfaces, light outlines and a green accent.
abstract final class AppColors {
  // Brand green.
  static const brand = Color(0xFF34C463);
  static const brandStrong = Color(0xFF16A34A); // better contrast on white
  static const brandContainerDark = Color(0xFF0F4A23);
  static const brandContainerLight = Color(0xFFDDF7E5);
  static const onBrandContainerDark = Color(0xFFB7F5C9);
  static const onBrandContainerLight = Color(0xFF0F4A23);

  // Accents.
  static const favorite = Color(0xFFF472B6);
  static const rating = Color(0xFFFBBF24);
  static const danger = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  static const info = Color(0xFF3B82F6);

  // Dark theme neutrals.
  static const darkBackground = Color(0xFF0D1015);
  static const darkSurface = Color(0xFF151920);
  static const darkSurfaceHigh = Color(0xFF1F242C);
  static const darkSurfaceHighest = Color(0xFF2A3039);
  static const darkOutline = Color(0xFF353B45);
  static const darkText = Color(0xFFEDEFF2);
  static const darkTextMuted = Color(0xFFA0A7B1);

  // Light theme neutrals.
  static const lightBackground = Color(0xFFF4F5F7);
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightSurfaceHigh = Color(0xFFECEFF2);
  static const lightSurfaceHighest = Color(0xFFE2E6EA);
  static const lightOutline = Color(0xFFD9DDE2);
  static const lightText = Color(0xFF0F1216);
  static const lightTextMuted = Color(0xFF5C636D);
}
