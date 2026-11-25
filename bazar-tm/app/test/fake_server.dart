import 'dart:convert';

import 'package:bazar_tm/core/api/api_client.dart';
import 'package:bazar_tm/core/auth/session_storage.dart';
import 'package:bazar_tm/data/auth_store.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'helpers.dart';

/// A small stand-in for the Bazar TM API, enough for the app's sign-in flows.
/// It answers with the same JSON and error codes as the real server (see server/test).
class FakeServer {
  final Map<String, Map<String, dynamic>> _users = {}; // phone → user json
  final Map<String, String> _passwords = {}; // phone → password
  final Map<String, String> _refresh = {}; // refresh token → phone
  final Map<String, String> _access = {}; // access token → phone
  int _counter = 0;

  bool offline = false;
  int refreshCalls = 0;
  int logoutCalls = 0;
  String? validInvite;
  final List<String> paths = [];

  static const baseUrl = 'https://api.test/api/v1';

  late final http.Client client = MockClient(_handle);

  AuthStore auth({SessionStorage? storage}) => AuthStore(
    api: ApiClient(baseUrl: baseUrl, httpClient: client),
    storage: storage ?? MemorySessionStorage(),
    google: NoGoogle(),
  );

  void addUser(String phone, String password, {String name = 'Aýna', String role = 'buyer', bool mustChangePassword = false}) {
    _users[phone] = {
      'id': 'u${_users.length + 1}',
      'role': role,
      'name': name,
      'phone': phone,
      'email': null,
      'locale': 'ru',
      'hasPassword': true,
      'googleLinked': false,
      'mustChangePassword': mustChangePassword,
      'shop': role == 'seller'
          ? {
              'id': 's-1',
              'name': 'Ak Ýol Trade — elektronika we telefonlar',
              'status': 'active',
              'subscriptionUntil': '2030-01-31T00:00:00.000Z',
            }
          : null,
    };
    _passwords[phone] = password;
  }

  /// Makes every issued access token expire, as after 15 minutes.
  void expireAccessTokens() => _access.clear();

  Map<String, dynamic> _tokens(String phone) {
    _counter++;
    final access = 'acc-$_counter';
    final refresh = 'ref-$_counter';
    _access[access] = phone;
    _refresh[refresh] = phone;
    return {'accessToken': access, 'accessExpiresIn': 900, 'refreshToken': refresh, 'refreshExpiresAt': '2030-01-01T00:00:00.000Z'};
  }

  http.Response _json(int status, Map<String, dynamic> body) =>
      http.Response.bytes(utf8.encode(jsonEncode(body)), status, headers: {'content-type': 'application/json; charset=utf-8'});

  http.Response _error(int status, String code) => _json(status, {'statusCode': status, 'error': code, 'message': code});

  Future<http.Response> _handle(http.Request r) async {
    if (offline) throw http.ClientException('offline');
    final path = r.url.path.replaceFirst('/api/v1', '');
    paths.add('${r.method} $path');
    final body = r.body.isEmpty ? <String, dynamic>{} : jsonDecode(r.body) as Map<String, dynamic>;
    final bearer = r.headers['Authorization']?.replaceFirst('Bearer ', '');
    final me = bearer == null ? null : _access[bearer];

    switch ((r.method, path)) {
      case ('POST', '/auth/register'):
        final phone = (body['phone'] as String).replaceAll(' ', '');
        if (_users.containsKey(phone)) return _error(409, 'phone_taken');
        if ((body['password'] as String).length < 8) return _error(400, 'weak_password');
        addUser(phone, body['password'] as String, name: body['name'] as String);
        return _json(201, {'user': _users[phone], 'tokens': _tokens(phone)});
      case ('POST', '/auth/login'):
        final phone = (body['phone'] as String).replaceAll(' ', '');
        if (_passwords[phone] != body['password']) return _error(401, 'invalid_credentials');
        return _json(200, {'user': _users[phone], 'tokens': _tokens(phone)});
      case ('POST', '/auth/refresh'):
        refreshCalls++;
        final phone = _refresh.remove(body['refreshToken']);
        if (phone == null) return _error(401, 'invalid_refresh');
        return _json(200, {'tokens': _tokens(phone)});
      case ('POST', '/auth/logout'):
        logoutCalls++;
        _refresh.remove(body['refreshToken']);
        return http.Response('', 204);
      case ('POST', '/auth/logout-all'):
        if (me == null) return _error(401, 'session_expired');
        _refresh.removeWhere((_, p) => p == me);
        _access.removeWhere((_, p) => p == me);
        return http.Response('', 204);
      case ('GET', '/me'):
        if (me == null) return _error(401, 'session_expired');
        return _json(200, _users[me]!);
      case ('PATCH', '/me'):
        if (me == null) return _error(401, 'session_expired');
        _users[me]!.addAll(body);
        return _json(200, _users[me]!);
      case ('POST', '/me/password'):
        if (me == null) return _error(401, 'session_expired');
        if (_users[me]!['hasPassword'] == true && body['currentPassword'] != _passwords[me]) return _error(400, 'wrong_password');
        _passwords[me] = body['newPassword'] as String;
        _users[me]!['mustChangePassword'] = false;
        return http.Response('', 204);
      case ('POST', '/invites/redeem'):
        if (me == null) return _error(401, 'session_expired');
        final code = (body['code'] as String).toUpperCase().replaceAll(RegExp('[^A-Z0-9]'), '');
        if (code != validInvite) return _error(400, 'invite_invalid');
        _users[me]!
          ..['role'] = 'seller'
          ..['shop'] = {
            'id': 's-new',
            'name': 'Täze Dükan',
            'status': 'active',
            'subscriptionUntil': DateTime.now().add(const Duration(days: 30)).toUtc().toIso8601String(),
          };
        return _json(200, _users[me]!);
    }
    return _error(404, 'not_found');
  }
}
