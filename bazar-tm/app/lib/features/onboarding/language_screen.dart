import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../ui/common.dart';

/// First launch: the user picks Russian or Turkmen. Texts are shown in both languages
/// because we don't know yet which one the user reads.
class LanguageScreen extends StatelessWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final settings = context.app.settings;
    // The user has not chosen yet, so every line is shown in both languages.
    final ru = lookupAppLocalizations(const Locale('ru'));
    final tk = lookupAppLocalizations(const Locale('tk'));
    Widget option(String code, String name, String native) => Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: Pressable(
        semanticLabel: name,
        onTap: () => settings.setLocale(Locale(code)),
        child: SurfaceCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: p.accentSoft, borderRadius: BorderRadius.circular(14)),
                child: Text(code.toUpperCase(), style: context.text.titleSmall?.copyWith(color: p.accent)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: context.text.titleMedium),
                    Text(native, style: context.text.bodySmall?.copyWith(color: p.textTertiary)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: p.textTertiary),
            ],
          ),
        ),
      ),
    );
    return Scaffold(
      body: GlowBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpace.xl),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: GlassSurface(
                  radius: 30,
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: p.accentFill, borderRadius: BorderRadius.circular(20)),
                        child: const Icon(Icons.storefront_rounded, color: Colors.white, size: 34),
                      ),
                      const SizedBox(height: AppSpace.md),
                      Text(ru.appName, style: context.text.headlineSmall),
                      const SizedBox(height: AppSpace.sm),
                      Text(
                        '${ru.chooseLanguage}\n${tk.chooseLanguage}',
                        textAlign: TextAlign.center,
                        style: context.text.bodyLarge?.copyWith(color: p.textSecondary, height: 1.6),
                      ),
                      const SizedBox(height: AppSpace.xl),
                      option('ru', 'Русский', 'Rus dili'),
                      option('tk', 'Türkmençe', 'Туркменский'),
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpace.md),
                        child: Text(
                          '${ru.chooseLanguageHint}\n${tk.chooseLanguageHint}',
                          textAlign: TextAlign.center,
                          style: context.text.bodySmall?.copyWith(color: p.textTertiary),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
