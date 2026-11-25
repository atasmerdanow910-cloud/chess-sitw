import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// Error from the server or the network. [code] matches the server's error codes
/// (invalid_credentials, phone_taken, …) plus `network` and `not_configured` from the app itself.
class ApiException implements Exception {
  const ApiException(this.code, {this.status, this.retryAfterSeconds});

  final String code;
  final int? status;
  final int? retryAfterSeconds;

  bool get isNetwork => code == 'network';

  @override
  String toString() => 'ApiException($code, $status)';
}

/// Thin JSON client for the Bazar TM API.
/// Slow mobile internet: one timeout for every request, no silent retries of POSTs.
/// An expired access token is refreshed once through [onUnauthorized] and the request is repeated.
class ApiClient {
  ApiClient({required String baseUrl, http.Client? httpClient, this.timeout = const Duration(seconds: 20)})
    : baseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl,
      _http = httpClient ?? http.Client();

  /// For example https://api.example.com/api/v1. Empty in the demo build: there is no server yet.
  final String baseUrl;
  final Duration timeout;
  final http.Client _http;

  String? accessToken;

  /// Called when the server says the access token expired. Returns a new token, or null if signed out.
  Future<String?> Function()? onUnauthorized;

  bool get configured => baseUrl.isNotEmpty;

  Future<Map<String, dynamic>> get(String path) => _send('GET', path);

  Future<Map<String, dynamic>> post(String path, [Object? body, bool auth = true]) => _send('POST', path, body: body, auth: auth);

  Future<Map<String, dynamic>> patch(String path, Object body) => _send('PATCH', path, body: body);

  Future<Map<String, dynamic>> _send(String method, String path, {Object? body, bool auth = true, bool retried = false}) async {
    if (!configured) throw const ApiException('not_configured');
    final request = http.Request(method, Uri.parse('$baseUrl$path'))..headers['Accept'] = 'application/json';
    if (body != null) {
      request.headers['Content-Type'] = 'application/json; charset=utf-8';
      request.body = jsonEncode(body);
    }
    final token = accessToken;
    if (auth && token != null) request.headers['Authorization'] = 'Bearer $token';

    http.Response response;
    try {
      response = await http.Response.fromStream(await _http.send(request).timeout(timeout)).timeout(timeout);
    } on TimeoutException {
      throw const ApiException('network');
    } on http.ClientException {
      throw const ApiException('network');
    }

    final json = _decode(response);
    if (response.statusCode >= 200 && response.statusCode < 300) return json;

    final code = json['error'] is String ? json['error'] as String : 'unknown';
    final retryable = code == 'session_expired' || code == 'unauthorized';
    if (response.statusCode == 401 && auth && retryable && !retried && onUnauthorized != null) {
      final fresh = await onUnauthorized!();
      if (fresh != null) return _send(method, path, body: body, auth: auth, retried: true);
      throw const ApiException('session_expired', status: 401);
    }
    throw ApiException(code, status: response.statusCode, retryAfterSeconds: (json['retryAfterSeconds'] as num?)?.toInt());
  }

  Map<String, dynamic> _decode(http.Response response) {
    if (response.bodyBytes.isEmpty) return const {};
    try {
      final value = jsonDecode(utf8.decode(response.bodyBytes));
      return value is Map<String, dynamic> ? value : {'data': value};
    } on FormatException {
      // A proxy or captive portal answered with HTML instead of the API.
      if (response.statusCode >= 200 && response.statusCode < 300) throw const ApiException('unknown');
      return const {};
    }
  }

  void close() => _http.close();
}
