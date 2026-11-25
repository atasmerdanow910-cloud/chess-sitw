import 'package:material_ui/material_ui.dart';

import '../../app_scope.dart';
import '../../core/theme/tokens.dart';
import '../../data/models.dart';
import '../../ui/cards.dart';
import '../../ui/common.dart';
import '../../ui/report_sheet.dart';
import '../chat/chat_screen.dart';

/// Shop page: logo, name, rating, description, market and hours, all products of the shop.
class ShopScreen extends StatelessWidget {
  const ShopScreen({super.key, required this.shop});

  final Shop shop;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    return PageScaffold(
      title: shop.name,
      actions: [
        IconButton(tooltip: l.report, onPressed: () => showReportSheet(context), icon: const Icon(Icons.flag_outlined)),
        const SizedBox(width: 4),
      ],
      body: ListenableBuilder(
        listenable: context.app.products,
        builder: (context, _) {
          final products = context.app.products.ofShop(shop.id);
          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.lg, 0),
                  child: SurfaceCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            ShopAvatar(shop, size: 64),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(shop.name, style: context.text.titleLarge),
                                  const SizedBox(height: 4),
                                  RatingRow(rating: shop.rating, reviews: shop.reviews),
                                  if (shop.verified) ...[const SizedBox(height: 6), const VerifiedBadge(showLabel: true)],
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpace.lg),
                        Text(shop.description(context.locale), style: context.text.bodyMedium?.copyWith(color: p.textSecondary)),
                        const SizedBox(height: AppSpace.md),
                        _InfoLine(icon: Icons.place_outlined, label: l.address, value: shop.market),
                        const SizedBox(height: 6),
                        _InfoLine(icon: Icons.schedule_rounded, label: l.workingHours, value: shop.hours),
                        const SizedBox(height: AppSpace.lg),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: () => openChatWith(context, shop.id),
                            icon: const Icon(Icons.chat_bubble_outline_rounded, size: 20),
                            label: Text(l.chatWithSeller),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(child: SectionHeader(l.productsCount(products.length))),
              if (products.isEmpty)
                SliverToBoxAdapter(
                  child: EmptyState(icon: Icons.inventory_2_outlined, title: l.productsEmpty),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
                  sliver: productGrid(products),
                ),
              SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl + MediaQuery.paddingOf(context).bottom)),
            ],
          );
        },
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      label: '$label: $value',
      excludeSemantics: true,
      child: Row(
        children: [
          Icon(icon, size: 18, color: p.textTertiary),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: context.text.bodyMedium)),
        ],
      ),
    );
  }
}
