import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/api/api_client.dart';
import 'core/auth/google_auth.dart';
import 'core/auth/session_storage.dart';
import 'core/settings/app_settings.dart';
import 'data/auth_store.dart';

/// Set at build time, e.g. `flutter build apk --dart-define=API_BASE_URL=https://api.example.com/api/v1`.
/// Empty: the demo build without a server.
const apiBaseUrl = String.fromEnvironment('API_BASE_URL');

/// OAuth "web" client id that our server accepts for Google sign-in. Empty: Google sign-in is hidden.
const googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final auth = AuthStore(
    api: ApiClient(baseUrl: apiBaseUrl),
    storage: apiBaseUrl.isEmpty ? MemorySessionStorage() : SecureSessionStorage(),
    google: PluginGoogleAuth(googleServerClientId),
  );
  runApp(BazarApp(settings: AppSettings(prefs), auth: auth));
}
