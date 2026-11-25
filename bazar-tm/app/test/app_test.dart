import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'helpers.dart';

void main() {
  testWidgets('first launch asks for the language, then opens the home screen', (tester) async {
    await pumpApp(tester);
    expect(find.text('Русский'), findsOneWidget);
    expect(find.text('Türkmençe'), findsOneWidget);
    expect(find.textContaining('Выберите язык'), findsOneWidget);
    expect(find.textContaining('Dili saýlaň'), findsOneWidget);

    await tester.tap(find.text('Türkmençe'));
    await tester.pumpAndSettle();
    expect(find.text('Hoş geldiňiz'), findsOneWidget);
    expect(find.text('Baş sahypa'), findsOneWidget);

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('locale'), 'tk');
  });

  testWidgets('language and theme switch from the profile', (tester) async {
    await pumpApp(tester, prefs: {'locale': 'ru'});
    expect(find.text('Главная'), findsOneWidget);

    await tester.tap(find.text('Профиль'));
    await tester.pumpAndSettle();
    await tapText(tester, 'Тёмная');
    expect(tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode, ThemeMode.dark);

    await tapText(tester, 'Türkmençe');
    expect(find.text('Profil'), findsWidgets);
    expect(find.text('Baş sahypa'), findsOneWidget);

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('theme'), 'dark');
    expect(prefs.getString('locale'), 'tk');
  });

  testWidgets('buyer orders from one shop and the seller sees the new order', (tester) async {
    await pumpApp(tester, prefs: {'locale': 'ru'});

    // Find the product through catalog search.
    await tester.tap(find.text('Каталог'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'redmi');
    await tester.pumpAndSettle();
    expect(find.text('Найден 1 товар'), findsOneWidget);
    await tester.tap(find.text('Redmi Note 14 Pro 8/256 ГБ'));
    await tester.pumpAndSettle();

    // Product screen: choose a color and add to the cart.
    await tapText(tester, 'Синий');
    await tester.tap(find.text('В корзину'));
    await tester.pumpAndSettle();
    expect(find.text('Добавлено в корзину'), findsOneWidget);
    expect(find.text('В корзине'), findsOneWidget);

    // Go to the cart from the snack bar action.
    await tester.tap(find.widgetWithText(SnackBarAction, 'Корзина'));
    await tester.pumpAndSettle();
    expect(find.text('Ak Ýol Trade'), findsOneWidget);
    await tapText(tester, 'Оформить заказ');

    // Checkout: empty form is rejected, a valid one is accepted.
    await tester.tap(find.text('Подтвердить заказ'));
    await tester.pumpAndSettle();
    expect(find.text('Заполните это поле'), findsWidgets);
    await tester.enterText(find.widgetWithText(TextFormField, 'Ваше имя'), 'Aýna');
    await tester.enterText(find.widgetWithText(TextFormField, 'Телефон'), '65 12 34 56');
    await tester.enterText(find.widgetWithText(TextFormField, 'Адрес доставки'), 'Aşgabat, Bitarap Türkmenistan şaýoly');
    await tapText(tester, 'Подтвердить заказ');
    expect(find.text('Заказ отправлен торговцу'), findsOneWidget);
    expect(find.text('Заказ № 1049'), findsOneWidget);

    // The order is in "My orders" with status "New".
    await tester.tap(find.text('Мои заказы'));
    await tester.pumpAndSettle();
    expect(find.text('Заказ № 1049'), findsOneWidget);
    expect(find.text('Новый'), findsOneWidget);

    // Seller side (demo switch in the profile) shows the same order.
    await goBack(tester);
    await tester.tap(find.text('Профиль'));
    await tester.pumpAndSettle();
    await tapText(tester, 'Показать панель торговца (демо)');
    await tapText(tester, 'Панель торговца');
    await tester.tap(panelTab('Заказы'));
    await tester.pumpAndSettle();
    expect(find.text('Заказ № 1049'), findsOneWidget);

    // Seller confirms: the buyer's status changes too.
    await tester.tap(find.text('Заказ № 1049'));
    await tester.pumpAndSettle();
    expect(find.text('+993 65 123456'), findsOneWidget);
    await tapText(tester, 'Подтвердить заказ');
    expect(find.text('Подтверждён'), findsWidgets);
  });

  testWidgets('the seller adds a product and buyers see it in the catalog', (tester) async {
    await pumpApp(tester, prefs: {'locale': 'ru', 'seller_preview': true});
    await tester.tap(find.text('Профиль'));
    await tester.pumpAndSettle();
    await tapText(tester, 'Панель торговца');
    await tester.tap(panelTab('Товары'));
    await tester.pumpAndSettle();
    await tapText(tester, 'Добавить товар');

    await tester.tap(find.text('Сохранить'));
    await tester.pumpAndSettle();
    expect(find.text('Заполните это поле'), findsOneWidget);
    expect(find.text('Введите число'), findsNWidgets(2));

    await tester.enterText(find.widgetWithText(TextFormField, 'Название'), 'Чехол для телефона');
    await tester.enterText(find.widgetWithText(TextFormField, 'Цена, TMT'), '45');
    await tester.enterText(find.widgetWithText(TextFormField, 'Остаток, шт.'), '12');
    await tester.tap(find.text('Сохранить'));
    await tester.pumpAndSettle();
    expect(find.text('Чехол для телефона'), findsOneWidget);

    // Leave the panel and search the catalog.
    await goBack(tester);
    await tester.tap(find.text('Каталог'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'чехол');
    await tester.pumpAndSettle();
    expect(find.text('Чехол для телефона'), findsOneWidget);
  });

  testWidgets('chat: send a message and see it in the list', (tester) async {
    await pumpApp(tester, prefs: {'locale': 'ru'});
    expect(find.text('Чаты'), findsOneWidget);
    await tester.tap(find.text('Чаты'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ak Ýol Trade'));
    await tester.pumpAndSettle();
    expect(find.text('Переписку видите только вы и торговец'), findsOneWidget);

    await tester.enterText(find.byType(TextField).last, 'Здравствуйте! Есть синий?');
    await tester.pump();
    await tester.tap(find.byTooltip('Отправить'));
    await tester.pumpAndSettle();
    expect(find.text('Здравствуйте! Есть синий?'), findsOneWidget);

    await goBack(tester);
    expect(find.text('Здравствуйте! Есть синий?'), findsOneWidget, reason: 'last message preview in the chats list');
  });
}
