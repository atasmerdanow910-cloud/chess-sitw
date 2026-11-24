import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../data/models.dart';
import '../api/api_exception.dart';
import '../config/app_config.dart';
import '../providers.dart';
import '../settings/settings_controller.dart';

/// Who is logged in (null = guest). The user is also cached on the phone,
/// so the app opens even without internet.
class AuthController extends AsyncNotifier<AppUser?> {
  static const _cacheKey = 'auth.user_cache';

  @override
  Future<AppUser?> build() async {
    final tokens = ref.read(tokenStoreProvider);
    if (!await tokens.hasSession) return null;
    try {
      final user = await ref.read(authApiProvider).me();
      _cache(user);
      return user;
    } on ApiException catch (e) {
      if (e.isNetwork) return _cached(); // offline: keep the user logged in
      if (e.status == 401 || e.status == 403) {
        await tokens.clear();
        return null;
      }
      return _cached();
    }
  }

  AppUser? _cached() {
    final raw = ref.read(sharedPreferencesProvider).getString(_cacheKey);
    if (raw == null) return null;
    try {
      return AppUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  void _cache(AppUser? user) {
    final prefs = ref.read(sharedPreferencesProvider);
    if (user == null) {
      prefs.remove(_cacheKey);
    } else {
      prefs.setString(_cacheKey, jsonEncode(user.toJson()));
    }
  }

  Future<void> _afterLogin(Map<String, dynamic> tokens) async {
    await ref.read(tokenStoreProvider).save(tokens['accessToken'] as String, tokens['refreshToken'] as String);
    final user = await ref.read(authApiProvider).me();
    _cache(user);
    state = AsyncData(user);
  }

  String get _locale => ref.read(settingsProvider).locale.languageCode;

  Future<void> login(String phone, String password) async =>
      _afterLogin(await ref.read(authApiProvider).login(phone, password));

  Future<void> register(String name, String phone, String password) async =>
      _afterLogin(await ref.read(authApiProvider).register(name, phone, password, _locale));

  /// Google login. If Google is blocked/unavailable an ApiException('google_unavailable') is thrown
  /// and the screen suggests phone + password.
  Future<void> loginWithGoogle() async {
    if (!AppConfig.googleEnabled) throw const ApiException('google_disabled');
    String? idToken;
    try {
      final google = GoogleSignIn.instance;
      await google.initialize(serverClientId: AppConfig.googleServerClientId);
      final account = await google.authenticate();
      idToken = account.authentication.idToken;
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) throw const ApiException('cancelled');
      throw const ApiException('google_unavailable');
    } catch (_) {
      throw const ApiException('google_unavailable');
    }
    if (idToken == null) throw const ApiException('google_unavailable');
    await _afterLogin(await ref.read(authApiProvider).google(idToken, _locale));
  }

  Future<void> logout() async {
    final tokens = ref.read(tokenStoreProvider);
    final refresh = await tokens.refreshToken;
    if (refresh != null) {
      await ref.read(authApiProvider).logout(refresh).catchError((_) {});
    }
    await tokens.clear();
    _cache(null);
    state = const AsyncData(null);
  }

  void onSessionExpired() {
    _cache(null);
    state = const AsyncData(null);
  }

  Future<void> reload() async {
    final user = await ref.read(authApiProvider).me();
    _cache(user);
    state = AsyncData(user);
  }

  Future<void> claimInvite(String code) async {
    await ref.read(authApiProvider).claimInvite(code);
    await reload();
  }

  Future<void> updateProfile({String? name, String? phone}) async {
    final user = await ref.read(authApiProvider).updateMe(name: name, phone: phone);
    _cache(user);
    state = AsyncData(user);
  }
}

final authProvider = AsyncNotifierProvider<AuthController, AppUser?>(AuthController.new);

/// Current user or null, without loading states.
final currentUserProvider = Provider<AppUser?>((ref) => ref.watch(authProvider).value);
