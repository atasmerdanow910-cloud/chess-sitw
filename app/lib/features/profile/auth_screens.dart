import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/error_text.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/config/app_config.dart';
import '../../core/l10n/l10n.dart';
import '../../core/theme/app_spacing.dart';
import '../../ui/app_logo.dart';
import '../../ui/common.dart';

String? _phoneValidator(BuildContext context, String? v) =>
    (v ?? '').replaceAll(RegExp(r'\D'), '').length < 8 ? context.l10n.errInvalidPhone : null;

/// Login: Google (if available) + phone & password as the always-working fallback.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _phone = TextEditingController(text: '+993 ');
  final _password = TextEditingController();
  bool _busy = false;
  bool _showPassword = false;

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
      if (mounted) context.pop();
    } catch (e) {
      if (!mounted) return;
      if (e is ApiException && e.code == 'google_unavailable') {
        showMessage(context, context.l10n.googleFallbackHint);
      } else {
        showError(context, e);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.xl),
          children: [
            const Center(child: AppLogo(size: 44)),
            const SizedBox(height: AppSpacing.xl),
            Text(l.loginPrompt, textAlign: TextAlign.center),
            const SizedBox(height: AppSpacing.xl),
            if (AppConfig.googleEnabled) ...[
              OutlinedButton.icon(
                onPressed: _busy ? null : () => _run(() => ref.read(authProvider.notifier).loginWithGoogle()),
                icon: const Text('G', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                label: Text(l.loginWithGoogle),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  const Expanded(child: Divider()),
                  Padding(padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md), child: Text(l.or)),
                  const Expanded(child: Divider()),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
            ],
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              autofillHints: const [AutofillHints.telephoneNumber],
              decoration: InputDecoration(labelText: l.phone, prefixIcon: const Icon(Icons.phone_outlined)),
              validator: (v) => _phoneValidator(context, v),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _password,
              obscureText: !_showPassword,
              autofillHints: const [AutofillHints.password],
              decoration: InputDecoration(
                labelText: l.password,
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  onPressed: () => setState(() => _showPassword = !_showPassword),
                  icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                ),
              ),
              validator: (v) => (v ?? '').isEmpty ? l.fieldRequired : null,
            ),
            const SizedBox(height: AppSpacing.xl),
            FilledButton(
              onPressed: _busy
                  ? null
                  : () {
                      if (_form.currentState!.validate()) {
                        _run(() => ref.read(authProvider.notifier).login(_phone.text, _password.text));
                      }
                    },
              child: _busy
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(l.login),
            ),
            const SizedBox(height: AppSpacing.md),
            TextButton(onPressed: () => context.pushReplacement('/register'), child: Text(l.noAccountRegister)),
            if (AppConfig.googleEnabled)
              Text(
                l.googleFallbackHint,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
          ],
        ),
      ),
    );
  }
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController(text: '+993 ');
  final _password = TextEditingController();
  bool _agree = false;
  bool _busy = false;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    if (!_agree) {
      showMessage(context, context.l10n.mustAcceptTerms);
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(authProvider.notifier).register(_name.text.trim(), _phone.text, _password.text);
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.register)),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.xl),
          children: [
            TextFormField(
              controller: _name,
              maxLength: 80,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(labelText: l.name, prefixIcon: const Icon(Icons.person_outline)),
              validator: (v) => (v ?? '').trim().isEmpty ? l.fieldRequired : null,
            ),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: l.phone, prefixIcon: const Icon(Icons.phone_outlined)),
              validator: (v) => _phoneValidator(context, v),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _password,
              obscureText: true,
              decoration: InputDecoration(
                labelText: l.password,
                prefixIcon: const Icon(Icons.lock_outline),
                helperText: l.passwordRule,
              ),
              validator: (v) => (v ?? '').length < 8 ? l.passwordRule : null,
            ),
            const SizedBox(height: AppSpacing.md),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _agree,
              onChanged: (v) => setState(() => _agree = v ?? false),
              title: Text(l.acceptTerms),
              subtitle: Wrap(
                spacing: AppSpacing.md,
                children: [
                  InkWell(onTap: () => context.push('/legal/terms'), child: Text(l.termsOfUse, style: TextStyle(color: Theme.of(context).colorScheme.primary))),
                  InkWell(onTap: () => context.push('/legal/privacy'), child: Text(l.privacyPolicy, style: TextStyle(color: Theme.of(context).colorScheme.primary))),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(l.register),
            ),
            TextButton(onPressed: () => context.pushReplacement('/login'), child: Text(l.haveAccountLogin)),
          ],
        ),
      ),
    );
  }
}

/// Seller enters the code the owner gave them in person.
class InviteScreen extends ConsumerStatefulWidget {
  const InviteScreen({super.key});

  @override
  ConsumerState<InviteScreen> createState() => _InviteScreenState();
}

class _InviteScreenState extends ConsumerState<InviteScreen> {
  final _code = TextEditingController();
  bool _busy = false;

  Future<void> _submit() async {
    if (_code.text.trim().length < 4) return;
    setState(() => _busy = true);
    try {
      await ref.read(authProvider.notifier).claimInvite(_code.text);
      if (!mounted) return;
      showMessage(context, context.l10n.inviteAccepted);
      context.pushReplacement('/seller');
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.iAmSeller)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.xl),
        children: [
          const Icon(Icons.storefront_outlined, size: 64),
          const SizedBox(height: AppSpacing.lg),
          Text(l.inviteExplain, textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.xl),
          TextField(
            controller: _code,
            textCapitalization: TextCapitalization.characters,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(letterSpacing: 4),
            maxLength: 20,
            decoration: InputDecoration(labelText: l.inviteCode),
          ),
          const SizedBox(height: AppSpacing.lg),
          FilledButton(onPressed: _busy ? null : _submit, child: Text(l.activate)),
        ],
      ),
    );
  }
}
