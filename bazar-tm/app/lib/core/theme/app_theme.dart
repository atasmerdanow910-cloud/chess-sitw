import 'package:material_ui/material_ui.dart';

import 'tokens.dart';

/// Builds the light or dark theme from the design tokens.
/// Widgets read colors via [AppPalette.of] and text styles via [Theme.of(context).textTheme].
ThemeData buildAppTheme(Brightness brightness) {
  final p = brightness == Brightness.dark ? AppPalette.dark : AppPalette.light;
  final scheme = ColorScheme(
    brightness: brightness,
    primary: p.accentFill,
    onPrimary: p.onAccent,
    secondary: p.accent,
    onSecondary: p.onAccent,
    error: p.danger,
    onError: Colors.white,
    surface: p.background,
    onSurface: p.text,
    onSurfaceVariant: p.textSecondary,
    outline: p.lineStrong,
    outlineVariant: p.line,
    surfaceContainerHighest: p.solid,
  );

  final base = brightness == Brightness.dark ? Typography.material2021().white : Typography.material2021().black;
  final text = base
      .copyWith(
        displaySmall: base.displaySmall?.copyWith(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.6, height: 1.15),
        headlineSmall: base.headlineSmall?.copyWith(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.4),
        titleLarge: base.titleLarge?.copyWith(fontSize: 19, fontWeight: FontWeight.w700, letterSpacing: -0.2),
        titleMedium: base.titleMedium?.copyWith(fontSize: 16, fontWeight: FontWeight.w600),
        titleSmall: base.titleSmall?.copyWith(fontSize: 14, fontWeight: FontWeight.w600),
        bodyLarge: base.bodyLarge?.copyWith(fontSize: 15, height: 1.45),
        bodyMedium: base.bodyMedium?.copyWith(fontSize: 14, height: 1.4),
        bodySmall: base.bodySmall?.copyWith(fontSize: 12.5, height: 1.35),
        labelLarge: base.labelLarge?.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
        labelMedium: base.labelMedium?.copyWith(fontSize: 13, fontWeight: FontWeight.w600),
        labelSmall: base.labelSmall?.copyWith(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.4),
      )
      .apply(bodyColor: p.text, displayColor: p.text);

  final roundedMd = RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.sm + 1));
  final fieldBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(AppRadii.sm),
    borderSide: BorderSide(color: p.lineStrong),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: p.background,
    textTheme: text,
    extensions: <ThemeExtension<dynamic>>[p],
    splashFactory: InkRipple.splashFactory,
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      foregroundColor: p.text,
      centerTitle: false,
      titleTextStyle: text.titleLarge,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: p.accentFill,
        foregroundColor: p.onAccent,
        minimumSize: const Size(0, 50),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        shape: roundedMd,
        textStyle: text.labelLarge,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: p.text,
        backgroundColor: p.surfaceRaised,
        minimumSize: const Size(0, 50),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        side: BorderSide(color: p.lineStrong),
        shape: roundedMd,
        textStyle: text.labelLarge,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: p.accent, textStyle: text.labelMedium),
    ),
    iconButtonTheme: IconButtonThemeData(style: IconButton.styleFrom(foregroundColor: p.text)),
    cardTheme: CardThemeData(
      color: p.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadii.lg),
        side: BorderSide(color: p.line),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      hintStyle: text.bodyLarge?.copyWith(color: p.textTertiary),
      labelStyle: text.bodyMedium?.copyWith(color: p.textSecondary),
      border: fieldBorder,
      enabledBorder: fieldBorder,
      focusedBorder: fieldBorder.copyWith(borderSide: BorderSide(color: p.accent, width: 1.6)),
      errorBorder: fieldBorder.copyWith(borderSide: BorderSide(color: p.danger)),
      focusedErrorBorder: fieldBorder.copyWith(borderSide: BorderSide(color: p.danger, width: 1.6)),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: p.surface,
      selectedColor: p.accentSoft,
      side: BorderSide(color: p.line),
      shape: const StadiumBorder(),
      labelStyle: text.labelMedium?.copyWith(color: p.textSecondary),
      secondaryLabelStyle: text.labelMedium?.copyWith(color: p.accent),
      checkmarkColor: p.accent,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? p.accentSoft : p.surface),
        foregroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? p.accent : p.textSecondary),
        side: WidgetStatePropertyAll(BorderSide(color: p.line)),
        textStyle: WidgetStatePropertyAll(text.labelMedium),
      ),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: const WidgetStatePropertyAll(Colors.white),
      trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? p.accentFill : p.lineStrong),
      trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: p.solid,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      dragHandleColor: p.lineStrong,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.xl))),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: p.solid,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
      titleTextStyle: text.titleLarge,
      contentTextStyle: text.bodyMedium?.copyWith(color: p.textSecondary),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: p.solid,
      contentTextStyle: text.bodyMedium?.copyWith(color: p.text, fontWeight: FontWeight.w600),
      actionTextColor: p.accent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadii.md),
        side: BorderSide(color: p.lineStrong),
      ),
      elevation: 0,
    ),
    dividerTheme: DividerThemeData(color: p.line, thickness: 1, space: 1),
    listTileTheme: ListTileThemeData(iconColor: p.textSecondary, textColor: p.text),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: p.accent, linearTrackColor: p.line),
    badgeTheme: BadgeThemeData(backgroundColor: p.danger, textColor: Colors.white),
  );
}
