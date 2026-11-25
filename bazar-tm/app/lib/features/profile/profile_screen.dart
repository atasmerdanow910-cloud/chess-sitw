import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/tokens.dart';
import '../../ui/common.dart';
import '../orders/orders_screen.dart';
import '../seller/seller_panel_screen.dart';
import '../shell/root_shell.dart';
import 'favorites_screen.dart';
import 'login_screen.dart';

/// Version shown at the bottom of the profile.
const appVersion = '0.1.0';

/// Profile tab: sign-in, orders, favorites, language, theme, seller entry.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final app = context.app;
    final settings = app.settings;
    return SafeArea(
      bottom: false,
      child: ListenableBuilder(
        listenable: Listenable.merge([settings, app.orders, app.favorites]),
        builder: (context, _) => ListView(
          padding: EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, navBarSpace(context)),
          children: [
            Text(l.profileTitle, style: context.text.headlineSmall),
            const SizedBox(height: AppSpace.lg),
            SurfaceCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(color: p.accentSoft, borderRadius: BorderRadius.circular(18)),
                        child: Icon(Icons.person_rounded, color: p.accent, size: 28),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(l.guest, style: context.text.titleMedium),
                            Text(l.guestHint, style: context.text.bodySmall?.copyWith(color: p.textSecondary)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.lg),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => const LoginScreen())),
                      child: Text(l.signIn),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.lg),
            _Group(
              children: [
                _Row(
                  icon: Icons.receipt_long_outlined,
                  title: l.ordersTitle,
                  trailing: app.orders.mine.isEmpty ? null : '${app.orders.mine.length}',
                  onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => const OrdersScreen())),
                ),
                _Row(
                  icon: Icons.favorite_border_rounded,
                  title: l.favorites,
                  trailing: app.favorites.ids.isEmpty ? null : '${app.favorites.ids.length}',
                  onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => const FavoritesScreen())),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.lg),
            _Group(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, AppSpace.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      FieldLabel(l.language),
                      SizedBox(
                        width: double.infinity,
                        child: SegmentedButton<String>(
                          showSelectedIcon: false,
                          segments: const [
                            ButtonSegment(value: 'ru', label: Text('Русский')),
                            ButtonSegment(value: 'tk', label: Text('Türkmençe')),
                          ],
                          selected: {context.locale.languageCode},
                          onSelectionChanged: (s) => settings.setLocale(Locale(s.first)),
                        ),
                      ),
                      const SizedBox(height: AppSpace.lg),
                      FieldLabel(l.theme),
                      SizedBox(
                        width: double.infinity,
                        child: SegmentedButton<ThemeMode>(
                          showSelectedIcon: false,
                          segments: [
                            ButtonSegment(
                              value: ThemeMode.system,
                              label: Text(l.themeSystem, maxLines: 1, overflow: TextOverflow.ellipsis),
                            ),
                            ButtonSegment(value: ThemeMode.light, label: Text(l.themeLight)),
                            ButtonSegment(value: ThemeMode.dark, label: Text(l.themeDark)),
                          ],
                          selected: {settings.themeMode},
                          onSelectionChanged: (s) => settings.setThemeMode(s.first),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.lg),
            _Group(
              children: [
                _Row(icon: Icons.storefront_outlined, title: l.iAmSeller, onTap: () => _showInvite(context)),
                SwitchListTile(
                  secondary: const Icon(Icons.dashboard_customize_outlined),
                  title: Text(l.demoSellerMode, style: context.text.bodyLarge),
                  value: settings.sellerPreview,
                  onChanged: settings.setSellerPreview,
                ),
                if (settings.sellerPreview)
                  _Row(
                    icon: Icons.space_dashboard_outlined,
                    title: l.sellerPanel,
                    accent: true,
                    onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => const SellerPanelScreen())),
                  ),
              ],
            ),
            const SizedBox(height: AppSpace.lg),
            _Group(
              children: [
                _Row(icon: Icons.shield_outlined, title: l.privacy, onTap: context.comingSoon),
                _Row(icon: Icons.support_agent_rounded, title: l.support, onTap: context.comingSoon),
              ],
            ),
            const SizedBox(height: AppSpace.xl),
            Center(
              child: Text(l.version(appVersion), style: context.text.bodySmall?.copyWith(color: p.textTertiary)),
            ),
          ],
        ),
      ),
    );
  }

  /// Sellers don't sign up themselves: the owner meets them and gives an invite code (spec, section 2).
  Future<void> _showInvite(BuildContext context) async {
    final l = context.l10n;
    final code = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: Text(l.iAmSeller),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l.sellerInviteHint),
            const SizedBox(height: AppSpace.lg),
            TextField(
              controller: code,
              autofocus: true,
              textCapitalization: TextCapitalization.characters,
              maxLength: 12,
              decoration: InputDecoration(labelText: l.inviteCode, counterText: ''),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialog, false), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(dialog, true), child: Text(l.continueButton)),
        ],
      ),
    );
    code.dispose();
    if (ok == true && context.mounted) context.comingSoon();
  }
}

class _Group extends StatelessWidget {
  const _Group({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: p.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadii.lg),
        side: BorderSide(color: p.line),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[if (i > 0) const Divider(indent: 56), children[i]],
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.title, required this.onTap, this.trailing, this.accent = false});

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final String? trailing;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return ListTile(
      leading: Icon(icon, color: accent ? p.accent : null),
      title: Text(
        title,
        style: context.text.bodyLarge?.copyWith(color: accent ? p.accent : null, fontWeight: accent ? FontWeight.w700 : null),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailing != null) Text(trailing!, style: context.text.bodyMedium?.copyWith(color: p.textSecondary)),
          Icon(Icons.chevron_right_rounded, color: p.textTertiary),
        ],
      ),
      onTap: onTap,
    );
  }
}
