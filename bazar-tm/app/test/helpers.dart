import 'package:bazar_tm/app.dart';
import 'package:bazar_tm/core/api/api_client.dart';
import 'package:bazar_tm/core/auth/google_auth.dart';
import 'package:bazar_tm/core/auth/session_storage.dart';
import 'package:bazar_tm/core/settings/app_settings.dart';
import 'package:bazar_tm/data/auth_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Phone-sized screen (390 × 844) so layouts are tested at a realistic width.
Future<void> pumpApp(WidgetTester tester, {Map<String, Object> prefs = const {}, AuthStore? auth}) async {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues(prefs);
  final settings = AppSettings(await SharedPreferences.getInstance());
  await tester.pumpWidget(BazarApp(settings: settings, auth: auth ?? demoAuth()));
  await tester.pumpAndSettle();
}

/// A tab of the seller panel (the same words also appear in the stat tiles).
Finder panelTab(String label) => find.descendant(of: find.byType(TabBar), matching: find.text(label));

Future<void> tapText(WidgetTester tester, String text) async {
  final finder = find.text(text);
  await tester.ensureVisible(finder.first);
  await tester.pumpAndSettle();
  await tester.tap(finder.first);
  await tester.pumpAndSettle();
}

/// Taps the app bar back arrow. (`tester.pageBack` looks for the English "Back" tooltip.)
Future<void> goBack(WidgetTester tester) async {
  await tester.tap(find.byType(BackButton).last);
  await tester.pumpAndSettle();
}

/// Demo build: no server address, sign-in shows "server not connected".
AuthStore demoAuth() => AuthStore(
  api: ApiClient(baseUrl: ''),
  storage: MemorySessionStorage(),
  google: NoGoogle(),
);

class NoGoogle implements GoogleAuth {
  @override
  bool get available => false;

  @override
  Future<String> idToken() async => throw const GoogleUnavailable();

  @override
  Future<void> signOut() async {}
}
