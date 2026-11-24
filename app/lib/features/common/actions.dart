import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/api/error_text.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/l10n/l10n.dart';
import '../../core/providers.dart';
import '../../core/theme/app_spacing.dart';
import '../../ui/common.dart';

/// Opens (or creates) the chat with a shop. Guests are sent to login first.
Future<void> openChatWithShop(
  BuildContext context,
  WidgetRef ref, {
  required String shopId,
  String? productId,
  String? orderId,
}) async {
  if (ref.read(currentUserProvider) == null) {
    context.push('/login');
    return;
  }
  try {
    final conv = await ref.read(chatApiProvider).open(shopId: shopId, productId: productId, orderId: orderId);
    if (context.mounted) context.push('/chat/${conv.id}');
  } catch (e) {
    if (context.mounted) showError(context, e);
  }
}

/// "Report" dialog for a product, shop, user or message.
Future<void> reportDialog(BuildContext context, WidgetRef ref, String targetType, String targetId) async {
  if (ref.read(currentUserProvider) == null) {
    context.push('/login');
    return;
  }
  final l = context.l10n;
  final controller = TextEditingController();
  final reason = await showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(l.report),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(l.reportHint),
          const SizedBox(height: AppSpacing.md),
          TextField(controller: controller, maxLines: 3, maxLength: 500, decoration: InputDecoration(hintText: l.reportReason)),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
        FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: Text(l.send)),
      ],
    ),
  );
  if (reason == null || reason.length < 3) return;
  try {
    await ref.read(meApiProvider).report(targetType, targetId, reason);
    if (context.mounted) showMessage(context, l.reportSent);
  } catch (e) {
    if (context.mounted) showError(context, e);
  }
}

/// Yes/No confirmation.
Future<bool> confirm(BuildContext context, String text, {String? yes, bool danger = false}) async {
  final l = context.l10n;
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      content: Text(text),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: Text(l.cancel)),
        FilledButton(
          style: danger ? FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error) : null,
          onPressed: () => Navigator.pop(context, true),
          child: Text(yes ?? l.ok),
        ),
      ],
    ),
  );
  return ok ?? false;
}
