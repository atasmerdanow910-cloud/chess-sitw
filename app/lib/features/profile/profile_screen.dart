import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/api/error_text.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/config/app_config.dart';
import '../../core/l10n/l10n.dart';
import '../../core/providers.dart';
import '../../core/settings/settings_controller.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/providers.dart';
import '../../ui/common.dart';
import '../../ui/media_placeholder.dart';
import '../common/actions.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final user = ref.watch(currentUserProvider);
    final settings = ref.watch(settingsProvider);
    final unread = ref.watch(notificationsProvider).value?.$2 ?? 0;

    return Scaffold(
      appBar: AppBar(title: Text(l.navProfile)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.page),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: user == null
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            const CircleAvatar(radius: 28, child: Icon(Icons.person_outline)),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(child: Text(l.guest, style: Theme.of(context).textTheme.titleMedium)),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(l.loginPrompt),
                        const SizedBox(height: AppSpacing.md),
                        FilledButton(onPressed: () => context.push('/login'), child: Text(l.login)),
                      ],
                    )
                  : Row(
                      children: [
                        ShopAvatar(
                          initials: user.name.isEmpty ? '?' : user.name[0].toUpperCase(),
                          color: MediaPlaceholder.colorFor(user.id),
                          size: 56,
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(user.name, style: Theme.of(context).textTheme.titleMedium),
                              Text(user.phone ?? user.email ?? '', style: Theme.of(context).textTheme.bodySmall),
                              const SizedBox(height: AppSpacing.xs),
                              TagLabel(
                                label: switch (user.role) {
                                  'owner' => l.roleOwner,
                                  'seller' => l.roleSeller,
                                  _ => l.roleBuyer,
                                },
                              ),
                            ],
                          ),
                        ),
                        IconButton(onPressed: () => _editProfile(context, ref), icon: const Icon(Icons.edit_outlined)),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          if (user?.isOwner ?? false)
            _MenuCard(children: [
              ListTile(
                leading: const Icon(Icons.admin_panel_settings_outlined),
                title: Text(l.ownerPanel),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/owner'),
              ),
            ]),
          if (user?.isSeller ?? false)
            _MenuCard(children: [
              ListTile(
                leading: const Icon(Icons.storefront_outlined),
                title: Text(l.sellerPanel),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/seller'),
              ),
            ]),
          if (user != null)
            _MenuCard(children: [
              ListTile(
                leading: const Icon(Icons.receipt_long_outlined),
                title: Text(l.myOrders),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/orders'),
              ),
              ListTile(
                leading: const Icon(Icons.favorite_outline),
                title: Text(l.favorites),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/favorites'),
              ),
              ListTile(
                leading: Badge(isLabelVisible: unread > 0, label: Text('$unread'), child: const Icon(Icons.notifications_outlined)),
                title: Text(l.notifications),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/notifications'),
              ),
              if (user.role == 'buyer')
                ListTile(
                  leading: const Icon(Icons.key_outlined),
                  title: Text(l.iAmSeller),
                  subtitle: Text(l.iAmSellerHint),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/invite'),
                ),
            ]),
          _MenuCard(children: [
            ListTile(
              leading: const Icon(Icons.language),
              title: Text(l.language),
              trailing: SegmentedButton<String>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(value: 'ru', label: Text('RU')),
                  ButtonSegment(value: 'tk', label: Text('TM')),
                ],
                selected: {settings.locale.languageCode},
                onSelectionChanged: (s) {
                  ref.read(settingsProvider.notifier).setLocale(Locale(s.first));
                  if (user != null) ref.read(authApiProvider).updateMe(locale: s.first).catchError((_) => user);
                },
              ),
            ),
            ListTile(
              leading: const Icon(Icons.dark_mode_outlined),
              title: Text(l.theme),
              trailing: SegmentedButton<ThemeMode>(
                showSelectedIcon: false,
                segments: [
                  ButtonSegment(value: ThemeMode.light, icon: const Icon(Icons.light_mode_outlined, size: 18), tooltip: l.themeLight),
                  ButtonSegment(value: ThemeMode.system, icon: const Icon(Icons.brightness_auto, size: 18), tooltip: l.themeSystem),
                  ButtonSegment(value: ThemeMode.dark, icon: const Icon(Icons.dark_mode_outlined, size: 18), tooltip: l.themeDark),
                ],
                selected: {settings.themeMode},
                onSelectionChanged: (s) => ref.read(settingsProvider.notifier).setThemeMode(s.first),
              ),
            ),
          ]),
          _MenuCard(children: [
            ListTile(
              leading: const Icon(Icons.privacy_tip_outlined),
              title: Text(l.privacyPolicy),
              onTap: () => context.push('/legal/privacy'),
            ),
            ListTile(
              leading: const Icon(Icons.description_outlined),
              title: Text(l.termsOfUse),
              onTap: () => context.push('/legal/terms'),
            ),
            if (user != null) ...[
              ListTile(
                leading: const Icon(Icons.password),
                title: Text(user.hasPassword ? l.changePassword : l.setPassword),
                onTap: () => _changePassword(context, ref, user.hasPassword),
              ),
              ListTile(
                leading: const Icon(Icons.logout),
                title: Text(l.logout),
                onTap: () async {
                  if (await confirm(context, l.logoutConfirm)) {
                    await ref.read(authProvider.notifier).logout();
                    ref.read(cartProvider.notifier);
                  }
                },
              ),
            ],
          ]),
          const SizedBox(height: AppSpacing.md),
          Center(child: Text(l.appVersion(AppConfig.appVersion), style: Theme.of(context).textTheme.bodySmall)),
        ],
      ),
    );
  }

  Future<void> _editProfile(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final user = ref.read(currentUserProvider)!;
    final name = TextEditingController(text: user.name);
    final phone = TextEditingController(text: user.phone ?? '+993 ');
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l.editProfile),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: name, decoration: InputDecoration(labelText: l.name), maxLength: 80),
            TextField(controller: phone, decoration: InputDecoration(labelText: l.phone), keyboardType: TextInputType.phone),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l.save)),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(authProvider.notifier).updateProfile(
            name: name.text.trim(),
            phone: phone.text.replaceAll(RegExp(r'\D'), '').length >= 8 ? phone.text : null,
          );
      if (context.mounted) showMessage(context, l.saved);
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  Future<void> _changePassword(BuildContext context, WidgetRef ref, bool hasPassword) async {
    final l = context.l10n;
    final current = TextEditingController();
    final next = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(hasPassword ? l.changePassword : l.setPassword),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (hasPassword)
              TextField(controller: current, obscureText: true, decoration: InputDecoration(labelText: l.currentPassword)),
            TextField(controller: next, obscureText: true, decoration: InputDecoration(labelText: l.newPassword, helperText: l.passwordRule)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(l.save)),
        ],
      ),
    );
    if (ok != true) return;
    if (next.text.length < 8) {
      if (context.mounted) showMessage(context, l.passwordRule);
      return;
    }
    try {
      await ref.read(authApiProvider).changePassword(hasPassword ? current.text : null, next.text);
      await ref.read(authProvider.notifier).reload();
      if (context.mounted) showMessage(context, l.saved);
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }
}

class _MenuCard extends StatelessWidget {
  const _MenuCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.md),
        child: Card(child: Column(children: children)),
      );
}
