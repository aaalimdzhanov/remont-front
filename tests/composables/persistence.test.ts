import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetShimState } from '../setup'

// vi.mock с фабрикой хостится vitest'ом выше импортов — сам объект остаётся
// одним и тем же между vi.resetModules() (нужно нам ниже для изоляции
// module-level состояния persistence pipeline между тестами), только моки
// внутри него сбрасываются через vi.clearAllMocks().
const projectsApi = {
  getProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}
vi.mock('~/api/projects', () => projectsApi)

// useProjectPersistence.ts хранит debounce/race-защиту (таймеры,
// sessionToken, saveInFlight...) в module-level `let`, а не в useState —
// это осознанно (см. комментарий в файле), но значит, что между тестами их
// нужно изолировать через vi.resetModules() + динамический re-import, иначе
// один тест "утечёт" в другой через общий модульный instance.
let useBuilding: typeof import('~/composables/useBuilding')['useBuilding']
let useProjectPersistence: typeof import('~/composables/useProjectPersistence')['useProjectPersistence']
let AUTOSAVE_DEBOUNCE_MS: number

let windowListeners: Map<string, Set<(event: unknown) => void>>

beforeEach(async () => {
  vi.resetModules()
  resetShimState()
  vi.clearAllMocks()
  vi.useFakeTimers()

  windowListeners = new Map()
  vi.stubGlobal('window', {
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set())
      windowListeners.get(type)!.add(handler)
    },
    removeEventListener: (type: string, handler: (event: unknown) => void) => {
      windowListeners.get(type)?.delete(handler)
    },
  })

  const buildingModule = await import('~/composables/useBuilding')
  const persistenceModule = await import('~/composables/useProjectPersistence')
  useBuilding = buildingModule.useBuilding
  useProjectPersistence = persistenceModule.useProjectPersistence
  AUTOSAVE_DEBOUNCE_MS = persistenceModule.AUTOSAVE_DEBOUNCE_MS
})

afterEach(() => {
  vi.useRealTimers()
  // Не vi.unstubAllGlobals(): это стёрло бы и стабы из tests/setup.ts
  // (useState/computed/watch/useRuntimeConfig/...), которые регистрируются
  // один раз и не пересоздаются между тестами. window просто перезаписываем
  // заново в следующем beforeEach.
})

function resolvedProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'srv-1',
    name: 'Проект',
    status: 'draft',
    building: useBuilding().document.value,
    updatedAt: '2026-01-01T00:00:00Z',
    location: null,
    ...overrides,
  }
}

describe('dirty state', () => {
  it('1. initial load is clean', async () => {
    projectsApi.getProject.mockResolvedValueOnce(resolvedProject())
    const { loadProject, isDirty } = useProjectPersistence()
    await loadProject('srv-1')
    expect(isDirty.value).toBe(false)
  })

  it('2. a mutation marks the document dirty', () => {
    const { createBuilding } = useBuilding()
    const { isDirty } = useProjectPersistence()
    createBuilding(5, 5)
    expect(isDirty.value).toBe(true)
  })

  it('3. save success clears dirty', async () => {
    const { createBuilding } = useBuilding()
    const { save, projectId, isDirty } = useProjectPersistence()
    createBuilding(5, 5)
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockResolvedValueOnce(resolvedProject())
    await save()
    expect(isDirty.value).toBe(false)
  })

  it('4. save failure keeps dirty=true', async () => {
    const { createBuilding } = useBuilding()
    const { save, projectId, isDirty, error } = useProjectPersistence()
    createBuilding(5, 5)
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    const ok = await save()
    expect(ok).toBe(false)
    expect(isDirty.value).toBe(true)
    expect(error.value?.code).toBe('internal_error')
  })

  it('5. a mutation during an in-flight save leaves it dirty afterwards', async () => {
    const { createBuilding, resizeRoom, addRoom } = useBuilding()
    const { save, projectId, isDirty } = useProjectPersistence()
    createBuilding(10, 10)
    addRoom({ name: 'Комната', type: 'other', width: 3, length: 3 })
    projectId.value = 'srv-1'

    let resolveSave!: (value: unknown) => void
    projectsApi.updateProject.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve }))

    const savePromise = save()
    resizeRoom('room-001', 4, 4) // мутация ПОКА save ещё летит
    resolveSave(resolvedProject())
    await savePromise

    expect(isDirty.value).toBe(true) // revision ушла вперёд снимка, который реально сохранился
  })
})

describe('autosave', () => {
  it('6. a mutation schedules an autosave that fires after the debounce', async () => {
    const { createBuilding } = useBuilding()
    const { projectId } = useProjectPersistence()
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockResolvedValue(resolvedProject())

    createBuilding(5, 5)
    expect(projectsApi.updateProject).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)
    expect(projectsApi.updateProject).toHaveBeenCalledTimes(1)
  })

  it('7. multiple rapid mutations produce exactly one autosave', async () => {
    const { createBuilding, addRoom, resizeRoom } = useBuilding()
    const { projectId } = useProjectPersistence()
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockResolvedValue(resolvedProject())

    createBuilding(10, 10)
    addRoom({ name: 'Комната', type: 'other', width: 3, length: 3 })
    resizeRoom('room-001', 4, 4)
    resizeRoom('room-001', 5, 5)
    resizeRoom('room-001', 6, 6)

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)
    expect(projectsApi.updateProject).toHaveBeenCalledTimes(1)
  })

  it('8. manual save cancels the pending autosave debounce (no duplicate PUT)', async () => {
    const { createBuilding } = useBuilding()
    const { save, projectId } = useProjectPersistence()
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockResolvedValue(resolvedProject())

    createBuilding(5, 5) // планирует autosave через AUTOSAVE_DEBOUNCE_MS
    await save() // должен отменить debounce и сохранить немедленно

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS + 100)
    expect(projectsApi.updateProject).toHaveBeenCalledTimes(1)
  })

  it('9. save() is a no-op when nothing is dirty', async () => {
    const { createBuilding } = useBuilding()
    const { save, projectId } = useProjectPersistence()
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockResolvedValue(resolvedProject())

    createBuilding(5, 5)
    await save()
    expect(projectsApi.updateProject).toHaveBeenCalledTimes(1)

    const ok = await save() // ничего не изменилось со времени последнего save
    expect(ok).toBe(true)
    expect(projectsApi.updateProject).toHaveBeenCalledTimes(1) // не выросло
  })

  it('10. no autosave fires without a canonical projectId', async () => {
    const { createBuilding } = useBuilding()
    useProjectPersistence() // projectId остаётся null

    createBuilding(5, 5)
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS * 2)

    expect(projectsApi.updateProject).not.toHaveBeenCalled()
    expect(projectsApi.createProject).not.toHaveBeenCalled()
  })
})

describe('race conditions', () => {
  it('11. a mutation during an in-flight save schedules a fresh debounced autosave with the latest snapshot', async () => {
    const { createBuilding, addRoom, resizeRoom } = useBuilding()
    const { save, projectId } = useProjectPersistence()
    createBuilding(10, 10)
    addRoom({ name: 'Комната', type: 'other', width: 3, length: 3 })
    projectId.value = 'srv-1'

    let resolveFirst!: (value: unknown) => void
    projectsApi.updateProject.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
    projectsApi.updateProject.mockResolvedValueOnce(resolvedProject())

    const firstSave = save()
    resizeRoom('room-001', 4, 4) // новая mutation, пока первый save ещё летит — планирует свежий debounce
    resolveFirst(resolvedProject())
    await firstSave

    // Debounce от mutation выше ещё не истёк — даём ему время.
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)

    expect(projectsApi.updateProject).toHaveBeenCalledTimes(2)
    const secondInput = projectsApi.updateProject.mock.calls[1]![1] as { building: { building: { rooms: Array<{ geometry: { width: number } }> } } }
    expect(secondInput.building.building.rooms[0]!.geometry.width).toBe(4)
  })

  it('14. an explicit save() called while one is already in flight is queued and runs once the first finishes', async () => {
    const { createBuilding, addRoom, resizeRoom } = useBuilding()
    const { save, projectId } = useProjectPersistence()
    createBuilding(10, 10)
    addRoom({ name: 'Комната', type: 'other', width: 3, length: 3 })
    projectId.value = 'srv-1'

    let resolveFirst!: (value: unknown) => void
    projectsApi.updateProject.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
    projectsApi.updateProject.mockResolvedValueOnce(resolvedProject())

    const firstSave = save()
    resizeRoom('room-001', 4, 4) // делает документ снова "грязным" относительно снимка первого save
    const secondSaveQueued = await save() // должен встать в очередь (saveQueued), а не уйти вторым параллельным PUT
    expect(secondSaveQueued).toBe(false) // немедленный результат — "не выполнено сейчас", а не итог самого save
    expect(projectsApi.updateProject).toHaveBeenCalledTimes(1)

    resolveFirst(resolvedProject())
    await firstSave
    await Promise.resolve() // даём отработать fire-and-forget follow-up save() из finally-блока
    await Promise.resolve()

    expect(projectsApi.updateProject).toHaveBeenCalledTimes(2)
    const secondInput = projectsApi.updateProject.mock.calls[1]![1] as { building: { building: { rooms: Array<{ geometry: { width: number } }> } } }
    expect(secondInput.building.building.rooms[0]!.geometry.width).toBe(4)
  })

  it('12. a stale save completion after switching projects is ignored', async () => {
    const { createBuilding } = useBuilding()
    const { save, loadProject, projectId } = useProjectPersistence()
    createBuilding(5, 5)
    projectId.value = 'srv-1'

    let resolveStale!: (value: unknown) => void
    projectsApi.updateProject.mockReturnValueOnce(new Promise((resolve) => { resolveStale = resolve }))
    const staleSave = save() // save для srv-1, ещё не завершился

    projectsApi.getProject.mockResolvedValueOnce(resolvedProject({ id: 'srv-2', name: 'Другой проект' }))
    await loadProject('srv-2') // переключились на другой проект, пока save ещё летел

    resolveStale(resolvedProject({ id: 'srv-1', updatedAt: 'STALE' }))
    await staleSave

    expect(projectId.value).toBe('srv-2') // не перезаписано устаревшим ответом
  })

  it('13. two synchronous save() calls do not trigger two parallel PUTs', async () => {
    const { createBuilding } = useBuilding()
    const { save, projectId } = useProjectPersistence()
    createBuilding(5, 5)
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockReturnValue(new Promise(() => {})) // никогда не резолвится в этом тесте

    void save()
    void save()

    expect(projectsApi.updateProject).toHaveBeenCalledTimes(1)
  })

  it('20/21. a stale loadProject response does not overwrite a newer one', async () => {
    const { loadProject, projectId } = useProjectPersistence()

    let resolveA!: (value: unknown) => void
    projectsApi.getProject.mockReturnValueOnce(new Promise((resolve) => { resolveA = resolve }))
    const loadA = loadProject('A')

    projectsApi.getProject.mockResolvedValueOnce(resolvedProject({ id: 'B' }))
    const loadB = loadProject('B')

    resolveA(resolvedProject({ id: 'A' }))
    await Promise.all([loadA, loadB])

    expect(projectId.value).toBe('B')
  })
})

describe('errors', () => {
  it('15. a network error surfaces as a readable ApiError and keeps Building intact', async () => {
    const { createBuilding, document } = useBuilding()
    const { save, projectId, error } = useProjectPersistence()
    createBuilding(5, 5)
    projectId.value = 'srv-1'
    const before = JSON.stringify(document.value)
    projectsApi.updateProject.mockRejectedValueOnce({ status: 0, code: 'network_error', message: 'Не удалось подключиться к серверу.' })

    const ok = await save()

    expect(ok).toBe(false)
    expect(error.value?.code).toBe('network_error')
    expect(JSON.stringify(document.value)).toBe(before)
  })

  it('16. a backend API error (4xx/5xx) surfaces with its own code/message', async () => {
    const { createBuilding } = useBuilding()
    const { save, projectId, error } = useProjectPersistence()
    createBuilding(5, 5)
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockRejectedValueOnce({ status: 400, code: 'invalid_building', message: 'building.rooms[0].id: is required' })

    await save()

    expect(error.value?.code).toBe('invalid_building')
  })

  it('17. retry after a failed save succeeds and clears the error', async () => {
    const { createBuilding } = useBuilding()
    const { save, projectId, error, isDirty } = useProjectPersistence()
    createBuilding(5, 5)
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    await save()
    expect(error.value).not.toBeNull()

    projectsApi.updateProject.mockResolvedValueOnce(resolvedProject())
    const ok = await save()

    expect(ok).toBe(true)
    expect(error.value).toBeNull()
    expect(isDirty.value).toBe(false)
  })
})

describe('project creation (/projects/new)', () => {
  it('18a. createProject() posts to the backend, adopts the canonical id, and starts clean', async () => {
    const { createProject, projectId, isDirty, lastSavedAt } = useProjectPersistence()
    projectsApi.createProject.mockResolvedValueOnce(resolvedProject({ id: 'srv-new', name: 'Дом у моря', updatedAt: 'created-at' }))

    const id = await createProject({ name: 'Дом у моря', type: 'house' })

    expect(id).toBe('srv-new')
    expect(projectId.value).toBe('srv-new')
    expect(isDirty.value).toBe(false) // только что созданный проект уже "сохранён"
    expect(lastSavedAt.value).toBe('created-at')
    expect(projectsApi.createProject).toHaveBeenCalledTimes(1)
    const payload = projectsApi.createProject.mock.calls[0]![0] as { name: string, building: { building: { type: string } } }
    expect(payload.name).toBe('Дом у моря')
    expect(payload.building.building.type).toBe('house')
  })

  it('18b. a project created this way can immediately autosave via PUT (no POST on subsequent saves)', async () => {
    const { createProject } = useProjectPersistence()
    projectsApi.createProject.mockResolvedValueOnce(resolvedProject({ id: 'srv-new' }))
    await createProject({ name: 'Дом у моря', type: 'house' })

    const { createBuilding } = useBuilding()
    projectsApi.updateProject.mockResolvedValueOnce(resolvedProject({ id: 'srv-new' }))
    createBuilding(6, 6)
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)

    expect(projectsApi.updateProject).toHaveBeenCalledTimes(1)
    expect(projectsApi.updateProject).toHaveBeenCalledWith('srv-new', expect.anything())
  })

  it('18c. createProject() failure leaves projectId null and surfaces the error', async () => {
    const { createProject, projectId, error } = useProjectPersistence()
    projectsApi.createProject.mockRejectedValueOnce({ status: 400, code: 'invalid_request', message: 'name required' })

    const id = await createProject({ name: '', type: 'house' })

    expect(id).toBeNull()
    expect(projectId.value).toBeNull()
    expect(error.value?.code).toBe('invalid_request')
  })

  it('18d. a second concurrent createProject() call is ignored (double-submit protection)', async () => {
    const { createProject } = useProjectPersistence()
    projectsApi.createProject.mockReturnValue(new Promise(() => {})) // никогда не резолвится в этом тесте

    void createProject({ name: 'A', type: 'house' })
    const second = await createProject({ name: 'A', type: 'house' })

    expect(second).toBeNull()
    expect(projectsApi.createProject).toHaveBeenCalledTimes(1)
  })
})

describe('save() without a projectId (editor always opens an existing project)', () => {
  it('18e. save() is a no-op and never calls createProject', async () => {
    const { createBuilding } = useBuilding()
    const { save, projectId } = useProjectPersistence()
    createBuilding(5, 5)
    expect(projectId.value).toBeNull()

    const ok = await save()

    expect(ok).toBe(false)
    expect(projectsApi.createProject).not.toHaveBeenCalled()
    expect(projectsApi.updateProject).not.toHaveBeenCalled()
  })
})

describe('project list (refreshProjects)', () => {
  it('18f. loading toggles true then false around a successful fetch', async () => {
    const { refreshProjects, isLoadingProjects, projects } = useProjectPersistence()
    let resolveList!: (value: unknown) => void
    projectsApi.getProjects.mockReturnValueOnce(new Promise((resolve) => { resolveList = resolve }))

    const p = refreshProjects()
    expect(isLoadingProjects.value).toBe(true)
    resolveList([{ id: '1', name: 'A', status: 'draft', updatedAt: 'u1' }])
    await p

    expect(isLoadingProjects.value).toBe(false)
    expect(projects.value).toEqual([{ id: '1', name: 'A', status: 'draft', updatedAt: 'u1' }])
  })

  it('18g. an empty backend list is reflected as an empty array', async () => {
    const { refreshProjects, projects } = useProjectPersistence()
    projectsApi.getProjects.mockResolvedValueOnce([])
    await refreshProjects()
    expect(projects.value).toEqual([])
  })

  it('18h. an API error surfaces via error and can be retried', async () => {
    const { refreshProjects, error, projects } = useProjectPersistence()
    projectsApi.getProjects.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    await refreshProjects()
    expect(error.value?.code).toBe('internal_error')
    expect(projects.value).toEqual([])

    projectsApi.getProjects.mockResolvedValueOnce([{ id: '1', name: 'A', status: 'draft', updatedAt: 'u1' }])
    await refreshProjects() // "Повторить"
    expect(error.value).toBeNull()
    expect(projects.value).toHaveLength(1)
  })
})

describe('project switching', () => {
  it('19. Open Project (loadProject) fully replaces the previous project state', async () => {
    const { createBuilding } = useBuilding()
    const { loadProject, projectId, isDirty } = useProjectPersistence()
    createBuilding(5, 5)
    projectId.value = 'srv-1'

    projectsApi.getProject.mockResolvedValueOnce(resolvedProject({ id: 'srv-2', name: 'Другой проект' }))
    const ok = await loadProject('srv-2')

    expect(ok).toBe(true)
    expect(projectId.value).toBe('srv-2')
    expect(isDirty.value).toBe(false)
  })

  it('19b. deleting the currently open project resets projectId and clears editor state', async () => {
    const { document } = useBuilding()
    const { save, projectId, removeProject, isDirty } = useProjectPersistence()
    useBuilding().createBuilding(5, 5)
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockResolvedValueOnce(resolvedProject())
    await save()
    expect(projectId.value).toBe('srv-1')

    projectsApi.deleteProject.mockResolvedValueOnce(undefined)
    const ok = await removeProject('srv-1')

    expect(ok).toBe(true)
    expect(projectId.value).toBeNull()
    expect(isDirty.value).toBe(false)
    expect(document.value.building.dimensions.width).toBe(0)
  })

  it('20. Delete on the current project cancels any pending autosave (no PUT after DELETE)', async () => {
    const { createBuilding } = useBuilding()
    const { removeProject, projectId } = useProjectPersistence()
    createBuilding(5, 5)
    projectId.value = 'srv-1' // теперь mutation ниже планирует autosave

    createBuilding(6, 6) // ре-мутация, чтобы гарантированно запланировать таймер после простановки projectId
    projectsApi.deleteProject.mockResolvedValueOnce(undefined)
    await removeProject('srv-1')

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS * 2)
    expect(projectsApi.updateProject).not.toHaveBeenCalled()
  })
})

// Project Location v1 — see задание, секция AUTOSAVE: backend PUT is
// full-replace (omitting location clears it), so every requestSave() must
// carry the current location alongside name/status/building — not just when
// location itself changed.
describe('Project Location', () => {
  it('createProject() with a location sends it in the POST body and exposes it immediately', async () => {
    const { createProject, location } = useProjectPersistence()
    projectsApi.createProject.mockResolvedValueOnce(resolvedProject({
      id: 'srv-new', location: { city: 'Ташкент', district: 'Юнусабадский' },
    }))

    const id = await createProject({ name: 'Дом', type: 'house', location: { city: 'Ташкент', district: 'Юнусабадский' } })

    expect(id).toBe('srv-new')
    expect(location.value).toEqual({ city: 'Ташкент', district: 'Юнусабадский' })
    const payload = projectsApi.createProject.mock.calls[0]![0] as { location: unknown }
    expect(payload.location).toEqual({ city: 'Ташкент', district: 'Юнусабадский' })
  })

  it('createProject() without a location sends location: null (not omitted, not fabricated)', async () => {
    const { createProject } = useProjectPersistence()
    projectsApi.createProject.mockResolvedValueOnce(resolvedProject({ id: 'srv-new' }))

    await createProject({ name: 'Дом', type: 'house' })

    const payload = projectsApi.createProject.mock.calls[0]![0] as { location: unknown }
    expect(payload.location).toBeNull()
  })

  it('loadProject() exposes the project location as-is', async () => {
    const { loadProject, location } = useProjectPersistence()
    projectsApi.getProject.mockResolvedValueOnce(resolvedProject({ location: { city: 'Самарканд', district: 'Центр' } }))

    await loadProject('srv-1')

    expect(location.value).toEqual({ city: 'Самарканд', district: 'Центр' })
  })

  it('loadProject() with location: null exposes null — no invented address', async () => {
    const { loadProject, location } = useProjectPersistence()
    projectsApi.getProject.mockResolvedValueOnce(resolvedProject())

    await loadProject('srv-1')

    expect(location.value).toBeNull()
  })

  it('setLocation() alone (no Building mutation) marks the project dirty', async () => {
    const { loadProject, setLocation, isDirty } = useProjectPersistence()
    projectsApi.getProject.mockResolvedValueOnce(resolvedProject())
    await loadProject('srv-1')
    expect(isDirty.value).toBe(false)

    setLocation({ city: 'Ташкент', district: 'Юнусабадский' })

    expect(isDirty.value).toBe(true)
  })

  it('save() after setLocation() PUTs the new location and clears dirty', async () => {
    const { loadProject, setLocation, save, isDirty } = useProjectPersistence()
    projectsApi.getProject.mockResolvedValueOnce(resolvedProject())
    await loadProject('srv-1')

    setLocation({ city: 'Ташкент', district: 'Юнусабадский' })
    projectsApi.updateProject.mockResolvedValueOnce(resolvedProject({ location: { city: 'Ташкент', district: 'Юнусабадский' } }))
    const ok = await save()

    expect(ok).toBe(true)
    expect(isDirty.value).toBe(false)
    const payload = projectsApi.updateProject.mock.calls[0]![1] as { location: unknown }
    expect(payload.location).toEqual({ city: 'Ташкент', district: 'Юнусабадский' })
  })

  it('clearing an existing location (setLocation(null)) saves location: null, not the old value', async () => {
    const { loadProject, setLocation, save } = useProjectPersistence()
    projectsApi.getProject.mockResolvedValueOnce(resolvedProject({ location: { city: 'Ташкент', district: 'Юнусабадский' } }))
    await loadProject('srv-1')

    setLocation(null)
    projectsApi.updateProject.mockResolvedValueOnce(resolvedProject({ location: null }))
    await save()

    const payload = projectsApi.updateProject.mock.calls[0]![1] as { location: unknown }
    expect(payload.location).toBeNull()
  })

  // The critical regression this whole feature depends on: backend Update()
  // is full-replace (see remont-back application/project/service.go doc
  // comment), so a save triggered by an UNRELATED Building JSON mutation
  // must still carry the current location — otherwise plain plan-editing
  // autosave would silently wipe it.
  it('a Building-only mutation autosave still carries the already-set location (does not wipe it)', async () => {
    const { createBuilding } = useBuilding()
    const { loadProject, setLocation, projectId } = useProjectPersistence()
    projectsApi.getProject.mockResolvedValueOnce(resolvedProject())
    await loadProject('srv-1')
    setLocation({ city: 'Ташкент', district: 'Юнусабадский' })
    projectsApi.updateProject.mockResolvedValueOnce(resolvedProject({ location: { city: 'Ташкент', district: 'Юнусабадский' } }))
    await useProjectPersistence().save()
    projectsApi.updateProject.mockClear()

    projectId.value = 'srv-1'
    createBuilding(5, 5) // unrelated geometry mutation — no setLocation() call here
    projectsApi.updateProject.mockResolvedValueOnce(resolvedProject({ location: { city: 'Ташкент', district: 'Юнусабадский' } }))
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)

    expect(projectsApi.updateProject).toHaveBeenCalledTimes(1)
    const payload = projectsApi.updateProject.mock.calls[0]![1] as { location: unknown }
    expect(payload.location).toEqual({ city: 'Ташкент', district: 'Юнусабадский' })
  })

  it('cleanup() resets location to null for the next editor session', async () => {
    const { loadProject, location, cleanup } = useProjectPersistence()
    projectsApi.getProject.mockResolvedValueOnce(resolvedProject({ location: { city: 'Ташкент', district: 'Юнусабадский' } }))
    await loadProject('srv-1')
    expect(location.value).not.toBeNull()

    cleanup()

    expect(location.value).toBeNull()
  })
})

describe('cleanup', () => {
  it('22. cleanup() cancels a pending debounce timer', async () => {
    const { createBuilding } = useBuilding()
    const { projectId, cleanup } = useProjectPersistence()
    projectId.value = 'srv-1'
    projectsApi.updateProject.mockResolvedValue(resolvedProject())

    createBuilding(5, 5) // планирует autosave
    cleanup()

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS * 2)
    expect(projectsApi.updateProject).not.toHaveBeenCalled()
  })

  it('23. registers and unregisters exactly one beforeunload listener', () => {
    const { cleanup } = useProjectPersistence()
    expect(windowListeners.get('beforeunload')?.size).toBe(1)
    cleanup()
    expect(windowListeners.get('beforeunload')?.size ?? 0).toBe(0)
  })

  it('24. beforeunload warns only when there are unsaved changes', () => {
    const { createBuilding } = useBuilding()
    useProjectPersistence()
    const handler = [...(windowListeners.get('beforeunload') ?? [])][0]!

    const cleanEvent = { preventDefault: vi.fn(), returnValue: '' } as unknown as BeforeUnloadEvent
    handler(cleanEvent)
    expect(cleanEvent.preventDefault).not.toHaveBeenCalled()

    createBuilding(5, 5)
    const dirtyEvent = { preventDefault: vi.fn(), returnValue: '' } as unknown as BeforeUnloadEvent
    handler(dirtyEvent)
    expect(dirtyEvent.preventDefault).toHaveBeenCalled()
  })
})
