import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/api.dart';
import 'api/api_client.dart';
import 'auth/auth_controller.dart';
import 'auth/token_store.dart';
import 'settings/settings_controller.dart';

/// Replaced in tests.
final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    tokens: ref.watch(tokenStoreProvider),
    prefs: ref.watch(sharedPreferencesProvider),
    // Refresh token is no longer valid: show the app as logged out.
    onSessionExpired: () => ref.read(authProvider.notifier).onSessionExpired(),
  );
});

final catalogApiProvider = Provider((ref) => CatalogApi(ref.watch(apiClientProvider)));
final authApiProvider = Provider((ref) => AuthApi(ref.watch(apiClientProvider)));
final ordersApiProvider = Provider((ref) => OrdersApi(ref.watch(apiClientProvider)));
final chatApiProvider = Provider((ref) => ChatApi(ref.watch(apiClientProvider)));
final meApiProvider = Provider((ref) => MeApi(ref.watch(apiClientProvider)));
final sellerApiProvider = Provider((ref) => SellerApi(ref.watch(apiClientProvider)));
final adminApiProvider = Provider((ref) => AdminApi(ref.watch(apiClientProvider)));
