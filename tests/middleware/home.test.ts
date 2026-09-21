import { beforeEach, describe, expect, it, vi } from 'vitest'

// Same pattern as auth.test.ts/guest.test.ts — middleware is a plain
// function (defineNuxtRouteMiddleware is an identity stub at runtime), so
// it's tested directly without @vue/test-utils/mounting a page.
const navigateToMock = vi.fn()
const useAuthMock = vi.fn()

vi.stubGlobal('defineNuxtRouteMiddleware', (fn: unknown) => fn)
vi.stubGlobal('navigateTo', (...args: unknown[]) => navigateToMock(...args))
vi.stubGlobal('useAuth', () => useAuthMock())

type MiddlewareFn = (to: unknown, from: unknown) => unknown

beforeEach(() => {
  navigateToMock.mockReset()
  useAuthMock.mockReset()
  navigateToMock.mockImplementation((path: string, opts?: unknown) => `REDIRECT:${path}:${JSON.stringify(opts)}`)
})

describe('home middleware (/ -> /marketplace)', () => {
  it('always redirects to /marketplace with replace:true, regardless of auth state', async () => {
    const middleware = (await import('~/middleware/home')).default as MiddlewareFn

    const result = await middleware({}, {})

    expect(navigateToMock).toHaveBeenCalledWith('/marketplace', { replace: true })
    expect(result).toBe('REDIRECT:/marketplace:{"replace":true}')
  })

  it('never calls useAuth — the redirect requires no auth check at all (guest/client/contractor alike)', async () => {
    const middleware = (await import('~/middleware/home')).default as MiddlewareFn

    await middleware({}, {})

    expect(useAuthMock).not.toHaveBeenCalled()
  })
})
