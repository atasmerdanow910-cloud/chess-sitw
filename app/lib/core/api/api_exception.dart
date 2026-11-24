/// Error from the server (with a stable `code`) or a network problem.
class ApiException implements Exception {
  const ApiException(this.code, {this.status, this.details});

  /// e.g. "invalid_credentials", "out_of_stock", "network".
  final String code;
  final int? status;
  final Map<String, dynamic>? details;

  bool get isNetwork => code == 'network' || code == 'timeout';

  @override
  String toString() => 'ApiException($status, $code)';
}
