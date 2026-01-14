import { createApiClient } from '../apiClient';

describe('createApiClient', () => {
  test('retries once after 401 via single-flight refresh', async () => {
    const fetchMock = jest
      .fn()
      // First request to protected endpoint => 401
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'SESSION_EXPIRED' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      )
      // Refresh endpoint => 200
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      // Retried original request => 200
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    const api = createApiClient({
      baseUrl: 'https://example.test',
      refreshPath: '/auth/refresh',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await api.get<{ ok: boolean }>('/protected');
    expect(result).toEqual({ ok: true });

    // 1 (401) + 1 (refresh) + 1 (retry)
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const refreshCall = fetchMock.mock.calls[1];
    expect(refreshCall[0]).toBe('https://example.test/auth/refresh');
  });

  test('deduplicates concurrent refresh calls (single-flight)', async () => {
    let refreshResolve: (() => void) | undefined;

    const refreshResponse = new Promise<Response>(resolve => {
      refreshResolve = () => resolve(new Response('', { status: 200 }));
    });

    const fetchMock = jest
      .fn()
      // Request A => 401
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'SESSION_EXPIRED' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      )
      // Request B => 401
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'SESSION_EXPIRED' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      )
      // Refresh (shared) => pending
      .mockImplementationOnce(() => refreshResponse)
      // Retry A => 200
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      // Retry B => 200
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    const api = createApiClient({
      baseUrl: 'https://example.test',
      refreshPath: '/auth/refresh',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const promiseA = api.get<{ ok: boolean }>('/protected');
    const promiseB = api.get<{ ok: boolean }>('/protected');

    // Let both initial 401 responses be processed before resolving refresh.
    await Promise.resolve();
    refreshResolve?.();

    const [resultA, resultB] = await Promise.all([promiseA, promiseB]);
    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);

    // Two initial requests + one refresh + two retries
    expect(fetchMock).toHaveBeenCalledTimes(5);

    const refreshCalls = fetchMock.mock.calls.filter(
      call => call[0] === 'https://example.test/auth/refresh',
    );
    expect(refreshCalls).toHaveLength(1);
  });
});
