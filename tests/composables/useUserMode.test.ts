import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetShimState } from '../setup'

// Мокаем только persistence-функции (read/write/clear), остальное (тип
// UserMode, getUserModeNavItems, shouldShowContractorOnboarding) остаётся
// настоящим — тот же паттерн частичного мока, что и в остальных тестах этого
// проекта (api-слой мокается, presentation-хелперы — нет).
const userModeStorage = {
  readStoredUserMode: vi.fn(),
  writeStoredUserMode: vi.fn(),
  clearStoredUserMode: vi.fn(),
}
vi.mock('~/utils/userMode', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils/userMode')>()
  return { ...actual, ...userModeStorage }
})

let useUserMode: typeof import('~/composables/useUserMode')['useUserMode']

beforeEach(async () => {
  vi.resetModules()
  resetShimState()
  vi.clearAllMocks()
  userModeStorage.readStoredUserMode.mockReturnValue(null)
  ;({ useUserMode } = await import('~/composables/useUserMode'))
})

describe('useUserMode', () => {
  it('1. default mode is "client" when nothing was persisted', () => {
    const { mode, isClient, isContractor } = useUserMode()
    expect(mode.value).toBe('client')
    expect(isClient.value).toBe(true)
    expect(isContractor.value).toBe(false)
  })

  it('2. setMode("client") updates mode and isClient/isContractor', () => {
    const { mode, setMode, isClient, isContractor } = useUserMode()
    setMode('contractor')
    setMode('client')
    expect(mode.value).toBe('client')
    expect(isClient.value).toBe(true)
    expect(isContractor.value).toBe(false)
  })

  it('3. setMode("contractor") updates mode and isClient/isContractor', () => {
    const { mode, setMode, isClient, isContractor } = useUserMode()
    setMode('contractor')
    expect(mode.value).toBe('contractor')
    expect(isClient.value).toBe(false)
    expect(isContractor.value).toBe(true)
  })

  it('setMode persists the chosen value via writeStoredUserMode (backing store for reload/tab-close, см. utils/userMode.ts)', () => {
    const { setMode } = useUserMode()
    setMode('contractor')
    expect(userModeStorage.writeStoredUserMode).toHaveBeenCalledWith('contractor')
    setMode('client')
    expect(userModeStorage.writeStoredUserMode).toHaveBeenCalledWith('client')
  })

  it('4. persistence: a freshly (re)created composable reads the previously stored mode — simulates state recreated after reload/new tab', async () => {
    userModeStorage.readStoredUserMode.mockReturnValue('contractor')
    vi.resetModules()
    resetShimState()
    ;({ useUserMode } = await import('~/composables/useUserMode'))

    const { mode } = useUserMode()

    expect(mode.value).toBe('contractor')
  })

  it('toggleMode flips between client and contractor', () => {
    const { mode, toggleMode } = useUserMode()
    expect(mode.value).toBe('client')
    toggleMode()
    expect(mode.value).toBe('contractor')
    toggleMode()
    expect(mode.value).toBe('client')
  })

  it('resetMode returns to "client" and clears the persisted value (см. задание, секция PERSISTENCE: "После logout mode можно сбрасывать в client")', () => {
    const { mode, setMode, resetMode } = useUserMode()
    setMode('contractor')

    resetMode()

    expect(mode.value).toBe('client')
    expect(userModeStorage.clearStoredUserMode).toHaveBeenCalledTimes(1)
  })

  it('mode is a single shared source of truth — a second useUserMode() call in the same app instance sees the same value', () => {
    const first = useUserMode()
    first.setMode('contractor')

    const second = useUserMode()

    expect(second.mode.value).toBe('contractor')
    expect(second.isContractor.value).toBe(true)
  })
})
