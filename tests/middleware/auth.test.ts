import { beforeEach, describe, expect, it, vi } from 'vitest'

// Middleware-файлы — обычные функции (defineNuxtRouteMiddleware в рантайме —
// identity-хелпер), поэтому тестируются напрямую, без монтирования роутера.
const navigateToMock = vi.fn()
const useAuthMock = vi.fn()

vi.stubGlobal('defineNuxtRouteMiddleware', (fn: unknown) => fn)
vi.stubGlobal('navigateTo', (...args: unknown[]) => navigateToMock(...args))
vi.stubGlobal('useAuth', () => useAuthMock())

type MiddlewareFn = (to: unknown, from: unknown) => unknown

beforeEach(() => {
  navigateToMock.mockReset()
  useAuthMock.mockReset()
  navigateToMock.mockImplementation((path: string) => `REDIRECT:${path}`)
})

describe('auth middleware', () => {
  it('10. authenticated → allows navigation (no redirect)', async () => {
    useAuthMock.mockReturnValue({
      isInitialized: { value: true },
      isAuthenticated: { value: true },
      initialize: vi.fn(),
    })
    const middleware = (await import('~/middleware/auth')).default as MiddlewareFn

    const result = await middleware({}, {})

    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('11. unauthenticated → redirects to /auth/login', async () => {
    useAuthMock.mockReturnValue({
      isInitialized: { value: true },
      isAuthenticated: { value: false },
      initialize: vi.fn(),
    })
    const middleware = (await import('~/middleware/auth')).default as MiddlewareFn

    const result = await middleware({}, {})

    expect(navigateToMock).toHaveBeenCalledWith('/auth/login')
    expect(result).toBe('REDIRECT:/auth/login')
  })

  it('awaits initialize() before deciding, when not yet initialized', async () => {
    let resolveInit!: () => void
    const initialize = vi.fn().mockReturnValue(new Promise<void>((resolve) => { resolveInit = resolve }))
    const authState = { isInitialized: { value: false }, isAuthenticated: { value: false }, initialize }
    useAuthMock.mockReturnValue(authState)
    const middleware = (await import('~/middleware/auth')).default as MiddlewareFn

    const pending = middleware({}, {})
    // Пока initialize() не разрешился, middleware не должен был ещё решить редиректить.
    expect(navigateToMock).not.toHaveBeenCalled()

    authState.isAuthenticated.value = true // как если бы initialize() успешно восстановил сессию
    resolveInit()
    await pending

    expect(initialize).toHaveBeenCalledOnce()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
