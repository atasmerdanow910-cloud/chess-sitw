import 'package:material_ui/material_ui.dart';

import '../l10n/l10n.dart';
import 'api_exception.dart';

/// Human message (ru/tk) for any error.
String errorText(BuildContext context, Object error) {
  final l = context.l10n;
  if (error is! ApiException) return l.errGeneric;
  return switch (error.code) {
    'network' => l.errNetwork,
    'timeout' => l.errTimeout,
    'invalid_credentials' => l.errInvalidCredentials,
    'phone_taken' => l.errPhoneTaken,
    'invalid_phone' => l.errInvalidPhone,
    'account_locked' => l.errAccountLocked,
    'user_blocked' => l.errUserBlocked,
    'google_unavailable' => l.errGoogleUnavailable,
    'google_disabled' => l.errGoogleUnavailable,
    'google_token_invalid' => l.errGoogleUnavailable,
    'invite_invalid' => l.errInviteInvalid,
    'already_seller' => l.errAlreadySeller,
    'out_of_stock' => l.errOutOfStock,
    'product_unavailable' => l.errProductUnavailable,
    'shop_unavailable' => l.errShopUnavailable,
    'own_shop' => l.errOwnShop,
    'file_too_large' => l.errFileTooLarge,
    'file_type_not_allowed' || 'image_invalid' => l.errFileType,
    'product_limit_reached' => l.errProductLimit,
    'shop_blocked' => l.errShopBlocked,
    'wrong_password' => l.errWrongPassword,
    'too_many_requests' || 'upload_quota_exceeded' => l.errTooMany,
    'validation_failed' => l.errValidation,
    'order_cannot_cancel' || 'status_transition_invalid' => l.errStatusChanged,
    'review_exists' => l.errReviewExists,
    'not_found' || 'product_not_found' || 'shop_not_found' || 'order_not_found' || 'chat_not_found' => l.errNotFound,
    _ => l.errGeneric,
  };
}

void showError(BuildContext context, Object error) {
  if (error is ApiException && error.code == 'cancelled') return;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(errorText(context, error))));
}
