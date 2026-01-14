import { createApiClient } from './apiClient';

/**
 * Temporary API base URL.
 *
 * Phase 5 will formalize env configuration; for now keep this centralized.
 */
const API_BASE_URL = 'http://localhost:3000';

export const appApi = createApiClient({
  baseUrl: API_BASE_URL,

  // Cookie-based refresh endpoint (can be overridden per backend).
  refreshPath: '/auth/refresh',

  // CSRF enabled (token endpoint may vary per backend).
  csrf: {
    tokenPath: '/csrf',
    headerName: 'X-CSRF-Token',
  },

  defaultHeaders: {
    Accept: 'application/json',
  },

  timeoutMs: 15000,
});
