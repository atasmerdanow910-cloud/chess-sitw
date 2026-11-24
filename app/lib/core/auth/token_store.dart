import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Login tokens in the phone's secure storage (Android Keystore / iOS Keychain).
class TokenStore {
  TokenStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _accessKey = 'auth.access';
  static const _refreshKey = 'auth.refresh';

  String? _access;
  String? _refresh;
  bool _loaded = false;

  Future<void> _load() async {
    if (_loaded) return;
    _access = await _storage.read(key: _accessKey);
    _refresh = await _storage.read(key: _refreshKey);
    _loaded = true;
  }

  Future<String?> get accessToken async {
    await _load();
    return _access;
  }

  Future<String?> get refreshToken async {
    await _load();
    return _refresh;
  }

  Future<bool> get hasSession async => (await refreshToken) != null;

  Future<void> save(String access, String refresh) async {
    _access = access;
    _refresh = refresh;
    _loaded = true;
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  Future<void> clear() async {
    _access = null;
    _refresh = null;
    _loaded = true;
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}

/// In-memory store for tests.
class MemoryTokenStore extends TokenStore {
  MemoryTokenStore();

  String? _a;
  String? _r;

  @override
  Future<String?> get accessToken async => _a;
  @override
  Future<String?> get refreshToken async => _r;
  @override
  Future<void> save(String access, String refresh) async {
    _a = access;
    _r = refresh;
  }

  @override
  Future<void> clear() async {
    _a = null;
    _r = null;
  }
}
