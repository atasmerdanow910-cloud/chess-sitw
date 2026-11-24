import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * API error with a stable machine-readable code.
 * The app shows a translated text for each code (ru/tk).
 */
export class ApiError extends HttpException {
  constructor(status: HttpStatus, code: string, details?: Record<string, unknown>) {
    super({ statusCode: status, code, ...(details ? { details } : {}) }, status);
  }
}

export const badRequest = (code: string, details?: Record<string, unknown>) =>
  new ApiError(HttpStatus.BAD_REQUEST, code, details);
export const unauthorized = (code = 'unauthorized') => new ApiError(HttpStatus.UNAUTHORIZED, code);
export const forbidden = (code = 'forbidden') => new ApiError(HttpStatus.FORBIDDEN, code);
/** Also used for resources that exist but belong to someone else (no IDOR leaks). */
export const notFound = (code = 'not_found') => new ApiError(HttpStatus.NOT_FOUND, code);
export const conflict = (code: string) => new ApiError(HttpStatus.CONFLICT, code);
