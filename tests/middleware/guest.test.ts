import { beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('guest middleware', () => {
  it('12. authenticated → redirects to /projects', async () => {
    useAuthMock.mockReturnValue({
      isInitialized: { value: true },
      isAuthenticated: { value: true },
      initialize: vi.fn(),
    })
    const middleware = (await import('~/middleware/guest')).default as MiddlewareFn

    const result = await middleware({}, {})

    expect(navigateToMock).toHaveBeenCalledWith('/projects')
    expect(result).toBe('REDIRECT:/projects')
  })

  it('unauthenticated → allows navigation (stays on /auth/login or /auth/register)', async () => {
    useAuthMock.mockReturnValue({
      isInitialized: { value: true },
      isAuthenticated: { value: false },
      initialize: vi.fn(),
    })
    const middleware = (await import('~/middleware/guest')).default as MiddlewareFn

    const result = await middleware({}, {})

    expect(result).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
