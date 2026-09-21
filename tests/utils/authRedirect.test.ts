import { describe, expect, it } from 'vitest'
import { resolveAuthRedirect } from '~/utils/authRedirect'

describe('resolveAuthRedirect', () => {
  it('accepts a plain internal path', () => {
    expect(resolveAuthRedirect('/marketplace/requests/r1')).toBe('/marketplace/requests/r1')
  })

  it('falls back when redirect is missing', () => {
    expect(resolveAuthRedirect(undefined)).toBe('/projects')
    expect(resolveAuthRedirect(null)).toBe('/projects')
  })

  it('falls back for a non-string value (e.g. duplicated query param)', () => {
    expect(resolveAuthRedirect(['/marketplace', '/orders'])).toBe('/projects')
  })

  it('falls back for an empty string', () => {
    expect(resolveAuthRedirect('')).toBe('/projects')
  })

  it('rejects protocol-relative paths (open redirect to another host)', () => {
    expect(resolveAuthRedirect('//evil.com')).toBe('/projects')
  })

  it('rejects absolute external URLs', () => {
    expect(resolveAuthRedirect('https://evil.com')).toBe('/projects')
    expect(resolveAuthRedirect('evil.com')).toBe('/projects')
  })

  it('honors a custom fallback', () => {
    expect(resolveAuthRedirect(undefined, '/marketplace')).toBe('/marketplace')
  })
})
