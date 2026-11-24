import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart' show Size;
import 'package:flutter_test/flutter_test.dart';
import 'package:kerwen_market/app.dart';
import 'package:kerwen_market/core/api/api_client.dart';
import 'package:kerwen_market/core/auth/token_store.dart';
import 'package:kerwen_market/core/providers.dart';
import 'package:kerwen_market/core/settings/settings_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _shop = {
  'id': '11111111-1111-1111-1111-111111111111',
  'name': 'Altyn Moda',
  'isVerified': true,
  'logoUrl': null,
  'description': 'Одежда',
  'address': 'Aşgabat',
  'phone': '+99361000001',
  'workingHours': '09:00–18:00',
  'returnPolicy': '',
  'rating': 4.8,
  'reviewsCount': 10,
  'productsCount': 1,
};

final _home = {
  'banners': [
    {'id': 'b1', 'titleRu': 'Добро пожаловать', 'titleTk': 'Hoş geldiňiz', 'subtitleRu': '', 'subtitleTk': '', 'color': '#0F4A23', 'imageUrl': null, 'shopId': null},
  ],
  'categories': [
    {'id': 'c1', 'parentId': null, 'nameRu': 'Одежда', 'nameTk': 'Eşikler', 'icon': 'checkroom'},
  ],
  'popularShops': [_shop],
  'newProducts': [
    {
      'id': '22222222-2222-2222-2222-222222222222',
      'title': 'Куртка зимняя',
      'priceTenge': 89000,
      'stock': 3,
      'categoryId': 'c1',
      'status': 'active',
      'createdAt': DateTime.now().toIso8601String(),
      'imageUrl': null,
      'shop': {'id': _shop['id'], 'name': 'Altyn Moda', 'isVerified': true, 'logoUrl': null},
      'isFavorite': false,
    },
  ],
};

/// Fake server: answers API requests with fixed JSON.
class FakeServer implements HttpClientAdapter {
  final requests = <String>[];

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add('${options.method} ${options.path}');
    final Object body = switch (options.path) {
      '/home' => _home,
      '/categories' => _home['categories']!,
      _ => <String, dynamic>{},
    };
    return ResponseBody.fromString(jsonEncode(body), 200, headers: {
      Headers.contentTypeHeader: ['application/json'],
    });
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  testWidgets('home loads from the server and switches RU <-> TM', (tester) async {
    tester.view.physicalSize = const Size(1080, 3200);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({'settings.locale': 'ru'});
    final prefs = await SharedPreferences.getInstance();
    final tokens = MemoryTokenStore();
    final server = FakeServer();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tokenStoreProvider.overrideWithValue(tokens),
          apiClientProvider.overrideWith(
            (ref) => ApiClient(
              tokens: tokens,
              prefs: prefs,
              onSessionExpired: () {},
              baseUrls: const ['http://test'],
              adapter: server,
            ),
          ),
        ],
        child: const KerwenApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(server.requests, contains('GET /home'));
    expect(find.text('Главная'), findsOneWidget);
    expect(find.text('Куртка зимняя'), findsOneWidget);
    expect(find.text('Добро пожаловать'), findsOneWidget);
    expect(find.text('Altyn Moda'), findsWidgets);

    await tester.tap(find.text('RU'));
    await tester.pumpAndSettle();
    expect(find.text('Baş sahypa'), findsOneWidget);
    expect(find.text('Hoş geldiňiz'), findsOneWidget);
    expect(find.text('Eşikler'), findsOneWidget);
  });

  testWidgets('guest sees login prompt in profile', (tester) async {
    SharedPreferences.setMockInitialValues({'settings.locale': 'tk'});
    final prefs = await SharedPreferences.getInstance();
    final tokens = MemoryTokenStore();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          tokenStoreProvider.overrideWithValue(tokens),
          apiClientProvider.overrideWith(
            (ref) => ApiClient(tokens: tokens, prefs: prefs, onSessionExpired: () {}, baseUrls: const ['http://test'], adapter: FakeServer()),
          ),
        ],
        child: const KerwenApp(),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Profil'));
    await tester.pumpAndSettle();
    expect(find.text('Myhman'), findsOneWidget);
    expect(find.text('Içeri gir'), findsOneWidget);
  });
}
