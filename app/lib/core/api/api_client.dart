import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../auth/token_store.dart';
import '../config/app_config.dart';
import 'api_exception.dart';

/// HTTP client for the Kerwen Market API.
///
/// - adds the login token to every request;
/// - when the token expired, refreshes it once and repeats the request;
/// - if a server address is unreachable, switches to the next one (see AppConfig.apiUrls);
/// - turns every error into [ApiException] with a stable code.
class ApiClient {
  ApiClient({
    required this.tokens,
    required this.prefs,
    required this.onSessionExpired,
    List<String>? baseUrls,
    HttpClientAdapter? adapter,
  }) : _urls = baseUrls ?? AppConfig.apiUrls {
    _index = (prefs.getInt(_indexKey) ?? 0) % _urls.length;
    dio = Dio(
      BaseOptions(
        baseUrl: '$serverUrl/api/v1',
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 120),
        headers: {'Accept': 'application/json'},
      ),
    );
    if (adapter != null) dio.httpClientAdapter = adapter;
  }

  final TokenStore tokens;
  final SharedPreferences prefs;
  final void Function() onSessionExpired;
  final List<String> _urls;
  late final Dio dio;
  late int _index;
  Future<bool>? _refreshing;

  static const _indexKey = 'api.server_index';

  /// Current server, e.g. "https://api.kerwen.tm".
  String get serverUrl => _urls[_index];

  /// Full URL for a server path like "/api/v1/media/..." (image links).
  String absolute(String path) => path.startsWith('http') ? path : '$serverUrl$path';

  void _switchServer() {
    if (_urls.length < 2) return;
    _index = (_index + 1) % _urls.length;
    prefs.setInt(_indexKey, _index);
    dio.options.baseUrl = '$serverUrl/api/v1';
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) =>
      _send((o) => dio.get<dynamic>(path, queryParameters: _clean(query), options: o));

  Future<dynamic> post(String path, {Object? body, bool auth = true}) =>
      _send((o) => dio.post<dynamic>(path, data: body, options: o), auth: auth);

  Future<dynamic> patch(String path, {Object? body}) =>
      _send((o) => dio.patch<dynamic>(path, data: body, options: o));

  Future<dynamic> put(String path, {Object? body}) =>
      _send((o) => dio.put<dynamic>(path, data: body, options: o));

  Future<dynamic> delete(String path) => _send((o) => dio.delete<dynamic>(path, options: o));

  /// Uploads a file (photo/video/voice). Returns the server's media JSON.
  Future<Map<String, dynamic>> upload(String filePath, String purpose,
      {void Function(int sent, int total)? onProgress}) async {
    final data = await _send(
      (o) async => dio.post<dynamic>(
        '/media',
        queryParameters: {'purpose': purpose},
        data: FormData.fromMap({'file': await MultipartFile.fromFile(filePath)}),
        options: o,
        onSendProgress: onProgress,
      ),
    );
    return Map<String, dynamic>.from(data as Map);
  }

  static Map<String, dynamic>? _clean(Map<String, dynamic>? q) =>
      q == null ? null : (Map.of(q)..removeWhere((_, v) => v == null || v == ''));

  Future<dynamic> _send(
    Future<Response<dynamic>> Function(Options options) request, {
    bool auth = true,
  }) async {
    var switchedServer = false;
    var refreshed = false;
    while (true) {
      final token = auth ? await tokens.accessToken : null;
      final options = Options(headers: {if (token != null) 'Authorization': 'Bearer $token'});
      try {
        final res = await request(options);
        return res.data;
      } on DioException catch (e) {
        final status = e.response?.statusCode;
        final isNetwork = status == null &&
            (e.type == DioExceptionType.connectionError ||
                e.type == DioExceptionType.connectionTimeout ||
                e.error is SocketException);
        if (isNetwork && !switchedServer && _urls.length > 1) {
          switchedServer = true;
          _switchServer();
          continue;
        }
        if (status == 401 && auth && token != null && !refreshed) {
          refreshed = true;
          if (await refreshSession()) continue;
        }
        throw _toApiException(e);
      }
    }
  }

  /// Gets a new access token with the refresh token. Only one refresh runs at a time.
  Future<bool> refreshSession() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<bool> _doRefresh() async {
    final refresh = await tokens.refreshToken;
    if (refresh == null) return false;
    try {
      final res = await dio.post<dynamic>('/auth/refresh', data: {'refreshToken': refresh});
      final body = res.data as Map;
      await tokens.save(body['accessToken'] as String, body['refreshToken'] as String);
      return true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await tokens.clear();
        onSessionExpired();
      }
      return false;
    }
  }

  static ApiException _toApiException(DioException e) {
    final res = e.response;
    if (res == null) {
      final timeout = e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionTimeout;
      return ApiException(timeout ? 'timeout' : 'network');
    }
    final data = res.data;
    if (data is Map && data['code'] is String) {
      return ApiException(
        data['code'] as String,
        status: res.statusCode,
        details: data['details'] is Map ? Map<String, dynamic>.from(data['details'] as Map) : null,
      );
    }
    if (res.statusCode == 429) return ApiException('too_many_requests', status: res.statusCode);
    return ApiException('http_${res.statusCode}', status: res.statusCode);
  }
}
