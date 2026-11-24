/// Build-time settings. Pass with --dart-define when building:
///   flutter build apk --dart-define=API_URLS=https://api.example.tm,https://api2.example.com
abstract final class AppConfig {
  /// One or more server addresses, comma separated. If the first one is
  /// unreachable (e.g. blocked), the app automatically tries the next one.
  static const String _apiUrls = String.fromEnvironment(
    'API_URLS',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static List<String> get apiUrls {
    final urls = _apiUrls
        .split(',')
        .map((s) => s.trim().replaceAll(RegExp(r'/+$'), ''))
        .where((s) => s.isNotEmpty)
        .toList();
    return urls.isEmpty ? const ['http://10.0.2.2:3000'] : urls;
  }

  /// Google "Web client ID" used to get an ID token for the server.
  /// Empty = the Google button is hidden (phone + password still works).
  static const String googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

  static bool get googleEnabled => googleServerClientId.isNotEmpty;

  static const String appVersion = '1.0.0';
}
