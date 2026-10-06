import { describe, expect, it } from 'vitest'
import { clearGuestWorksStorage, loadGuestWorksFromStorage, saveGuestWorksToStorage } from '~/utils/guestWorkDraft'
import type { GuestWorkItem } from '~/composables/useGuestWorkBuilder'

// Тот же паттерн, что tests/utils/builderDraft.test.ts: под Vitest
// (environment:'node') нет window/localStorage — все storage-функции обязаны
// тихо no-op'ать/возвращать null, а не бросать.
describe('guestWorkDraft storage functions — safe outside a browser client context', () => {
  it('loadGuestWorksFromStorage returns null under Vitest (no window/localStorage) instead of throwing', () => {
    expect(loadGuestWorksFromStorage()).toBeNull()
  })

  it('saveGuestWorksToStorage / clearGuestWorksStorage do not throw when window is absent', () => {
    const items: GuestWorkItem[] = [
      { id: 'guest-work-001', workTypeId: 'wt-1', roomId: 'room-001', quantity: 38.4, unit: 'm2', quantityMode: 'automatic' },
    ]
    expect(() => saveGuestWorksToStorage(items)).not.toThrow()
    expect(() => clearGuestWorksStorage()).not.toThrow()
  })
})
