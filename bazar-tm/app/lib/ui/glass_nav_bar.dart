import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import '../app_scope.dart';
import '../core/theme/glass.dart';
import '../core/theme/tokens.dart';

class NavItem {
  const NavItem({required this.icon, required this.activeIcon, required this.label, this.badgeSource, this.badgeCount});

  final IconData icon;
  final IconData activeIcon;
  final String label;

  /// Optional counter (cart items, unread chats); only the badge rebuilds when [badgeSource] changes.
  final Listenable? badgeSource;
  final int Function()? badgeCount;
}

/// Floating frosted-glass tab bar. A capsule slides under the active tab with a spring.
class GlassNavBar extends StatelessWidget {
  const GlassNavBar({super.key, required this.items, required this.index, required this.onTap});

  final List<NavItem> items;
  final int index;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(12, 0, 12, 12 + bottom),
      child: Center(
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: GlassSurface(
            radius: 26,
            padding: const EdgeInsets.all(6),
            child: SizedBox(
              height: 58,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final w = constraints.maxWidth / items.length;
                  return Stack(
                    children: [
                      AnimatedPositioned(
                        duration: AppMotion.of(context, AppMotion.slow),
                        curve: AppMotion.spring,
                        left: w * index,
                        top: 0,
                        bottom: 0,
                        width: w,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: p.surfacePressed,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: p.line),
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          for (var i = 0; i < items.length; i++)
                            Expanded(
                              child: _Tab(item: items[i], selected: i == index, onTap: () => onTap(i)),
                            ),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({required this.item, required this.selected, required this.onTap});

  final NavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final color = selected ? p.accent : p.textTertiary;
    final icon = AnimatedScale(
      scale: selected ? 1.08 : 1,
      duration: AppMotion.of(context, AppMotion.normal),
      curve: AppMotion.easeOut,
      child: Icon(selected ? item.activeIcon : item.icon, color: color, size: 24),
    );
    return Semantics(
      button: true,
      selected: selected,
      label: item.label,
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            item.badgeSource == null
                ? icon
                : ListenableBuilder(
                    listenable: item.badgeSource!,
                    builder: (context, child) {
                      final n = item.badgeCount!();
                      return Badge(isLabelVisible: n > 0, label: Text(n > 99 ? '99+' : '$n'), child: child);
                    },
                    child: icon,
                  ),
            const SizedBox(height: 3),
            Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.text.labelSmall?.copyWith(color: selected ? p.text : p.textTertiary, letterSpacing: 0),
            ),
          ],
        ),
      ),
    );
  }
}
