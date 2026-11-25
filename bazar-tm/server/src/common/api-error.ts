import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error with a stable machine-readable code. The app shows its own Russian/Turkmen text
 * for each code, so messages here are for developers only and never contain personal data.
 */
export type ErrorCode =
  | 'validation_failed'
  | 'unauthorized'
  | 'session_expired'
  | 'forbidden'
  | 'not_found'
  | 'invalid_credentials'
  | 'account_blocked'
  | 'phone_taken'
  | 'weak_password'
  | 'wrong_password'
  | 'too_many_requests'
  | 'too_many_attempts'
  | 'google_unavailable'
  | 'invalid_google_token'
  | 'invalid_refresh'
  | 'invite_invalid'
  | 'already_seller'
  | 'cannot_change_owner';

export class ApiError extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: HttpStatus,
    message: string = code,
    extra: Record<string, unknown> = {},
  ) {
    super({ statusCode: status, error: code, message, ...extra }, status);
  }
}

export const errors = {
  unauthorized: () => new ApiError('unauthorized', HttpStatus.UNAUTHORIZED, 'Sign in required'),
  sessionExpired: () => new ApiError('session_expired', HttpStatus.UNAUTHORIZED, 'Session expired or revoked'),
  forbidden: () => new ApiError('forbidden', HttpStatus.FORBIDDEN, 'Not allowed for this account'),
  notFound: (what = 'Resource') => new ApiError('not_found', HttpStatus.NOT_FOUND, `${what} not found`),
  blocked: () => new ApiError('account_blocked', HttpStatus.FORBIDDEN, 'Account is blocked'),
};
