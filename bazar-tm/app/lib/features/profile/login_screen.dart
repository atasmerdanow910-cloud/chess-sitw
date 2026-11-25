import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/auth/google_auth.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../ui/api_errors.dart';
import '../../ui/common.dart';
import '../cart/checkout_sheet.dart';
import 'change_password_screen.dart';

/// Sign in / sign up. Google first (the owner's wish), phone + password as the fallback
/// for when Google is blocked or the phone has no Google services.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController(text: '+993 ');
  final _password = TextEditingController();
  bool _register = false;
  bool _hidden = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action, String successText) async {
    final l = context.l10n;
    final auth = context.app.auth;
    if (!auth.serverConnected) {
      setState(() => _error = l.serverNotConnected);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (!mounted) return;
      final navigator = Navigator.of(context);
      context.showMessage(successText);
      if (auth.user?.mustChangePassword ?? false) {
        navigator.pushReplacement(MaterialPageRoute<void>(builder: (_) => const ChangePasswordScreen(forced: true)));
      } else {
        navigator.pop();
      }
    } on GoogleUnavailable catch (e) {
      if (mounted) setState(() => _error = e.cancelled ? null : l.errGoogleUnavailable);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(l, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _submit() {
    if (!_form.currentState!.validate()) return;
    final l = context.l10n;
    final auth = context.app.auth;
    final phone = canonicalTmPhone(_phone.text)!;
    if (_register) {
      _run(
        () => auth.register(name: _name.text.trim(), phone: phone, password: _password.text, locale: context.locale.languageCode),
        l.accountCreated,
      );
    } else {
      _run(() => auth.login(phone: phone, password: _password.text), l.signedIn);
    }
  }

  void _google() {
    final l = context.l10n;
    _run(() => context.app.auth.loginWithGoogle(locale: context.locale.languageCode), l.signedIn);
  }

  void _forgot() {
    final l = context.l10n;
    showDialog<void>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: Text(l.forgotPassword),
        content: Text(l.forgotPasswordText),
        actions: [FilledButton(onPressed: () => Navigator.pop(dialog), child: Text(l.continueButton))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final auth = context.app.auth;
    return PageScaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpace.lg),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: GlassSurface(
              radius: AppRadii.xl,
              padding: const EdgeInsets.all(AppSpace.xl),
              child: AutofillGroup(
                child: Form(
                  key: _form,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(_register ? l.register : l.signIn, style: context.text.headlineSmall),
                      if (!auth.serverConnected) ...[
                        const SizedBox(height: AppSpace.md),
                        InfoNote(l.serverNotConnected, icon: Icons.cloud_off_rounded),
                      ],
                      const SizedBox(height: AppSpace.xl),
                      OutlinedButton.icon(onPressed: _busy ? null : _google, icon: const _GoogleMark(), label: Text(l.signInGoogle)),
                      const SizedBox(height: AppSpace.md),
                      InfoNote(l.googleFallbackHint, icon: Icons.wifi_off_rounded),
                      const SizedBox(height: AppSpace.lg),
                      Row(
                        children: [
                          const Expanded(child: Divider()),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                            child: Text(l.or, style: context.text.bodySmall?.copyWith(color: p.textTertiary)),
                          ),
                          const Expanded(child: Divider()),
                        ],
                      ),
                      const SizedBox(height: AppSpace.lg),
                      if (_register) ...[
                        TextFormField(
                          controller: _name,
                          textCapitalization: TextCapitalization.words,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.name],
                          maxLength: 80,
                          decoration: InputDecoration(labelText: l.yourName, counterText: ''),
                          validator: (v) => (v == null || v.trim().isEmpty) ? l.requiredField : null,
                        ),
                        const SizedBox(height: AppSpace.md),
                      ],
                      TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.telephoneNumber],
                        decoration: InputDecoration(labelText: l.phone, hintText: '+993 6X XXXXXX'),
                        validator: (v) => normalizeTmPhone(v ?? '') == null ? l.invalidPhone : null,
                      ),
                      const SizedBox(height: AppSpace.md),
                      TextFormField(
                        controller: _password,
                        obscureText: _hidden,
                        maxLength: 128,
                        autofillHints: [_register ? AutofillHints.newPassword : AutofillHints.password],
                        decoration: InputDecoration(
                          labelText: l.password,
                          counterText: '',
                          helperText: _register ? l.passwordRules : null,
                          helperMaxLines: 2,
                          suffixIcon: IconButton(
                            tooltip: l.password,
                            onPressed: () => setState(() => _hidden = !_hidden),
                            icon: Icon(_hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                          ),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return l.requiredField;
                          if (_register && v.length < 8) return l.passwordRules;
                          return null;
                        },
                        onFieldSubmitted: (_) => _submit(),
                      ),
                      if (!_register)
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(onPressed: _forgot, child: Text(l.forgotPassword)),
                        )
                      else
                        const SizedBox(height: AppSpace.lg),
                      if (_error != null) ...[_ErrorNote(_error!), const SizedBox(height: AppSpace.md)],
                      FilledButton(
                        onPressed: _busy ? null : _submit,
                        child: _busy
                            ? SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: p.onAccent))
                            : Text(_register ? l.register : l.signIn),
                      ),
                      const SizedBox(height: AppSpace.sm),
                      TextButton(
                        onPressed: _busy
                            ? null
                            : () => setState(() {
                                _register = !_register;
                                _error = null;
                              }),
                        child: Text(_register ? l.haveAccount : l.noAccount),
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

class _ErrorNote extends StatelessWidget {
  const _ErrorNote(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(AppSpace.md),
        decoration: BoxDecoration(color: p.danger.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(AppRadii.sm)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.error_outline_rounded, size: 18, color: p.danger),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: Text(text, style: context.text.bodySmall?.copyWith(color: p.text)),
            ),
          ],
        ),
      ),
    );
  }
}

/// Neutral "G" mark drawn with text, so no Google artwork is bundled.
class _GoogleMark extends StatelessWidget {
  const _GoogleMark();

  @override
  Widget build(BuildContext context) => Container(
    width: 22,
    height: 22,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      border: Border.all(color: context.palette.lineStrong),
    ),
    child: Text('G', style: context.text.labelMedium?.copyWith(fontWeight: FontWeight.w800)),
  );
}
