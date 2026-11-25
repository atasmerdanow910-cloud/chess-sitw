import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../core/format/money.dart';
import '../core/theme/glass.dart';
import '../core/theme/tokens.dart';
import '../data/mock_data.dart';
import '../data/models.dart';

/// Scales down slightly while pressed — the tactile response used by cards and tiles.
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.child, required this.onTap, this.semanticLabel});

  final Widget child;
  final VoidCallback? onTap;
  final String? semanticLabel;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  void _set(bool v) {
    if (_down != v) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: widget.semanticLabel,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => _set(true),
        onTapCancel: () => _set(false),
        onTapUp: (_) => _set(false),
        onTap: widget.onTap == null
            ? null
            : () {
                HapticFeedback.selectionClick();
                widget.onTap!();
              },
        child: AnimatedScale(
          scale: _down ? 0.97 : 1,
          duration: AppMotion.of(context, AppMotion.fast),
          curve: AppMotion.easeOut,
          child: widget.child,
        ),
      ),
    );
  }
}

/// Translucent card without blur (cheap to scroll).
class SurfaceCard extends StatelessWidget {
  const SurfaceCard({super.key, required this.child, this.padding = const EdgeInsets.all(AppSpace.lg), this.radius = AppRadii.lg});

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: p.line),
      ),
      child: Padding(padding: padding, child: child),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.actionLabel, this.onAction});

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.xl, AppSpace.sm, AppSpace.md),
      child: Row(
        children: [
          Expanded(child: Text(title, style: context.text.titleLarge)),
          if (actionLabel != null) TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ),
    );
  }
}

/// Empty or error state: icon, title, hint and an optional action.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.hint, this.actionLabel, this.onAction});

  final IconData icon;
  final String title;
  final String? hint;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(color: p.accentSoft, borderRadius: BorderRadius.circular(22)),
              child: Icon(icon, color: p.accent, size: 30),
            ),
            const SizedBox(height: AppSpace.lg),
            Text(title, style: context.text.titleMedium, textAlign: TextAlign.center),
            if (hint != null) ...[
              const SizedBox(height: AppSpace.xs),
              Text(
                hint!,
                style: context.text.bodyMedium?.copyWith(color: p.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null) ...[const SizedBox(height: AppSpace.lg), FilledButton(onPressed: onAction, child: Text(actionLabel!))],
          ],
        ),
      ),
    );
  }
}

/// Shimmering placeholder shown while content loads.
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.width, this.height = 14, this.radius = AppRadii.xs});

  final double? width;
  final double height;
  final double radius;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1300))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    return ClipRRect(
      borderRadius: BorderRadius.circular(widget.radius),
      child: SizedBox(
        width: widget.width,
        height: widget.height,
        child: reduced
            ? ColoredBox(color: p.surfaceRaised)
            : AnimatedBuilder(
                animation: _c,
                builder: (context, _) => DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment(-1.5 + _c.value * 3, 0),
                      end: Alignment(-0.5 + _c.value * 3, 0),
                      colors: [p.surfaceRaised, p.surfacePressed, p.surfaceRaised],
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}

/// Price in manat with tabular digits (numbers don't jump when they change).
class PriceText extends StatelessWidget {
  const PriceText(this.amount, {super.key, this.style});

  final num amount;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final base = style ?? context.text.titleMedium?.copyWith(fontWeight: FontWeight.w800);
    return Text(formatTmt(amount), style: base?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]));
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip(this.status, {super.key});

  final OrderStatus status;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final color = orderStatusColor(context.palette, status.index);
    final label = switch (status) {
      OrderStatus.created => l.statusNew,
      OrderStatus.confirmed => l.statusConfirmed,
      OrderStatus.shipping => l.statusShipping,
      OrderStatus.delivered => l.statusDelivered,
      OrderStatus.cancelled => l.statusCancelled,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(99)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(label, style: context.text.labelSmall?.copyWith(color: color, fontSize: 12)),
        ],
      ),
    );
  }
}

class RatingRow extends StatelessWidget {
  const RatingRow({super.key, required this.rating, required this.reviews});

  final double rating;
  final int reviews;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.star_rounded, size: 16, color: p.warn),
        const SizedBox(width: 3),
        Text(rating.toStringAsFixed(1), style: context.text.labelMedium?.copyWith(color: p.text)),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            context.l10n.reviewsCount(reviews),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: context.text.bodySmall?.copyWith(color: p.textTertiary),
          ),
        ),
      ],
    );
  }
}

/// Product photo placeholder until real photos arrive (Day 3): category color + icon.
class ProductImage extends StatelessWidget {
  const ProductImage({super.key, required this.product, this.radius = AppRadii.md, this.variant = 0, this.iconSize = 40});

  final Product product;
  final double radius;
  final int variant;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final cat = MockData.category(product.categoryId);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final a = cat.color.withValues(alpha: dark ? 0.34 : 0.22);
    final b = cat.color.withValues(alpha: dark ? 0.12 : 0.08);
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: variant.isEven ? Alignment.topLeft : Alignment.topRight,
            end: variant.isEven ? Alignment.bottomRight : Alignment.bottomLeft,
            colors: [a, b],
          ),
        ),
        child: Center(
          child: Icon(
            cat.icon,
            size: iconSize,
            color: cat.color.withValues(alpha: dark ? 0.9 : 0.75),
          ),
        ),
      ),
    );
  }
}

class ShopAvatar extends StatelessWidget {
  const ShopAvatar(this.shop, {super.key, this.size = 48});

  final Shop shop;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [shop.color, Color.lerp(shop.color, Colors.black, 0.25)!]),
        borderRadius: BorderRadius.circular(size * 0.32),
      ),
      child: Text(
        shop.initials,
        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: size * 0.34, letterSpacing: 0.5),
      ),
    );
  }
}

class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({super.key, this.showLabel = false});

  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final icon = Icon(Icons.verified_rounded, size: 16, color: p.accent, semanticLabel: context.l10n.verifiedSeller);
    if (!showLabel) return icon;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: p.accentSoft, borderRadius: BorderRadius.circular(99)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          icon,
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              context.l10n.verifiedSeller,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.text.labelSmall?.copyWith(color: p.accent, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class QtyStepper extends StatelessWidget {
  const QtyStepper({super.key, required this.value, required this.max, required this.onChanged});

  final int value;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget btn(IconData icon, int next, bool enabled) =>
        IconButton(visualDensity: VisualDensity.compact, onPressed: enabled ? () => onChanged(next) : null, icon: Icon(icon, size: 18));
    return Container(
      decoration: BoxDecoration(
        color: p.surfaceRaised,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: p.line),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          btn(value <= 1 ? Icons.delete_outline_rounded : Icons.remove_rounded, value - 1, true),
          SizedBox(
            width: 24,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: context.text.titleSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
            ),
          ),
          btn(Icons.add_rounded, value + 1, value < max),
        ],
      ),
    );
  }
}

/// Small accent note (payment rules, protection notes).
class InfoNote extends StatelessWidget {
  const InfoNote(this.text, {super.key, this.icon = Icons.info_outline_rounded});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.all(AppSpace.md),
      decoration: BoxDecoration(color: p.accentSoft, borderRadius: BorderRadius.circular(AppRadii.sm)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: p.accent),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: Text(text, style: context.text.bodySmall?.copyWith(color: p.text)),
          ),
        ],
      ),
    );
  }
}

/// Standard pushed page: glow background, transparent app bar, optional bottom bar.
class PageScaffold extends StatelessWidget {
  const PageScaffold({
    super.key,
    this.title,
    this.titleWidget,
    required this.body,
    this.actions,
    this.bottomBar,
    this.extendBehindAppBar = false,
    this.leading,
  });

  final String? title;

  /// Custom title (e.g. avatar + name in a chat); wins over [title].
  final Widget? titleWidget;
  final Widget body;
  final List<Widget>? actions;
  final Widget? bottomBar;
  final bool extendBehindAppBar;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    return GlowBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBodyBehindAppBar: extendBehindAppBar,
        extendBody: bottomBar != null,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          automaticallyImplyLeading: leading == null,
          leading: leading,
          title: titleWidget ?? (title == null ? null : Text(title!)),
          actions: actions,
        ),
        body: body,
        bottomNavigationBar: bottomBar,
      ),
    );
  }
}

/// Round glass button for bars that float over photos.
class GlassIconButton extends StatelessWidget {
  const GlassIconButton({super.key, required this.icon, required this.tooltip, required this.onPressed, this.color});

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: GlassSurface(
        radius: 99,
        blur: 14,
        shadow: false,
        child: IconButton(
          tooltip: tooltip,
          onPressed: onPressed,
          icon: Icon(icon, size: 22, color: color),
        ),
      ),
    );
  }
}

/// Bottom glass bar with the main actions of a screen (add to cart, save).
class BottomActionBar extends StatelessWidget {
  const BottomActionBar({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(12, 0, 12, 12 + MediaQuery.paddingOf(context).bottom),
      child: Center(
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: GlassSurface(
            radius: 24,
            padding: const EdgeInsets.all(8),
            child: Row(children: children),
          ),
        ),
      ),
    );
  }
}

/// Label above a group of controls inside forms and details.
class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpace.sm),
    child: Text(text, style: context.text.titleSmall?.copyWith(color: context.palette.textSecondary)),
  );
}

/// Time of a message or order: "14:05", "Вчера", or the date.
String relativeDay(BuildContext context, DateTime t) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final day = DateTime(t.year, t.month, t.day);
  final diff = today.difference(day).inDays;
  if (diff == 0) return formatTime(t);
  if (diff == 1) return context.l10n.yesterday;
  return formatDate(t);
}
