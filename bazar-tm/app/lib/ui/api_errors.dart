import '../core/api/api_client.dart';
import '../core/auth/google_auth.dart';
import '../l10n/app_localizations.dart';

/// The user's language text for a server or network error. Unknown codes get a general message.
String errorText(AppLocalizations l, Object error) {
  if (error is GoogleUnavailable) return l.errGoogleUnavailable;
  if (error is! ApiException) return l.errUnknown;
  return switch (error.code) {
    'invalid_credentials' => l.errInvalidCredentials,
    'phone_taken' => l.errPhoneTaken,
    'weak_password' => l.errWeakPassword,
    'too_many_attempts' => l.errTooManyAttempts,
    'too_many_requests' => l.errTooManyRequests,
    'account_blocked' => l.errAccountBlocked,
    'google_unavailable' || 'invalid_google_token' => l.errGoogleUnavailable,
    'invite_invalid' => l.errInviteInvalid,
    'already_seller' => l.errAlreadySeller,
    'wrong_password' => l.errWrongPassword,
    'session_expired' || 'invalid_refresh' || 'unauthorized' => l.errSessionExpired,
    'network' => l.errNetwork,
    'not_configured' => l.serverNotConnected,
    _ => l.errUnknown,
  };
}
