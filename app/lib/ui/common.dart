import 'package:material_ui/material_ui.dart';

import '../core/format/formatters.dart';
import '../core/l10n/l10n.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_spacing.dart';
import '../data/models.dart';

/// Price in TMT, bold.
class PriceText extends StatelessWidget {
  const PriceText(this.tenge, {super.key, this.style});

  final int tenge;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final base = style ?? Theme.of(context).textTheme.titleMedium;
    return Text(
      formatPrice(tenge),
      style: base?.copyWith(fontWeight: FontWeight.w800),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}

/// Section title in caps (like "TÄZE BILDIRIŞLER" on the old site) + action.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.actionLabel, this.onAction});

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.page,
        AppSpacing.xl,
        AppSpacing.sm,
        AppSpacing.sm,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title.toUpperCase(),
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
            ),
          ),
          if (actionLabel != null)
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ),
    );
  }
}

/// Small rounded label ("Täze", "Скрыт").
class TagLabel extends StatelessWidget {
  const TagLabel({super.key, required this.label, this.background, this.foreground});

  final String label;
  final Color? background;
  final Color? foreground;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 3),
      decoration: BoxDecoration(
        color: background ?? scheme.primaryContainer,
        borderRadius: BorderRadius.circular(AppRadius.sm - 2),
      ),
      child: Text(
        label.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: foreground ?? scheme.onPrimaryContainer,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
            ),
      ),
    );
  }
}

/// ★ 4.8 (126)
class RatingView extends StatelessWidget {
  const RatingView({super.key, required this.rating, this.reviewsCount});

  final double rating;
  final int? reviewsCount;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    final style = Theme.of(context).textTheme.bodySmall;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.star_rounded, size: 16, color: AppColors.rating),
        const SizedBox(width: 2),
        Text(rating.toStringAsFixed(1), style: style?.copyWith(fontWeight: FontWeight.w700)),
        if (reviewsCount != null) ...[
          const SizedBox(width: AppSpacing.xs),
          Flexible(
            child: Text(
              '· ${context.l10n.reviewsCount(reviewsCount!)}',
              style: style?.copyWith(color: muted),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ],
    );
  }
}

class VerifiedIcon extends StatelessWidget {
  const VerifiedIcon({super.key, this.size = 18});

  final double size;

  @override
  Widget build(BuildContext context) => Tooltip(
        message: context.l10n.verifiedSeller,
        child: Icon(Icons.verified_rounded, size: size, color: AppColors.info),
      );
}

/// Icon + title + hint, centered. For empty lists.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.hint, this.action});

  final IconData icon;
  final String title;
  final String? hint;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(color: scheme.surfaceContainerHigh, shape: BoxShape.circle),
              child: Icon(icon, size: 38, color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(title, style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
            if (hint != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                hint!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ],
            if (action != null) ...[const SizedBox(height: AppSpacing.lg), action!],
          ],
        ),
      ),
    );
  }
}

/// Colored chip for order status.
class OrderStatusChip extends StatelessWidget {
  const OrderStatusChip({super.key, required this.status});

  final OrderStatus status;

  static Color colorOf(OrderStatus s) => switch (s) {
        OrderStatus.pending => AppColors.info,
        OrderStatus.confirmed => AppColors.brandStrong,
        OrderStatus.shipping => AppColors.warning,
        OrderStatus.delivered => AppColors.brand,
        OrderStatus.cancelled => AppColors.danger,
      };

  static String labelOf(BuildContext context, OrderStatus s) {
    final l = context.l10n;
    return switch (s) {
      OrderStatus.pending => l.orderStatusNew,
      OrderStatus.confirmed => l.orderStatusConfirmed,
      OrderStatus.shipping => l.orderStatusShipping,
      OrderStatus.delivered => l.orderStatusDelivered,
      OrderStatus.cancelled => l.orderStatusCancelled,
    };
  }

  @override
  Widget build(BuildContext context) {
    final color = colorOf(status);
    return TagLabel(
      label: labelOf(context, status),
      background: color.withValues(alpha: 0.16),
      foreground: color,
    );
  }
}

/// − 2 +
class QuantityStepper extends StatelessWidget {
  const QuantityStepper({super.key, required this.value, required this.onChanged, this.max});

  final int value;
  final int? max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: scheme.outline),
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: Icon(value <= 1 ? Icons.delete_outline : Icons.remove, size: 18),
            onPressed: () => onChanged(value - 1),
          ),
          SizedBox(
            width: 28,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleSmall,
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.add, size: 18),
            onPressed: max != null && value >= max! ? null : () => onChanged(value + 1),
          ),
        ],
      ),
    );
  }
}

/// Shows a short "coming soon" message for features of later days.
void showComingSoon(BuildContext context) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(context.l10n.comingSoon)));
}

void showMessage(BuildContext context, String text) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));
}
