import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetShimState } from '../setup'

const authApi = {
  sendSMS: vi.fn(),
  registerVerify: vi.fn(),
  loginVerify: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
}
vi.mock('~/api/auth', () => authApi)

// useAuth.ts (через client.ts) хранит accessToken/authFailureListener/
// initializePromise как module-level state — изолируем между тестами так
// же, как и в остальном тестовом наборе: vi.resetModules() + динамический
// re-import.
let useAuth: typeof import('~/composables/useAuth')['useAuth']

beforeEach(async () => {
  vi.resetModules()
  resetShimState()
  vi.clearAllMocks()
  ;({ useAuth } = await import('~/composables/useAuth'))
})

function makeUser(overrides: Record<string, unknown> = {}) {
  return { id: 'u1', phone: '+998901234567', createdAt: 'c', updatedAt: 'u', ...overrides }
}

function session(token: string) {
  return { accessToken: token, tokenType: 'Bearer', expiresIn: 900 }
}

describe('useAuth', () => {
  it('1. initial state: not authenticated, not initialized, no user/error', () => {
    const { isAuthenticated, isInitialized, user, isLoading, error } = useAuth()
    expect(isAuthenticated.value).toBe(false)
    expect(isInitialized.value).toBe(false)
    expect(user.value).toBeNull()
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('2. successful refresh + me → authenticated, initialized, user/token set', async () => {
    authApi.refresh.mockResolvedValueOnce(session('tok1'))
    authApi.me.mockResolvedValueOnce(makeUser())
    const { initialize, isAuthenticated, isInitialized, user, accessToken } = useAuth()

    await initialize()

    expect(isInitialized.value).toBe(true)
    expect(isAuthenticated.value).toBe(true)
    expect(user.value?.id).toBe('u1')
    expect(accessToken.value).toBe('tok1')
  })

  it('3. failed refresh → initialized, not authenticated, NOT treated as an app error', async () => {
    authApi.refresh.mockRejectedValueOnce({ status: 401, code: 'refresh_token_invalid', message: 'x' })
    const { initialize, isAuthenticated, isInitialized, error, accessToken } = useAuth()

    await initialize()

    expect(isInitialized.value).toBe(true)
    expect(isAuthenticated.value).toBe(false)
    expect(error.value).toBeNull() // отсутствие сессии — нормальное состояние
    expect(accessToken.value).toBeNull()
  })

  it('refresh succeeds but /me fails → still treated as unauthenticated (no partial state)', async () => {
    authApi.refresh.mockResolvedValueOnce(session('tok-partial'))
    authApi.me.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    const { initialize, isAuthenticated, user } = useAuth()

    await initialize()

    expect(isAuthenticated.value).toBe(false)
    expect(user.value).toBeNull()
  })

  it('4. successful login sets user/token/isInitialized', async () => {
    authApi.loginVerify.mockResolvedValueOnce(session('tok2'))
    authApi.me.mockResolvedValueOnce(makeUser())
    const { login, isAuthenticated, isInitialized, accessToken } = useAuth()

    const ok = await login('+998901234567', '123456')

    expect(ok).toBe(true)
    expect(isAuthenticated.value).toBe(true)
    expect(isInitialized.value).toBe(true)
    expect(accessToken.value).toBe('tok2')
  })

  it('5. successful registration sets user/token/isInitialized', async () => {
    authApi.registerVerify.mockResolvedValueOnce(session('tok3'))
    authApi.me.mockResolvedValueOnce(makeUser())
    const { register, isAuthenticated, isInitialized } = useAuth()

    const ok = await register('+998901234567', '123456')

    expect(ok).toBe(true)
    expect(isAuthenticated.value).toBe(true)
    expect(isInitialized.value).toBe(true)
  })

  it('login failure (invalid code) surfaces the ApiError and stays unauthenticated', async () => {
    authApi.loginVerify.mockRejectedValueOnce({ status: 400, code: 'invalid_verification_code', message: 'Invalid verification code' })
    const { login, isAuthenticated, error } = useAuth()

    const ok = await login('+998901234567', '000000')

    expect(ok).toBe(false)
    expect(isAuthenticated.value).toBe(false)
    expect(error.value?.code).toBe('invalid_verification_code')
  })

  it('registration failure (user already exists) surfaces the ApiError', async () => {
    authApi.registerVerify.mockRejectedValueOnce({ status: 409, code: 'user_already_exists', message: 'User already exists' })
    const { register, error } = useAuth()

    const ok = await register('+998901234567', '123456')

    expect(ok).toBe(false)
    expect(error.value?.code).toBe('user_already_exists')
  })

  it('6. logout clears user/token/error even if the backend call fails', async () => {
    authApi.loginVerify.mockResolvedValueOnce(session('tok4'))
    authApi.me.mockResolvedValueOnce(makeUser())
    const { login, logout, isAuthenticated, accessToken } = useAuth()
    await login('+998901234567', '123456')

    authApi.logout.mockRejectedValueOnce(new Error('network down'))
    await logout()

    expect(isAuthenticated.value).toBe(false)
    expect(accessToken.value).toBeNull()
  })

  it('concurrent initialize() calls are single-flight: one refresh + one /me pair', async () => {
    let resolveRefresh!: (value: unknown) => void
    authApi.refresh.mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve }))
    authApi.me.mockResolvedValueOnce(makeUser())
    const { initialize } = useAuth()

    const p1 = initialize()
    const p2 = initialize()
    resolveRefresh(session('tok5'))
    await Promise.all([p1, p2])

    expect(authApi.refresh).toHaveBeenCalledTimes(1)
    expect(authApi.me).toHaveBeenCalledTimes(1)
  })

  it('initialize() is a no-op once already initialized', async () => {
    authApi.refresh.mockResolvedValueOnce(session('tok6'))
    authApi.me.mockResolvedValueOnce(makeUser())
    const { initialize } = useAuth()
    await initialize()

    await initialize() // второй вызов не должен снова дёргать backend

    expect(authApi.refresh).toHaveBeenCalledTimes(1)
  })

  it('15. isLoading toggles true during sendSMS then back to false', async () => {
    let resolveSend!: () => void
    authApi.sendSMS.mockReturnValueOnce(new Promise<void>((resolve) => { resolveSend = resolve }))
    const { sendSMS, isLoading } = useAuth()

    const p = sendSMS('+998901234567', 'register')
    expect(isLoading.value).toBe(true)
    resolveSend()
    await p

    expect(isLoading.value).toBe(false)
  })

  it('sendSMS surfaces a cooldown error without changing auth state', async () => {
    authApi.sendSMS.mockRejectedValueOnce({ status: 429, code: 'sms_cooldown_active', message: 'Please wait before requesting another code' })
    const { sendSMS, error, isAuthenticated } = useAuth()

    const ok = await sendSMS('+998901234567', 'register')

    expect(ok).toBe(false)
    expect(error.value?.code).toBe('sms_cooldown_active')
    expect(isAuthenticated.value).toBe(false)
  })
})
