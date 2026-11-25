import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/tokens.dart';
import '../../ui/api_errors.dart';
import '../../ui/common.dart';

/// Change password. With [forced] (signed in with the owner's temporary password)
/// the screen can't be left until a new password is set.
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key, this.forced = false});

  final bool forced;

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _repeat = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _repeat.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final l = context.l10n;
    final auth = context.app.auth;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await auth.changePassword(current: (auth.user?.hasPassword ?? true) ? _current.text : null, next: _next.text);
      if (!mounted) return;
      context.showMessage(l.passwordChanged);
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = errorText(l, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final hasPassword = context.app.auth.user?.hasPassword ?? true;
    return PopScope(
      canPop: !widget.forced,
      child: PageScaffold(
        title: l.changePassword,
        leading: widget.forced ? const SizedBox.shrink() : null,
        body: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(AppSpace.lg),
            children: [
              if (widget.forced) ...[InfoNote(l.mustChangePassword, icon: Icons.key_rounded), const SizedBox(height: AppSpace.lg)],
              if (hasPassword) ...[
                TextFormField(
                  controller: _current,
                  obscureText: true,
                  autofillHints: const [AutofillHints.password],
                  decoration: InputDecoration(labelText: l.currentPassword),
                  validator: (v) => (v == null || v.isEmpty) ? l.requiredField : null,
                ),
                const SizedBox(height: AppSpace.md),
              ],
              TextFormField(
                controller: _next,
                obscureText: true,
                maxLength: 128,
                autofillHints: const [AutofillHints.newPassword],
                decoration: InputDecoration(labelText: l.newPassword, helperText: l.passwordRules, helperMaxLines: 2, counterText: ''),
                validator: (v) => (v == null || v.length < 8) ? l.passwordRules : null,
              ),
              const SizedBox(height: AppSpace.md),
              TextFormField(
                controller: _repeat,
                obscureText: true,
                decoration: InputDecoration(labelText: l.repeatPassword),
                validator: (v) => v != _next.text ? l.passwordsDontMatch : null,
                onFieldSubmitted: (_) => _save(),
              ),
              const SizedBox(height: AppSpace.lg),
              if (_error != null) ...[
                Text(_error!, style: context.text.bodyMedium?.copyWith(color: p.danger)),
                const SizedBox(height: AppSpace.md),
              ],
              FilledButton(
                onPressed: _busy ? null : _save,
                child: _busy
                    ? SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: p.onAccent))
                    : Text(l.save),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
