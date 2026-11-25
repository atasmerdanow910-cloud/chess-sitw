import 'dart:convert';

import 'package:bazar_tm/core/api/api_client.dart';
import 'package:bazar_tm/core/auth/session_storage.dart';
import 'package:bazar_tm/data/auth_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'fake_server.dart';

http.Response json(int status, Object body) =>
    http.Response.bytes(utf8.encode(jsonEncode(body)), status, headers: {'content-type': 'application/json'});

void main() {
  group('ApiClient', () {
    test('the demo build has no server', () async {
      final api = ApiClient(baseUrl: '');
      expect(api.configured, isFalse);
      await expectLater(api.get('/me'), throwsA(isA<ApiException>().having((e) => e.code, 'code', 'not_configured')));
    });

    test('decodes UTF-8 JSON, Turkmen letters included', () async {
      final api = ApiClient(baseUrl: 'https://x/api/v1/', httpClient: MockClient((r) async => json(200, {'name': 'Öý Dünýä'})));
      expect((await api.get('/me'))['name'], 'Öý Dünýä');
    });

    test('turns server errors into codes', () async {
      final api = ApiClient(
        baseUrl: 'https://x',
        httpClient: MockClient((r) async => json(429, {'statusCode': 429, 'error': 'too_many_attempts', 'retryAfterSeconds': 900})),
      );
      await expectLater(
        api.post('/auth/login', {}, false),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'too_many_attempts').having((e) => e.retryAfterSeconds, 'retry', 900)),
      );
    });

    test('reports no internet and slow answers as "network"', () async {
      final offline = ApiClient(baseUrl: 'https://x', httpClient: MockClient((r) async => throw http.ClientException('down')));
      await expectLater(offline.get('/me'), throwsA(isA<ApiException>().having((e) => e.isNetwork, 'network', true)));
      final slow = ApiClient(
        baseUrl: 'https://x',
        timeout: const Duration(milliseconds: 50),
        httpClient: MockClient((r) => Future.delayed(const Duration(milliseconds: 300), () => json(200, {}))),
      );
      await expectLater(slow.get('/me'), throwsA(isA<ApiException>().having((e) => e.code, 'code', 'network')));
    });

    test('a web page instead of JSON (Wi-Fi login page) is an error, not data', () async {
      final api = ApiClient(baseUrl: 'https://x', httpClient: MockClient((r) async => http.Response('<html>login</html>', 200)));
      await expectLater(api.get('/me'), throwsA(isA<ApiException>().having((e) => e.code, 'code', 'unknown')));
    });

    test('refreshes an expired token once and repeats the request', () async {
      final seen = <String?>[];
      final api = ApiClient(
        baseUrl: 'https://x',
        httpClient: MockClient((r) async {
          seen.add(r.headers['Authorization']);
          return r.headers['Authorization'] == 'Bearer new' ? json(200, {'ok': true}) : json(401, {'error': 'session_expired'});
        }),
      )..accessToken = 'old';
      api.onUnauthorized = () async => api.accessToken = 'new';
      expect((await api.get('/me'))['ok'], isTrue);
      expect(seen, ['Bearer old', 'Bearer new']);
    });

    test('gives up when the refresh does not help', () async {
      final api = ApiClient(baseUrl: 'https://x', httpClient: MockClient((r) async => json(401, {'error': 'session_expired'})))
        ..accessToken = 'old'
        ..onUnauthorized = () async => null;
      await expectLater(api.get('/me'), throwsA(isA<ApiException>().having((e) => e.code, 'code', 'session_expired')));
    });
  });

  group('AuthStore', () {
    late FakeServer server;
    late MemorySessionStorage storage;
    late AuthStore auth;

    setUp(() {
      server = FakeServer()..addUser('+99365123456', 'Bazar-2026', name: 'Merdan');
      storage = MemorySessionStorage();
      auth = server.auth(storage: storage);
    });

    test('signs in and keeps only the refresh token and profile on the phone', () async {
      await auth.login(phone: '+99365123456', password: 'Bazar-2026');
      expect(auth.signedIn, isTrue);
      expect(auth.user!.name, 'Merdan');
      expect(auth.user!.role, UserRole.buyer);
      expect(storage.value!.refreshToken, startsWith('ref-'));
      expect(storage.value!.user['name'], 'Merdan');
      expect(jsonEncode(storage.value!.user), isNot(contains('acc-')));
    });

    test('a wrong password leaves the app signed out', () async {
      await expectLater(
        auth.login(phone: '+99365123456', password: 'nope-nope'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'invalid_credentials')),
      );
      expect(auth.signedIn, isFalse);
      expect(storage.value, isNull);
    });

    test('registers a new buyer', () async {
      await auth.register(name: 'Jeren', phone: '+99361000001', password: 'Jeren-2026', locale: 'tk');
      expect(auth.user!.name, 'Jeren');
      await expectLater(
        auth.register(name: 'X', phone: '+99361000001', password: 'Jeren-2026', locale: 'ru'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'phone_taken')),
      );
    });

    test('after a restart: restores the session, refreshes it and reloads the profile', () async {
      await auth.login(phone: '+99365123456', password: 'Bazar-2026');
      final restarted = server.auth(storage: storage);
      expect(restarted.restoring, isTrue);
      await restarted.restore();
      expect(restarted.signedIn, isTrue);
      expect(server.refreshCalls, 1);
      expect(server.paths.last, 'GET /me');
    });

    test('without internet the saved profile is shown and the session is kept', () async {
      await auth.login(phone: '+99365123456', password: 'Bazar-2026');
      server.offline = true;
      final restarted = server.auth(storage: storage);
      await restarted.restore();
      expect(restarted.signedIn, isTrue);
      expect(restarted.user!.name, 'Merdan');
      expect(storage.value, isNotNull);
    });

    test('a revoked session signs the phone out', () async {
      await auth.login(phone: '+99365123456', password: 'Bazar-2026');
      storage.value = SavedSession(refreshToken: 'ref-revoked', user: storage.value!.user);
      final restarted = server.auth(storage: storage);
      await restarted.restore();
      expect(restarted.signedIn, isFalse);
      expect(storage.value, isNull);
    });

    test('several requests with an expired token share one refresh', () async {
      await auth.login(phone: '+99365123456', password: 'Bazar-2026');
      server.expireAccessTokens();
      await Future.wait([auth.reloadProfile(), auth.reloadProfile(), auth.reloadProfile()]);
      expect(server.refreshCalls, 1);
      expect(auth.signedIn, isTrue);
    });

    test('sign-out works offline too', () async {
      await auth.login(phone: '+99365123456', password: 'Bazar-2026');
      server.offline = true;
      await auth.logout();
      expect(auth.signedIn, isFalse);
      expect(storage.value, isNull);
    });

    test('sign-out tells the server to forget this phone', () async {
      await auth.login(phone: '+99365123456', password: 'Bazar-2026');
      await auth.logout();
      expect(server.logoutCalls, 1);
    });

    test('an invite code turns the buyer into a seller with a shop', () async {
      server.validInvite = 'ABCDEFGHJK';
      await auth.login(phone: '+99365123456', password: 'Bazar-2026');
      await expectLater(auth.redeemInvite('XXXX-XXXX-XX'), throwsA(isA<ApiException>().having((e) => e.code, 'code', 'invite_invalid')));
      await auth.redeemInvite('abcd-efgh-jk');
      expect(auth.user!.role, UserRole.seller);
      expect(auth.user!.shop!.name, 'Täze Dükan');
      expect(storage.value!.user['role'], 'seller');
    });

    test('changing a temporary password clears the "must change" flag', () async {
      server.addUser('+99362000000', 'temp-pass-1', mustChangePassword: true);
      await auth.login(phone: '+99362000000', password: 'temp-pass-1');
      expect(auth.user!.mustChangePassword, isTrue);
      await expectLater(auth.changePassword(current: 'wrong-one', next: 'New-pass-2026'), throwsA(isA<ApiException>()));
      await auth.changePassword(current: 'temp-pass-1', next: 'New-pass-2026');
      expect(auth.user!.mustChangePassword, isFalse);
    });
  });
}
