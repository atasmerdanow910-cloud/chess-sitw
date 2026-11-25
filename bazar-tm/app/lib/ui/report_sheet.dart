import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../core/theme/tokens.dart';

enum ReportReason { fraud, prohibited, wrongInfo, other }

/// "Report" for a product or a shop. Day 1 only confirms; from Day 7 reports reach the owner's moderation list.
Future<void> showReportSheet(BuildContext context) async {
  final sent = await showModalBottomSheet<bool>(context: context, builder: (_) => const _ReportSheet());
  if (sent == true && context.mounted) context.showMessage(context.l10n.reportSent);
}

class _ReportSheet extends StatefulWidget {
  const _ReportSheet();

  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  ReportReason? _reason;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final reasons = {
      ReportReason.fraud: l.reasonFraud,
      ReportReason.prohibited: l.reasonProhibited,
      ReportReason.wrongInfo: l.reasonWrongInfo,
      ReportReason.other: l.reasonOther,
    };
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.lg, 0, AppSpace.lg, AppSpace.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
              child: Text(l.reportTitle, style: context.text.titleLarge),
            ),
            const SizedBox(height: AppSpace.sm),
            RadioGroup<ReportReason>(
              groupValue: _reason,
              onChanged: (v) => setState(() => _reason = v),
              child: Column(
                children: [
                  for (final e in reasons.entries)
                    RadioListTile<ReportReason>(
                      value: e.key,
                      title: Text(e.value),
                      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.sm)),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.md),
            SizedBox(
              width: double.infinity,
              child: FilledButton(onPressed: _reason == null ? null : () => Navigator.pop(context, true), child: Text(l.send)),
            ),
          ],
        ),
      ),
    );
  }
}
