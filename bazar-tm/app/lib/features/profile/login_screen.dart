import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/glass.dart';
import '../../core/theme/tokens.dart';
import '../../ui/common.dart';
import '../cart/checkout_sheet.dart';

/// Sign in / sign up. Google first (the owner's wish), phone + password as the fallback
/// for when Google is blocked. The buttons start working on Day 2.
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

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    if (_form.currentState!.validate()) context.comingSoon();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    return PageScaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpace.lg),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: GlassSurface(
              radius: AppRadii.xl,
              padding: const EdgeInsets.all(AppSpace.xl),
              child: Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(_register ? l.register : l.signIn, style: context.text.headlineSmall),
                    const SizedBox(height: AppSpace.xl),
                    OutlinedButton.icon(onPressed: context.comingSoon, icon: const _GoogleMark(), label: Text(l.signInGoogle)),
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
                        decoration: InputDecoration(labelText: l.yourName),
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
                      autofillHints: [_register ? AutofillHints.newPassword : AutofillHints.password],
                      decoration: InputDecoration(
                        labelText: l.password,
                        suffixIcon: IconButton(
                          tooltip: l.password,
                          onPressed: () => setState(() => _hidden = !_hidden),
                          icon: Icon(_hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                        ),
                      ),
                      validator: (v) => (v == null || v.isEmpty) ? l.requiredField : null,
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    if (!_register)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(onPressed: context.comingSoon, child: Text(l.forgotPassword)),
                      )
                    else
                      const SizedBox(height: AppSpace.lg),
                    FilledButton(onPressed: _submit, child: Text(_register ? l.register : l.signIn)),
                    const SizedBox(height: AppSpace.sm),
                    TextButton(
                      onPressed: () => setState(() => _register = !_register),
                      child: Text(_register ? l.haveAccount : l.noAccount),
                    ),
                  ],
                ),
              ),
            ),
          ),
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
