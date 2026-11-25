import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../core/api/api_client.dart';
import '../core/auth/google_auth.dart';
import '../core/auth/session_storage.dart';

enum UserRole { buyer, seller, owner }

class ShopInfo {
  const ShopInfo({required this.id, required this.name, required this.status, this.subscriptionUntil});

  factory ShopInfo.fromJson(Map<String, dynamic> json) => ShopInfo(
    id: json['id'] as String,
    name: json['name'] as String,
    status: json['status'] as String,
    subscriptionUntil: json['subscriptionUntil'] == null ? null : DateTime.parse(json['subscriptionUntil'] as String).toLocal(),
  );

  final String id;
  final String name;
  final String status;
  final DateTime? subscriptionUntil;
}

/// The signed-in user as the server describes it.
class AuthUser {
  const AuthUser({
    required this.id,
    required this.role,
    required this.name,
    this.phone,
    this.email,
    this.locale = 'ru',
    this.hasPassword = true,
    this.googleLinked = false,
    this.mustChangePassword = false,
    this.shop,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
    id: json['id'] as String,
    role: UserRole.values.firstWhere((r) => r.name == json['role'], orElse: () => UserRole.buyer),
    name: json['name'] as String,
    phone: json['phone'] as String?,
    email: json['email'] as String?,
    locale: (json['locale'] as String?) ?? 'ru',
    hasPassword: (json['hasPassword'] as bool?) ?? true,
    googleLinked: (json['googleLinked'] as bool?) ?? false,
    mustChangePassword: (json['mustChangePassword'] as bool?) ?? false,
    shop: json['shop'] == null ? null : ShopInfo.fromJson(json['shop'] as Map<String, dynamic>),
  );

  final String id;
  final UserRole role;
  final String name;
  final String? phone;
  final String? email;
  final String locale;
  final bool hasPassword;
  final bool googleLinked;
  final bool mustChangePassword;
  final ShopInfo? shop;
}

/// Sign-in state of the app. The access token lives in memory; the refresh token in secure storage.
/// Without internet the last known profile is shown and the session is kept for later.
class AuthStore extends ChangeNotifier {
  AuthStore({required this.api, required this.storage, required this.google}) {
    api.onUnauthorized = refreshAccess;
  }

  final ApiClient api;
  final SessionStorage storage;
  final GoogleAuth google;

  AuthUser? _user;
  Map<String, dynamic>? _userJson;
  bool _restoring = true;
  Future<String?>? _refreshing;

  AuthUser? get user => _user;
  bool get signedIn => _user != null;

  /// True until the saved session has been read at start-up.
  bool get restoring => _restoring;

  /// False in the demo build: no server address was given at build time.
  bool get serverConnected => api.configured;

  /// Reads the saved session at start-up and checks it with the server when possible.
  Future<void> restore() async {
    final saved = await storage.read();
    if (saved != null) _setUser(saved.user);
    _restoring = false;
    notifyListeners();
    if (saved == null || !api.configured) return;
    try {
      if (await refreshAccess() != null) await reloadProfile();
    } on ApiException catch (e) {
      // No internet: keep the session, it is checked again on the next request.
      if (!e.isNetwork) rethrow;
    }
  }

  Future<void> login({required String phone, required String password}) async {
    await _signIn(await api.post('/auth/login', {'phone': phone, 'password': password}, false));
  }

  Future<void> register({required String name, required String phone, required String password, required String locale}) async {
    await _signIn(await api.post('/auth/register', {'name': name, 'phone': phone, 'password': password, 'locale': locale}, false));
  }

  /// Throws [GoogleUnavailable] when Google can't be used; the screen then suggests phone sign-in.
  Future<void> loginWithGoogle({required String locale}) async {
    if (!api.configured) throw const ApiException('not_configured');
    final idToken = await google.idToken();
    await _signIn(await api.post('/auth/google', {'idToken': idToken, 'locale': locale}, false));
  }

  Future<void> reloadProfile() async {
    _setUser(await api.get('/me'));
    await _persist();
    notifyListeners();
  }

  Future<void> updateLocale(String locale) async {
    if (!signedIn || _user!.locale == locale || !api.configured) return;
    try {
      _setUser(await api.patch('/me', {'locale': locale}));
      await _persist();
    } on ApiException {
      // Not important enough to bother the user; the next change will try again.
    }
  }

  Future<void> changePassword({String? current, required String next}) async {
    await api.post('/me/password', {'currentPassword': ?current, 'newPassword': next});
    await reloadProfile();
  }

  /// Seller invite from the owner. On success the account becomes a seller with an open shop.
  Future<void> redeemInvite(String code) async {
    _setUser(await api.post('/invites/redeem', {'code': code}));
    await _persist();
    notifyListeners();
  }

  /// Signs out this phone. Works offline too: the local session is removed in any case.
  Future<void> logout() async {
    final saved = await storage.read();
    if (saved != null && api.configured) {
      try {
        await api.post('/auth/logout', {'refreshToken': saved.refreshToken}, false);
      } on ApiException {
        // The server forgets the session after 30 days anyway.
      }
    }
    await google.signOut();
    await _clear();
  }

  Future<void> logoutAll() async {
    await api.post('/auth/logout-all');
    await google.signOut();
    await _clear();
  }

  /// One refresh at a time: several requests that hit an expired token share it.
  Future<String?> refreshAccess() => _refreshing ??= _refresh().whenComplete(() => _refreshing = null);

  Future<String?> _refresh() async {
    final saved = await storage.read();
    if (saved == null) {
      await _clear();
      return null;
    }
    try {
      final res = await api.post('/auth/refresh', {'refreshToken': saved.refreshToken}, false);
      final tokens = res['tokens'] as Map<String, dynamic>;
      api.accessToken = tokens['accessToken'] as String;
      await storage.write(SavedSession(refreshToken: tokens['refreshToken'] as String, user: _userJson ?? saved.user));
      return api.accessToken;
    } on ApiException catch (e) {
      if (e.isNetwork) rethrow;
      // Revoked, expired, blocked: this phone has to sign in again.
      await _clear();
      return null;
    }
  }

  Future<void> _signIn(Map<String, dynamic> res) async {
    final tokens = res['tokens'] as Map<String, dynamic>;
    api.accessToken = tokens['accessToken'] as String;
    _setUser(res['user'] as Map<String, dynamic>);
    await storage.write(SavedSession(refreshToken: tokens['refreshToken'] as String, user: _userJson!));
    notifyListeners();
  }

  void _setUser(Map<String, dynamic> json) {
    _userJson = json;
    _user = AuthUser.fromJson(json);
  }

  Future<void> _persist() async {
    final saved = await storage.read();
    if (saved != null && _userJson != null) await storage.write(SavedSession(refreshToken: saved.refreshToken, user: _userJson!));
  }

  Future<void> _clear() async {
    api.accessToken = null;
    _user = null;
    _userJson = null;
    await storage.clear();
    notifyListeners();
  }
}
