import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// What survives an app restart: the refresh token and the last known profile
/// (so the profile shows at once, even without internet).
class SavedSession {
  const SavedSession({required this.refreshToken, required this.user});

  final String refreshToken;
  final Map<String, dynamic> user;
}

abstract class SessionStorage {
  Future<SavedSession?> read();
  Future<void> write(SavedSession session);
  Future<void> clear();
}

/// Android Keystore / iOS Keychain. The access token is kept in memory only.
class SecureSessionStorage implements SessionStorage {
  SecureSessionStorage([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _key = 'bazar_session_v1';

  @override
  Future<SavedSession?> read() async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw == null) return null;
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return SavedSession(refreshToken: json['refreshToken'] as String, user: json['user'] as Map<String, dynamic>);
    } catch (_) {
      // Damaged or unreadable (for example after restoring a backup on another phone): sign in again.
      await clear();
      return null;
    }
  }

  @override
  Future<void> write(SavedSession session) =>
      _storage.write(key: _key, value: jsonEncode({'refreshToken': session.refreshToken, 'user': session.user}));

  @override
  Future<void> clear() async {
    try {
      await _storage.delete(key: _key);
    } catch (_) {}
  }
}

/// For tests and the demo build.
class MemorySessionStorage implements SessionStorage {
  SavedSession? value;

  @override
  Future<SavedSession?> read() async => value;

  @override
  Future<void> write(SavedSession session) async => value = session;

  @override
  Future<void> clear() async => value = null;
}
