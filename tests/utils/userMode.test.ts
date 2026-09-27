import { describe, expect, it } from 'vitest'
import { getUserModeNavItems, readStoredUserMode, shouldShowContractorOnboarding } from '~/utils/userMode'

describe('readStoredUserMode — safe outside a browser client context', () => {
  it('returns null under Vitest (import.meta.client is falsy, no window/localStorage) instead of throwing', () => {
    expect(readStoredUserMode()).toBeNull()
  })
})

describe('getUserModeNavItems — 6. client / 7. contractor navigation (only real existing routes)', () => {
  it('client mode: Проекты + Биржа + Заказы + Отзывы, all real routes', () => {
    const items = getUserModeNavItems('client')
    expect(items.map(i => i.to)).toEqual(['/projects', '/marketplace', '/orders', '/reviews'])
    expect(items.map(i => i.labelKey)).toEqual(['navigation.projects', 'navigation.marketplace', 'navigation.orders', 'navigation.reviews'])
  })

  it('contractor mode: Заявки/Предложения/Заказы/Услуги/Отзывы, matching real marketplace/contractor/orders/reviews routes', () => {
    const items = getUserModeNavItems('contractor')
    expect(items.map(i => i.to)).toEqual(['/marketplace', '/marketplace/offers', '/orders', '/marketplace/contractor', '/reviews'])
    expect(items.map(i => i.labelKey)).toEqual(['navigation.requests', 'navigation.offers', 'navigation.orders', 'navigation.services', 'navigation.reviews'])
  })

  it('never points at invented /client/* or /contractor/* routes (см. задание, секция ROUTING)', () => {
    const allTargets = [...getUserModeNavItems('client'), ...getUserModeNavItems('contractor')].map(i => i.to)
    for (const to of allTargets) {
      expect(to.startsWith('/client')).toBe(false)
      expect(to.startsWith('/contractor')).toBe(false)
    }
  })
})

describe('shouldShowContractorOnboarding — 7. profile exists / 8. 404 → onboarding (mode is NOT a security boundary)', () => {
  it('shows onboarding only when mode is contractor AND the profile is confirmed absent (null, not undefined)', () => {
    expect(shouldShowContractorOnboarding('contractor', null)).toBe(true)
  })

  it('does not show onboarding while the profile check is still in flight (undefined)', () => {
    expect(shouldShowContractorOnboarding('contractor', undefined)).toBe(false)
  })

  it('does not show onboarding once a real profile exists', () => {
    const contractor = { id: 'c1', name: 'Азиз', description: '', phone: '+998901234567', status: 'active', createdAt: 'c', updatedAt: 'c' }
    expect(shouldShowContractorOnboarding('contractor', contractor)).toBe(false)
  })

  it('never shows the contractor onboarding while in client mode, regardless of profile state', () => {
    expect(shouldShowContractorOnboarding('client', null)).toBe(false)
    expect(shouldShowContractorOnboarding('client', undefined)).toBe(false)
  })
})
