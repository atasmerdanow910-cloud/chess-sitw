import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/format/money.dart';
import '../../core/theme/tokens.dart';
import '../../data/auth_store.dart';
import '../../ui/api_errors.dart';
import '../../ui/common.dart';
import '../orders/orders_screen.dart';
import '../seller/seller_panel_screen.dart';
import '../shell/root_shell.dart';
import 'change_password_screen.dart';
import 'favorites_screen.dart';
import 'login_screen.dart';

/// Version shown at the bottom of the profile.
const appVersion = '0.2.0';

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
        listenable: Listenable.merge([settings, app.orders, app.favorites, app.auth]),
        builder: (context, _) {
          final role = app.auth.user?.role;
          return ListView(
            padding: EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, navBarSpace(context)),
            children: [
              Text(l.profileTitle, style: context.text.headlineSmall),
              const SizedBox(height: AppSpace.lg),
              _AccountCard(user: app.auth.user),
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
                  if (role == UserRole.seller)
                    _Row(icon: Icons.space_dashboard_outlined, title: l.sellerPanel, accent: true, onTap: () => _openSellerPanel(context))
                  else if (role == UserRole.owner)
                    _Row(icon: Icons.admin_panel_settings_outlined, title: l.ownerPanel, accent: true, onTap: context.comingSoon)
                  else
                    _Row(icon: Icons.storefront_outlined, title: l.iAmSeller, onTap: () => _showInvite(context)),
                  // Without a server (demo build) the seller panel can still be looked at.
                  if (!app.auth.serverConnected) ...[
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
                        onTap: () => _openSellerPanel(context),
                      ),
                  ],
                ],
              ),
              if (app.auth.signedIn) ...[
                const SizedBox(height: AppSpace.lg),
                _Group(
                  children: [
                    _Row(
                      icon: Icons.key_rounded,
                      title: l.changePassword,
                      onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => const ChangePasswordScreen())),
                    ),
                    _Row(icon: Icons.devices_other_rounded, title: l.signOutAll, onTap: () => _signOutAll(context)),
                    _Row(icon: Icons.logout_rounded, title: l.signOut, danger: true, onTap: () => app.auth.logout()),
                  ],
                ),
              ],
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
          );
        },
      ),
    );
  }

  void _openSellerPanel(BuildContext context) =>
      Navigator.push(context, MaterialPageRoute<void>(builder: (_) => const SellerPanelScreen()));

  Future<void> _signOutAll(BuildContext context) async {
    final l = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: Text(l.signOutAllQuestion),
        content: Text(l.signOutAllText),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialog, false), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(dialog, true), child: Text(l.signOut)),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    try {
      await context.app.auth.logoutAll();
    } catch (e) {
      if (context.mounted) context.showMessage(errorText(l, e));
    }
  }

  /// Sellers don't sign up themselves: the owner meets them and gives an invite code (spec, section 2).
  Future<void> _showInvite(BuildContext context) async {
    final l = context.l10n;
    final auth = context.app.auth;
    if (!auth.serverConnected) {
      context.showMessage(l.serverNotConnected);
      return;
    }
    if (!auth.signedIn) {
      context.showMessage(l.signInFirst);
      Navigator.push(context, MaterialPageRoute<void>(builder: (_) => const LoginScreen()));
      return;
    }
    final activated = await showDialog<bool>(context: context, builder: (_) => const _InviteDialog());
    if (activated == true && context.mounted) context.showMessage(l.sellerActivated);
  }
}

class _InviteDialog extends StatefulWidget {
  const _InviteDialog();

  @override
  State<_InviteDialog> createState() => _InviteDialogState();
}

class _InviteDialogState extends State<_InviteDialog> {
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _redeem() async {
    final l = context.l10n;
    if (_code.text.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').length != 10) {
      setState(() => _error = l.errInviteInvalid);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.app.auth.redeemInvite(_code.text);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(l, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AlertDialog(
      title: Text(l.iAmSeller),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l.sellerInviteHint),
          const SizedBox(height: AppSpace.lg),
          TextField(
            controller: _code,
            autofocus: true,
            textCapitalization: TextCapitalization.characters,
            maxLength: 14,
            decoration: InputDecoration(
              labelText: l.inviteCode,
              hintText: 'XXXX-XXXX-XX',
              counterText: '',
              errorText: _error,
              errorMaxLines: 3,
            ),
            onSubmitted: (_) => _redeem(),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: _busy ? null : () => Navigator.pop(context, false), child: Text(l.cancel)),
        FilledButton(onPressed: _busy ? null : _redeem, child: Text(l.continueButton)),
      ],
    );
  }
}

/// Guest: a sign-in invitation. Signed in: name, phone, role and (for sellers) the shop.
class _AccountCard extends StatelessWidget {
  const _AccountCard({required this.user});

  final AuthUser? user;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final u = user;
    final avatar = Container(
      width: 52,
      height: 52,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: u == null ? p.accentSoft : p.accentFill, borderRadius: BorderRadius.circular(18)),
      child: u == null
          ? Icon(Icons.person_rounded, color: p.accent, size: 28)
          : Text(
              u.name.trim().isEmpty ? '?' : u.name.trim().characters.first.toUpperCase(),
              style: context.text.titleLarge?.copyWith(color: p.onAccent),
            ),
    );
    if (u == null) {
      return SurfaceCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                avatar,
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
      );
    }
    final roleText = switch (u.role) {
      UserRole.buyer => l.roleBuyer,
      UserRole.seller => l.roleSeller,
      UserRole.owner => l.roleOwner,
    };
    final contact = u.phone != null ? formatPhone(u.phone!) : (u.email ?? '');
    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              avatar,
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(u.name, style: context.text.titleMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
                    if (contact.isNotEmpty)
                      Text(
                        contact,
                        style: context.text.bodyMedium?.copyWith(
                          color: p.textSecondary,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: p.accentSoft, borderRadius: BorderRadius.circular(99)),
                child: Text(roleText, style: context.text.labelSmall?.copyWith(color: p.accent, fontSize: 12, letterSpacing: 0)),
              ),
            ],
          ),
          if (u.shop != null) ...[
            const SizedBox(height: AppSpace.md),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.storefront_outlined, size: 18, color: p.textSecondary),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(u.shop!.name, style: context.text.bodyMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
                      if (u.shop!.subscriptionUntil != null)
                        Text(
                          l.paidUntil(formatDate(u.shop!.subscriptionUntil!)),
                          style: context.text.bodySmall?.copyWith(color: p.textTertiary),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
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
  const _Row({required this.icon, required this.title, required this.onTap, this.trailing, this.accent = false, this.danger = false});

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final String? trailing;
  final bool accent;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final color = danger ? p.danger : (accent ? p.accent : null);
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(
        title,
        style: context.text.bodyLarge?.copyWith(color: color, fontWeight: accent ? FontWeight.w700 : null),
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
