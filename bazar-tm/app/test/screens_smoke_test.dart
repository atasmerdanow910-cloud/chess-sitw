import 'package:bazar_tm/app_scope.dart';
import 'package:bazar_tm/data/mock_data.dart';
import 'package:bazar_tm/features/chat/chat_screen.dart';
import 'package:bazar_tm/features/orders/orders_screen.dart';
import 'package:bazar_tm/features/product/product_screen.dart';
import 'package:bazar_tm/features/profile/favorites_screen.dart';
import 'package:bazar_tm/features/profile/login_screen.dart';
import 'package:bazar_tm/features/seller/product_edit_screen.dart';
import 'package:bazar_tm/features/seller/seller_panel_screen.dart';
import 'package:bazar_tm/features/shell/root_shell.dart';
import 'package:bazar_tm/features/shop/shop_screen.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'helpers.dart';

/// Opens every screen in both languages and both themes. Any layout overflow or exception
/// fails the test, so long Turkmen words or a narrow phone can't break a screen unnoticed.
void main() {
  for (final width in [360.0, 412.0]) {
    for (final locale in ['ru', 'tk']) {
      for (final theme in ['light', 'dark']) {
        testWidgets('every screen renders: $locale, $theme, ${width.toInt()} px', (tester) async {
          await pumpApp(tester, prefs: {'locale': locale, 'theme': theme, 'seller_preview': true});
          tester.view.physicalSize = Size(width * 3, 780 * 3);
          await tester.pumpAndSettle();

          final shell = tester.element(find.byType(RootShell));
          final app = AppScope.of(shell);
          final nav = Navigator.of(shell);

          for (var i = 0; i < 5; i++) {
            app.tab.value = i;
            await tester.pumpAndSettle();
          }

          Future<void> open(Widget screen, {Future<void> Function()? inside}) async {
            nav.push(MaterialPageRoute<void>(builder: (_) => screen));
            await tester.pumpAndSettle();
            if (inside != null) await inside();
            nav.pop();
            await tester.pumpAndSettle();
          }

          await open(ProductScreen(product: MockData.product('p5')));
          await open(ProductScreen(product: MockData.product('p4'))); // sold out
          await open(ShopScreen(shop: MockData.shop('s1')));
          await open(ChatScreen(conversation: app.chats.items.first));
          await open(const LoginScreen());
          await open(const FavoritesScreen());
          await open(const OrdersScreen());
          await open(ProductEditScreen(product: MockData.product('p1')));
          await open(const ProductEditScreen());
          await open(
            const SellerPanelScreen(),
            inside: () async {
              final tabs = DefaultTabController.of(tester.element(find.byType(TabBarView)));
              for (var i = 1; i < tabs.length; i++) {
                tabs.animateTo(i);
                await tester.pumpAndSettle();
              }
            },
          );
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
}
