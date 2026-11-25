import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

/// Gets a Google ID token for our server. Throws [GoogleUnavailable] when Google can't be used
/// on this phone (no Google services, blocked network, not configured): the app then offers phone sign-in.
abstract class GoogleAuth {
  bool get available;
  Future<String> idToken();
  Future<void> signOut();
}

class GoogleUnavailable implements Exception {
  const GoogleUnavailable([this.cancelled = false]);

  /// The user closed the Google window: no error message needed.
  final bool cancelled;
}

class PluginGoogleAuth implements GoogleAuth {
  PluginGoogleAuth(this.serverClientId);

  /// OAuth "web" client id of our server (GOOGLE_SERVER_CLIENT_ID at build time). Empty: Google is off.
  final String serverClientId;
  Future<void>? _init;

  @override
  bool get available => serverClientId.isNotEmpty && !kIsWeb;

  @override
  Future<String> idToken() async {
    if (!available) throw const GoogleUnavailable();
    try {
      _init ??= GoogleSignIn.instance.initialize(serverClientId: serverClientId);
      await _init;
      if (!GoogleSignIn.instance.supportsAuthenticate()) throw const GoogleUnavailable();
      final account = await GoogleSignIn.instance.authenticate();
      final token = account.authentication.idToken;
      if (token == null) throw const GoogleUnavailable();
      return token;
    } on GoogleSignInException catch (e) {
      throw GoogleUnavailable(e.code == GoogleSignInExceptionCode.canceled);
    } on GoogleUnavailable {
      rethrow;
    } catch (_) {
      throw const GoogleUnavailable();
    }
  }

  @override
  Future<void> signOut() async {
    if (!available || _init == null) return;
    try {
      await GoogleSignIn.instance.signOut();
    } catch (_) {}
  }
}
