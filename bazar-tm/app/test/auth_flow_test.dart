import 'package:bazar_tm/core/auth/session_storage.dart';
import 'package:bazar_tm/features/profile/profile_screen.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'fake_server.dart';
import 'helpers.dart';

Future<void> openProfile(WidgetTester tester) async {
  await tester.tap(find.text('Профиль'));
  await tester.pumpAndSettle();
}

Future<void> fillAndTap(WidgetTester tester, Map<String, String> fields, String button) async {
  for (final e in fields.entries) {
    await tester.enterText(find.widgetWithText(TextFormField, e.key), e.value);
  }
  await tester.pump();
  final target = find.widgetWithText(FilledButton, button);
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('demo build: sign-in explains that the server is not connected yet', (tester) async {
    await pumpApp(tester, prefs: {'locale': 'ru'});
    await openProfile(tester);
    await tapText(tester, 'Войти');
    expect(find.textContaining('сервер ещё не подключён'), findsOneWidget);
    await fillAndTap(tester, {'Телефон': '65 123456', 'Пароль': 'Bazar-2026'}, 'Войти');
    expect(find.textContaining('сервер ещё не подключён'), findsNWidgets(2));
  });

  testWidgets('sign in with phone and password, see the profile, sign out', (tester) async {
    final server = FakeServer()..addUser('+99365123456', 'Bazar-2026', name: 'Merdan');
    await pumpApp(tester, prefs: {'locale': 'ru'}, auth: server.auth());
    await openProfile(tester);
    await tapText(tester, 'Войти');

    await fillAndTap(tester, {'Телефон': '65 123456', 'Пароль': 'wrong-pass'}, 'Войти');
    expect(find.text('Неверный номер или пароль'), findsOneWidget);

    await fillAndTap(tester, {'Пароль': 'Bazar-2026'}, 'Войти');
    expect(find.text('Merdan'), findsOneWidget);
    expect(find.text('+993 65 123456'), findsOneWidget);
    expect(find.text('Покупатель'), findsOneWidget);

    await tapText(tester, 'Выйти');
    expect(find.text('Гость'), findsOneWidget);
  });

  testWidgets('register a new account', (tester) async {
    final server = FakeServer();
    await pumpApp(tester, prefs: {'locale': 'ru'}, auth: server.auth());
    await openProfile(tester);
    await tapText(tester, 'Войти');
    await tapText(tester, 'Нет аккаунта? Зарегистрируйтесь');
    await fillAndTap(tester, {'Ваше имя': 'Jeren', 'Телефон': '+993 61 000001', 'Пароль': 'Jeren-2026'}, 'Регистрация');
    expect(find.text('Аккаунт создан'), findsOneWidget);
    expect(find.text('Jeren'), findsOneWidget);
  });

  testWidgets('a temporary password must be changed before anything else', (tester) async {
    final server = FakeServer()..addUser('+99362000000', 'temp-pass-1', name: 'Gülşat', mustChangePassword: true);
    await pumpApp(tester, prefs: {'locale': 'ru'}, auth: server.auth());
    await openProfile(tester);
    await tapText(tester, 'Войти');
    await fillAndTap(tester, {'Телефон': '62 000000', 'Пароль': 'temp-pass-1'}, 'Войти');
    expect(find.text('Вы вошли с временным паролем. Придумайте свой.'), findsOneWidget);
    expect(find.byType(BackButton), findsNothing);

    await fillAndTap(tester, {
      'Текущий пароль': 'temp-pass-1',
      'Новый пароль': 'Gulsat-2026',
      'Повторите пароль': 'Gulsat-2027',
    }, 'Сохранить');
    expect(find.text('Пароли не совпадают'), findsOneWidget);
    await fillAndTap(tester, {'Повторите пароль': 'Gulsat-2026'}, 'Сохранить');
    expect(find.text('Gülşat'), findsOneWidget);
  });

  testWidgets('a buyer enters the owner’s code and gets the seller panel', (tester) async {
    final server = FakeServer()
      ..addUser('+99365123456', 'Bazar-2026', name: 'Merdan')
      ..validInvite = 'ABCDEFGHJK';
    await pumpApp(tester, prefs: {'locale': 'ru'}, auth: server.auth());
    await openProfile(tester);
    await tapText(tester, 'Войти');
    await fillAndTap(tester, {'Телефон': '65 123456', 'Пароль': 'Bazar-2026'}, 'Войти');

    await tapText(tester, 'Я торговец');
    await tester.enterText(find.byType(TextField).last, 'WRONG-CODE-1');
    await tester.tap(find.text('Продолжить'));
    await tester.pumpAndSettle();
    expect(find.text('Код неверный, уже использован или устарел'), findsOneWidget);

    await tester.enterText(find.byType(TextField).last, 'abcd-efgh-jk');
    await tester.tap(find.text('Продолжить'));
    await tester.pumpAndSettle();
    expect(find.text('Готово! Ваш магазин открыт, первый месяц бесплатно.'), findsOneWidget);
    // Back to the top of the profile, where the account card is.
    await tester.scrollUntilVisible(
      find.text('Торговец'),
      -300,
      scrollable: find.descendant(of: find.byType(ProfileScreen), matching: find.byType(Scrollable)).first,
    );
    expect(find.text('Торговец'), findsOneWidget);
    expect(find.text('Täze Dükan'), findsOneWidget);

    await tapText(tester, 'Панель торговца');
    expect(find.text('Täze Dükan'), findsOneWidget);
    expect(find.text('Тариф «Пробный»'), findsOneWidget);
  });

  testWidgets('the session survives an app restart', (tester) async {
    final server = FakeServer()..addUser('+99365123456', 'Bazar-2026', name: 'Merdan');
    final storage = MemorySessionStorage();
    await server.auth(storage: storage).login(phone: '+99365123456', password: 'Bazar-2026');
    await pumpApp(
      tester,
      prefs: {'locale': 'ru'},
      auth: server.auth(storage: storage),
    );
    await openProfile(tester);
    expect(find.text('Merdan'), findsOneWidget);
    expect(server.refreshCalls, 1);
  });
}
