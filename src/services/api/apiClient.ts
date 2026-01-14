import type { ApiError } from '../../types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type QueryValue = string | number | boolean | null | undefined;

type ApiClientConfig = {
  baseUrl: string;

  /**
   * Path to refresh the session cookie. Default: `/auth/refresh`.
   */
  refreshPath?: string;

  /**
   * Method used for refresh. Default: `POST`.
   */
  refreshMethod?: Exclude<HttpMethod, 'GET'>;

  /**
   * CSRF settings. If enabled, the client will fetch a token on-demand
   * and attach it to mutating requests.
   */
  csrf?: {
    tokenPath: string;
    headerName?: string;
  };

  defaultHeaders?: Record<string, string>;

  /**
   * Default request timeout. Can be overridden per request.
   */
  timeoutMs?: number;

  /**
   * Overrideable for tests.
   */
  fetchImpl?: typeof fetch;
};

type ApiRequestOptions<TBody> = {
  method: HttpMethod;
  path: string;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  body?: TBody;
  signal?: AbortSignal;
  timeoutMs?: number;

  /**
   * Set to false to skip refresh-retry behavior for a request.
   */
  retryOnUnauthorized?: boolean;

  /**
   * Force CSRF header behavior.
   * - `true`: ensure token and attach header
   * - `false`: do not attach header
   * - `undefined`: attach for mutating methods
   */
  requiresCsrf?: boolean;
};

type ApiResponse<T> = {
  status: number;
  headers: Headers;
  data: T;
};

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, QueryValue>,
) {
  const normalizedBaseUrl = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!query) {
    return `${normalizedBaseUrl}${normalizedPath}`;
  }

  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  }

  if (parts.length === 0) {
    return `${normalizedBaseUrl}${normalizedPath}`;
  }

  return `${normalizedBaseUrl}${normalizedPath}?${parts.join('&')}`;
}

function isMutatingMethod(method: HttpMethod) {
  return (
    method === 'POST' ||
    method === 'PUT' ||
    method === 'PATCH' ||
    method === 'DELETE'
  );
}

function normalizeHttpError(status: number, details?: unknown): ApiError {
  if (status === 401) {
    return {
      kind: 'http',
      code: 'UNAUTHORIZED',
      status,
      messageKey: 'errors.unauthorized',
      details,
    };
  }

  if (status === 403) {
    return {
      kind: 'http',
      code: 'FORBIDDEN',
      status,
      messageKey: 'errors.forbidden',
      details,
    };
  }

  if (status === 404) {
    return {
      kind: 'http',
      code: 'NOT_FOUND',
      status,
      messageKey: 'errors.notFound',
      details,
    };
  }

  if (status >= 500) {
    return {
      kind: 'http',
      code: 'SERVER_ERROR',
      status,
      messageKey: 'errors.server',
      details,
    };
  }

  if (status === 400) {
    return {
      kind: 'http',
      code: 'BAD_REQUEST',
      status,
      messageKey: 'errors.badRequest',
      details,
    };
  }

  return {
    kind: 'http',
    code: 'UNKNOWN_HTTP_ERROR',
    status,
    messageKey: 'errors.http',
    details,
  };
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (response.status === 204) return undefined;

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      throw {
        kind: 'parse',
        code: 'UNKNOWN_ERROR',
        messageKey: 'errors.parse',
        details: error,
      } satisfies ApiError;
    }
  }

  try {
    return await response.text();
  } catch (error) {
    throw {
      kind: 'unknown',
      code: 'UNKNOWN_ERROR',
      messageKey: 'errors.unknown',
      details: error,
    } satisfies ApiError;
  }
}

function getCsrfTokenFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const candidate = body as Record<string, unknown>;

  const csrfToken = candidate.csrfToken;
  if (typeof csrfToken === 'string' && csrfToken.length > 0) return csrfToken;

  const csrf = candidate.csrf;
  if (typeof csrf === 'string' && csrf.length > 0) return csrf;

  return undefined;
}

function safeDebugMessage(error: unknown): string | undefined {
  if (!__DEV__) return undefined;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return undefined;
  }
}

export function createApiClient(config: ApiClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const refreshPath = config.refreshPath ?? '/auth/refresh';
  const refreshMethod = config.refreshMethod ?? 'POST';

  const csrfHeaderName = config.csrf?.headerName ?? 'X-CSRF-Token';
  const csrfTokenPath = config.csrf?.tokenPath;

  let csrfToken: string | undefined;
  let csrfTokenPromise: Promise<string | undefined> | undefined;
  let refreshPromise: Promise<void> | undefined;

  async function ensureCsrfToken(): Promise<string | undefined> {
    if (!csrfTokenPath) return undefined;
    if (csrfToken) return csrfToken;

    if (!csrfTokenPromise) {
      csrfTokenPromise = (async () => {
        const url = buildUrl(config.baseUrl, csrfTokenPath);

        let response: Response;
        try {
          response = await fetchImpl(url, {
            method: 'GET',
            headers: {
              ...(config.defaultHeaders ?? {}),
            },
            // Cookie-based sessions
            credentials: 'include',
          });
        } catch (error) {
          const apiError: ApiError = {
            kind: 'network',
            code: 'NETWORK_ERROR',
            messageKey: 'errors.network',
            details: error,
            debugMessage: safeDebugMessage(error),
          };
          throw apiError;
        }

        const body = await parseResponseBody(response);

        const headerToken = response.headers.get(csrfHeaderName);
        const bodyToken = getCsrfTokenFromBody(body);

        const token = headerToken ?? bodyToken;
        if (typeof token === 'string' && token.length > 0) {
          csrfToken = token;
          return token;
        }

        return undefined;
      })().finally(() => {
        csrfTokenPromise = undefined;
      });
    }

    return csrfTokenPromise;
  }

  async function refreshSession(): Promise<void> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      const url = buildUrl(config.baseUrl, refreshPath);

      const headers: Record<string, string> = {
        ...(config.defaultHeaders ?? {}),
      };

      // If we have a CSRF token already, attach it (some backends require it).
      if (csrfToken) {
        headers[csrfHeaderName] = csrfToken;
      }

      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: refreshMethod,
          headers,
          credentials: 'include',
        });
      } catch (error) {
        const apiError: ApiError = {
          kind: 'network',
          code: 'NETWORK_ERROR',
          messageKey: 'errors.network',
          details: error,
          debugMessage: safeDebugMessage(error),
        };
        throw apiError;
      }

      // Refresh should be treated as success only on 2xx.
      if (!response.ok) {
        const body = await parseResponseBody(response);
        throw normalizeHttpError(response.status, body);
      }

      // Some backends rotate CSRF token on refresh; try to capture if present.
      const rotated = response.headers.get(csrfHeaderName);
      if (rotated && rotated.length > 0) {
        csrfToken = rotated;
      }
    })().finally(() => {
      refreshPromise = undefined;
    });

    return refreshPromise;
  }

  async function rawRequest<TResponse, TBody>(
    options: ApiRequestOptions<TBody>,
    retryAttempted: boolean,
  ): Promise<ApiResponse<TResponse>> {
    const url = buildUrl(config.baseUrl, options.path, options.query);

    const timeoutMs = options.timeoutMs ?? config.timeoutMs;
    const controller = timeoutMs ? new AbortController() : undefined;
    const timeoutId = timeoutMs
      ? setTimeout(() => {
          controller?.abort();
        }, timeoutMs)
      : undefined;

    const signal = options.signal;
    const combinedSignal = controller?.signal ?? signal;

    const headers: Record<string, string> = {
      ...(config.defaultHeaders ?? {}),
      ...(options.headers ?? {}),
    };

    const shouldAttachCsrf =
      options.requiresCsrf ?? (isMutatingMethod(options.method) ? true : false);

    if (shouldAttachCsrf) {
      const token = await ensureCsrfToken();
      if (token) headers[csrfHeaderName] = token;
    }

    // Default JSON behavior if a body is provided.
    let body: unknown | undefined;
    if (options.body !== undefined) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      body =
        headers['Content-Type'].includes('application/json') &&
        typeof options.body !== 'string'
          ? JSON.stringify(options.body)
          : options.body;
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: options.method,
        headers,
        body: body as never,
        signal: combinedSignal,
        credentials: 'include',
      });
    } catch (error) {
      if (timeoutMs && controller?.signal.aborted) {
        const apiError: ApiError = {
          kind: 'timeout',
          code: 'TIMEOUT',
          messageKey: 'errors.timeout',
          details: error,
          debugMessage: safeDebugMessage(error),
        };
        throw apiError;
      }

      const apiError: ApiError = {
        kind: 'network',
        code: 'NETWORK_ERROR',
        messageKey: 'errors.network',
        details: error,
        debugMessage: safeDebugMessage(error),
      };
      throw apiError;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const responseBody = await parseResponseBody(response);

    // Capture token if backend provides it opportunistically.
    const maybeCsrf = response.headers.get(csrfHeaderName);
    if (maybeCsrf && maybeCsrf.length > 0) {
      csrfToken = maybeCsrf;
    }

    if (!response.ok) {
      const isRefreshRequest = options.path === refreshPath;
      const canRefresh =
        options.retryOnUnauthorized !== false &&
        response.status === 401 &&
        !retryAttempted &&
        !isRefreshRequest;

      if (canRefresh) {
        await refreshSession();
        return rawRequest<TResponse, TBody>(options, true);
      }

      const error = normalizeHttpError(response.status, responseBody);

      // Best-effort extraction of backend error code without leaking messages.
      if (responseBody && typeof responseBody === 'object') {
        const record = responseBody as Record<string, unknown>;
        if (typeof record.code === 'string') {
          error.serverCode = record.code;
        }
      }

      throw error;
    }

    return {
      status: response.status,
      headers: response.headers,
      data: responseBody as TResponse,
    };
  }

  async function request<TResponse, TBody = unknown>(
    options: ApiRequestOptions<TBody>,
  ): Promise<TResponse> {
    const response = await rawRequest<TResponse, TBody>(options, false);
    return response.data;
  }

  return {
    request,
    get: <TResponse>(
      path: string,
      options?: Omit<ApiRequestOptions<never>, 'method' | 'path' | 'body'>,
    ) => request<TResponse>({ method: 'GET', path, ...(options ?? {}) }),
    post: <TResponse, TBody>(
      path: string,
      body: TBody,
      options?: Omit<ApiRequestOptions<TBody>, 'method' | 'path' | 'body'>,
    ) =>
      request<TResponse, TBody>({
        method: 'POST',
        path,
        body,
        ...(options ?? {}),
      }),
    put: <TResponse, TBody>(
      path: string,
      body: TBody,
      options?: Omit<ApiRequestOptions<TBody>, 'method' | 'path' | 'body'>,
    ) =>
      request<TResponse, TBody>({
        method: 'PUT',
        path,
        body,
        ...(options ?? {}),
      }),
    patch: <TResponse, TBody>(
      path: string,
      body: TBody,
      options?: Omit<ApiRequestOptions<TBody>, 'method' | 'path' | 'body'>,
    ) =>
      request<TResponse, TBody>({
        method: 'PATCH',
        path,
        body,
        ...(options ?? {}),
      }),
    delete: <TResponse>(
      path: string,
      options?: Omit<ApiRequestOptions<never>, 'method' | 'path' | 'body'>,
    ) => request<TResponse>({ method: 'DELETE', path, ...(options ?? {}) }),
  };
}

export type { ApiClientConfig, ApiRequestOptions, ApiResponse, HttpMethod };
