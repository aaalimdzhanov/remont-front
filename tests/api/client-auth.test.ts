import { beforeEach, describe, expect, it, vi } from 'vitest'

// client.ts хранит accessToken/refreshPromise/authFailureListener как
// module-level state — как и в остальных подобных тестах, изолируем их между
// тестами через vi.resetModules() + динамический re-import, а не полагаемся
// на то, что предыдущий тест оставил чистое состояние.
const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)

let apiFetch: typeof import('~/api/client')['apiFetch']
let accessToken: typeof import('~/api/client')['accessToken']
let setAuthFailureListener: typeof import('~/api/client')['setAuthFailureListener']

beforeEach(async () => {
  vi.resetModules()
  fetchMock.mockReset()
  const client = await import('~/api/client')
  apiFetch = client.apiFetch
  accessToken = client.accessToken
  setAuthFailureListener = client.setAuthFailureListener
})

function httpError(status: number, data?: unknown) {
  return { response: { status, _data: data } }
}

describe('apiFetch — Authorization header', () => {
  it('sends no Authorization header when there is no access token', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    await apiFetch('/api/v1/projects')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/projects', expect.objectContaining({ headers: {} }))
  })

  it('sends Authorization: Bearer <token> once an access token is set', async () => {
    accessToken.value = 'abc123'
    fetchMock.mockResolvedValueOnce({ ok: true })
    await apiFetch('/api/v1/projects')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/projects', expect.objectContaining({
      headers: { Authorization: 'Bearer abc123' },
    }))
  })

  it('never attaches Authorization for auth:false requests, even with a token set', async () => {
    accessToken.value = 'abc123'
    fetchMock.mockResolvedValueOnce(undefined)
    await apiFetch('/api/v1/auth/sms/send', { method: 'POST', auth: false, body: { phone: '+998901234567', purpose: 'register' } })
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/sms/send', expect.objectContaining({ headers: {} }))
  })

  it('every request includes credentials: include (cookie support)', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    await apiFetch('/api/v1/projects')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/projects', expect.objectContaining({ credentials: 'include' }))
  })
})

describe('apiFetch — 401 refresh + retry', () => {
  it('7. a 401 triggers exactly one refresh call, then retries the original request once', async () => {
    accessToken.value = 'expired'
    fetchMock
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValueOnce({ access_token: 'fresh', token_type: 'Bearer', expires_in: 900 })
      .mockResolvedValueOnce({ ok: true })

    const result = await apiFetch<{ ok: boolean }>('/api/v1/projects')

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/v1/auth/refresh')
    expect(accessToken.value).toBe('fresh')
  })

  it('8. a 401 whose refresh also fails clears the token and surfaces one error, without looping', async () => {
    accessToken.value = 'expired'
    fetchMock
      .mockRejectedValueOnce(httpError(401))
      .mockRejectedValueOnce(httpError(401)) // refresh itself fails

    await expect(apiFetch('/api/v1/projects')).rejects.toMatchObject({ code: 'session_expired' })
    expect(fetchMock).toHaveBeenCalledTimes(2) // no retry attempt, no loop
    expect(accessToken.value).toBeNull()
  })

  it('a failed refresh notifies the registered auth-failure listener', async () => {
    const listener = vi.fn()
    setAuthFailureListener(listener)
    accessToken.value = 'expired'
    fetchMock.mockRejectedValueOnce(httpError(401)).mockRejectedValueOnce(httpError(401))

    await expect(apiFetch('/api/v1/projects')).rejects.toBeTruthy()

    expect(listener).toHaveBeenCalledOnce()
  })

  it('9. concurrent requests that both hit 401 share a single refresh call', async () => {
    accessToken.value = 'expired'
    let resolveRefresh!: (value: unknown) => void
    fetchMock
      .mockRejectedValueOnce(httpError(401)) // request A, first attempt
      .mockRejectedValueOnce(httpError(401)) // request B, first attempt
      .mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve })) // the one refresh call
      .mockResolvedValueOnce({ ok: 'A' }) // A retry
      .mockResolvedValueOnce({ ok: 'B' }) // B retry

    const pA = apiFetch('/api/v1/projects/a')
    const pB = apiFetch('/api/v1/projects/b')

    resolveRefresh({ access_token: 'fresh2', token_type: 'Bearer', expires_in: 900 })
    const [a, b] = await Promise.all([pA, pB])

    expect(a).toEqual({ ok: 'A' })
    expect(b).toEqual({ ok: 'B' })
    // 2 первых попытки + РОВНО 1 refresh + 2 повтора — не 2 refresh-запроса.
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(fetchMock.mock.calls.filter(call => call[0] === '/api/v1/auth/refresh')).toHaveLength(1)
  })

  it('a non-401 error is never retried and never triggers a refresh', async () => {
    accessToken.value = 'valid'
    fetchMock.mockRejectedValueOnce(httpError(500, { error: { code: 'internal_error', message: 'boom' } }))

    await expect(apiFetch('/api/v1/projects')).rejects.toMatchObject({ code: 'internal_error' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
