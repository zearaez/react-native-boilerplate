export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse' | 'unknown';

export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'BAD_REQUEST'
  | 'UNKNOWN_HTTP_ERROR'
  | 'UNKNOWN_ERROR';

export type ApiError = {
  kind: ApiErrorKind;
  code: ApiErrorCode;
  status?: number;

  /**
   * Stable key intended for i18n mapping (do not display server messages directly).
   * Examples: `errors.network`, `errors.unauthorized`.
   */
  messageKey: string;

  /**
   * Optional machine-readable server error code, if the backend provides one.
   */
  serverCode?: string;

  /**
   * Extra details for debugging/telemetry. Avoid showing this to users.
   */
  details?: unknown;

  /**
   * Only set in development to help debugging.
   */
  debugMessage?: string;
};
