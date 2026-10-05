import { beforeEach, describe, expect, it } from 'vitest'
import { resetShimState } from '../setup'
import { useBuilding } from '~/composables/useBuilding'

beforeEach(() => {
  resetShimState()
})

// pendingOpeningType — вторая половина того, что Builder.vue сбрасывает на
// каждое переключение 2D/3D (см. activateSelectTool() -> watch(viewMode, ...),
// задание "ИСПРАВИТЬ UX BUILDER В РЕЖИМЕ 3D"). Сам watch — template-уровень
// Builder.vue, недоступен без mount; здесь проверяется гарантия, на которую
// он полагается: cancelPlacingOpening() реально возвращает pendingOpeningType
// в null, откуда бы его ни вызвали.
describe('useBuilding — pendingOpeningType (door/window placement mode, reset when leaving 2D edit tools)', () => {
  it('starts null (no pending opening)', () => {
    const { pendingOpeningType } = useBuilding()
    expect(pendingOpeningType.value).toBeNull()
  })

  it('beginPlacingOpening("door") sets it, cancelPlacingOpening() clears it', () => {
    const { pendingOpeningType, beginPlacingOpening, cancelPlacingOpening } = useBuilding()
    beginPlacingOpening('door')
    expect(pendingOpeningType.value).toBe('door')
    cancelPlacingOpening()
    expect(pendingOpeningType.value).toBeNull()
  })

  it('beginPlacingOpening("window") sets it, cancelPlacingOpening() clears it', () => {
    const { pendingOpeningType, beginPlacingOpening, cancelPlacingOpening } = useBuilding()
    beginPlacingOpening('window')
    expect(pendingOpeningType.value).toBe('window')
    cancelPlacingOpening()
    expect(pendingOpeningType.value).toBeNull()
  })

  it('cancelPlacingOpening() is a safe no-op when nothing is pending (e.g. already in Select)', () => {
    const { pendingOpeningType, cancelPlacingOpening } = useBuilding()
    expect(pendingOpeningType.value).toBeNull()
    cancelPlacingOpening()
    expect(pendingOpeningType.value).toBeNull()
  })
})
