import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/api/api_exception.dart';
import 'core/settings/settings_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      // Retry only network problems (slow/unstable internet), not real errors like 404.
      retry: (count, error) {
        if (error is ApiException && error.isNetwork && count < 3) {
          return Duration(seconds: 2 * (count + 1));
        }
        return null;
      },
      child: const KerwenApp(),
    ),
  );
}
