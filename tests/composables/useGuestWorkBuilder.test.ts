import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetShimState } from '../setup'
import type { BuildingDocument } from '~/types/building'
import type { WorkType } from '~/api/types'

const workCalculationsApi = { calculateWorkQuantity: vi.fn() }
vi.mock('~/api/workCalculations', () => workCalculationsApi)

const projectWorksApi = { createProjectWork: vi.fn() }
vi.mock('~/api/projectWorks', () => projectWorksApi)

const projectPersistenceApi = { createProjectFromDraft: vi.fn() }
vi.mock('~/composables/useProjectPersistence', () => ({
  useProjectPersistence: () => projectPersistenceApi,
}))

let useGuestWorkBuilder: typeof import('~/composables/useGuestWorkBuilder')['useGuestWorkBuilder']

beforeEach(async () => {
  vi.resetModules()
  resetShimState()
  vi.clearAllMocks()
  ;({ useGuestWorkBuilder } = await import('~/composables/useGuestWorkBuilder'))
})

function buildBuilding(roomWidth = 4, roomLength = 5): BuildingDocument {
  return {
    schema: { name: 'remont-building', version: '1.0' },
    project: { id: 'draft', name: 'Черновик', status: 'draft' },
    units: { length: 'm', area: 'm2', volume: 'm3', angle: 'deg' },
    building: {
      id: 'building-001',
      type: 'apartment',
      dimensions: { width: 10, length: 10 },
      floors: [{ id: 'f1', number: 0, elevation: 0, height: 3 }],
      rooms: [{
        id: 'room-001',
        floor_id: 'f1',
        name: 'Спальня',
        type: 'bedroom',
        geometry: { type: 'rectangle', width: roomWidth, length: roomLength, position: { x: 0, z: 0 }, rotation: 0 },
      }],
      walls: [],
      openings: [],
      stairs: [],
      roof: null,
      elements: [],
    },
    work_requirements: [],
    calculated: {
      areas: { floor: roomWidth * roomLength, ceiling: roomWidth * roomLength, wallGross: 0, wallNet: 0 },
      openings: { doors: 0, windows: 0, total: 0 },
      statistics: { roomCount: 1, wallCount: 0, doorCount: 0, windowCount: 0 },
      warnings: [],
    },
  }
}

const automaticWorkType: WorkType = {
  id: 'wt-1', categoryId: 'cat-1', name: 'Штукатурка стен', slug: 'plaster-walls',
  unit: 'm2', measurementSource: 'wall_net_area', quantityMode: 'automatic', sortOrder: 1,
}
const manualWorkType: WorkType = {
  id: 'wt-2', categoryId: 'cat-electrical', name: 'Установка розетки', slug: 'outlet-installation',
  unit: 'pcs', measurementSource: 'fixed', quantityMode: 'manual', sortOrder: 1,
}

describe('useGuestWorkBuilder — addWork', () => {
  it('automatic quantity_mode calls the public calculation endpoint and never computes quantity itself', async () => {
    workCalculationsApi.calculateWorkQuantity.mockResolvedValueOnce({ quantity: 20, unit: 'm2', quantityMode: 'automatic' })
    const gwb = useGuestWorkBuilder()

    const result = await gwb.addWork(buildBuilding(), automaticWorkType, 'room-001')

    expect(workCalculationsApi.calculateWorkQuantity).toHaveBeenCalledWith({ building: expect.anything(), workTypeId: 'wt-1', roomId: 'room-001' })
    expect(result).toEqual({ quantity: 20, unit: 'm2' })
    expect(gwb.items.value).toHaveLength(1)
    expect(gwb.items.value[0]).toMatchObject({ workTypeId: 'wt-1', roomId: 'room-001', quantity: 20, unit: 'm2', quantityMode: 'automatic' })
  })

  it('manual quantity_mode uses the user-entered value directly, with no network call at all', async () => {
    const gwb = useGuestWorkBuilder()

    const result = await gwb.addWork(buildBuilding(), manualWorkType, null, 4)

    expect(workCalculationsApi.calculateWorkQuantity).not.toHaveBeenCalled()
    expect(result).toEqual({ quantity: 4, unit: 'pcs' })
    expect(gwb.items.value[0]).toMatchObject({ roomId: null, quantity: 4, unit: 'pcs', quantityMode: 'manual' })
  })

  it('project-level work (roomId null) and room-level work are both recorded distinctly', async () => {
    workCalculationsApi.calculateWorkQuantity
      .mockResolvedValueOnce({ quantity: 20, unit: 'm2', quantityMode: 'automatic' })
      .mockResolvedValueOnce({ quantity: 6, unit: 'm2', quantityMode: 'automatic' })
    const gwb = useGuestWorkBuilder()

    await gwb.addWork(buildBuilding(), automaticWorkType, 'room-001')
    await gwb.addWork(buildBuilding(), { ...automaticWorkType, id: 'wt-3' }, null)

    expect(gwb.items.value.map(i => i.roomId)).toEqual(['room-001', null])
  })

  it('surfaces the backend error (e.g. room_not_found) via createError without adding an item', async () => {
    workCalculationsApi.calculateWorkQuantity.mockRejectedValueOnce({ status: 400, code: 'room_not_found', message: 'Комната больше не существует. Выберите другую комнату.' })
    const gwb = useGuestWorkBuilder()

    const result = await gwb.addWork(buildBuilding(), automaticWorkType, 'room-001')

    expect(result).toBeNull()
    expect(gwb.items.value).toHaveLength(0)
    expect(gwb.createError.value?.code).toBe('room_not_found')
  })

  it('double-submit guard: a second concurrent addWork call is ignored while the first is in flight', async () => {
    let resolveFirst!: (value: { quantity: number, unit: 'm2', quantityMode: 'automatic' }) => void
    workCalculationsApi.calculateWorkQuantity.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
    const gwb = useGuestWorkBuilder()

    const first = gwb.addWork(buildBuilding(), automaticWorkType, 'room-001')
    const second = await gwb.addWork(buildBuilding(), automaticWorkType, 'room-001')
    expect(second).toBeNull()

    resolveFirst({ quantity: 20, unit: 'm2', quantityMode: 'automatic' })
    await first
    expect(gwb.items.value).toHaveLength(1)
  })
})

describe('useGuestWorkBuilder — removeWork', () => {
  it('removes a guest work from local state only, no network call', async () => {
    workCalculationsApi.calculateWorkQuantity.mockResolvedValueOnce({ quantity: 20, unit: 'm2', quantityMode: 'automatic' })
    const gwb = useGuestWorkBuilder()
    await gwb.addWork(buildBuilding(), automaticWorkType, 'room-001')
    const id = gwb.items.value[0]!.id

    gwb.removeWork(id)

    expect(gwb.items.value).toHaveLength(0)
    expect(projectWorksApi.createProjectWork).not.toHaveBeenCalled()
  })
})

describe('useGuestWorkBuilder — recalculateAll', () => {
  it('recalculates against the CURRENT building, not a stale snapshot (20 -> 24 after a room resize)', async () => {
    workCalculationsApi.calculateWorkQuantity.mockResolvedValueOnce({ quantity: 20, unit: 'm2', quantityMode: 'automatic' })
    const gwb = useGuestWorkBuilder()
    await gwb.addWork(buildBuilding(4, 5), automaticWorkType, 'room-001')

    workCalculationsApi.calculateWorkQuantity.mockResolvedValueOnce({ quantity: 24, unit: 'm2', quantityMode: 'automatic' })
    const resized = buildBuilding(4, 6)
    const ok = await gwb.recalculateAll(resized)

    expect(ok).toBe(true)
    expect(workCalculationsApi.calculateWorkQuantity).toHaveBeenLastCalledWith({ building: resized, workTypeId: 'wt-1', roomId: 'room-001' })
    expect(gwb.items.value[0]!.quantity).toBe(24)
  })

  it('never recalculates manual works (backend does not touch them either)', async () => {
    const gwb = useGuestWorkBuilder()
    await gwb.addWork(buildBuilding(), manualWorkType, null, 4)

    await gwb.recalculateAll(buildBuilding())

    expect(workCalculationsApi.calculateWorkQuantity).not.toHaveBeenCalled()
    expect(gwb.items.value[0]!.quantity).toBe(4)
  })

  it('one failing item does not discard already-updated items, and surfaces one error', async () => {
    workCalculationsApi.calculateWorkQuantity
      .mockResolvedValueOnce({ quantity: 20, unit: 'm2', quantityMode: 'automatic' })
      .mockResolvedValueOnce({ quantity: 6, unit: 'm2', quantityMode: 'automatic' })
    const gwb = useGuestWorkBuilder()
    await gwb.addWork(buildBuilding(), automaticWorkType, 'room-001')
    await gwb.addWork(buildBuilding(), { ...automaticWorkType, id: 'wt-3' }, null)

    workCalculationsApi.calculateWorkQuantity
      .mockResolvedValueOnce({ quantity: 24, unit: 'm2', quantityMode: 'automatic' })
      .mockRejectedValueOnce({ status: 400, code: 'invalid_building', message: 'bad' })

    const ok = await gwb.recalculateAll(buildBuilding())

    expect(ok).toBe(false)
    expect(gwb.recalculateError.value?.code).toBe('invalid_building')
    expect(gwb.items.value.find(i => i.roomId === 'room-001')!.quantity).toBe(24)
  })
})

describe('useGuestWorkBuilder — saveSessionAfterAuth (AUTH TRANSITION)', () => {
  it('creates the Project from the drawn Building, then one ProjectWork per guest item, then clears guest state, with failedCount: 0', async () => {
    workCalculationsApi.calculateWorkQuantity.mockResolvedValueOnce({ quantity: 20, unit: 'm2', quantityMode: 'automatic' })
    const gwb = useGuestWorkBuilder()
    await gwb.addWork(buildBuilding(), automaticWorkType, 'room-001')
    await gwb.addWork(buildBuilding(), manualWorkType, null, 4)

    projectPersistenceApi.createProjectFromDraft.mockResolvedValueOnce('project-123')
    projectWorksApi.createProjectWork.mockResolvedValue({})

    const doc = buildBuilding()
    const result = await gwb.saveSessionAfterAuth(doc)

    expect(result).toEqual({ projectId: 'project-123', failedCount: 0 })
    expect(projectPersistenceApi.createProjectFromDraft).toHaveBeenCalledWith(doc)
    expect(projectWorksApi.createProjectWork).toHaveBeenCalledTimes(2)
    expect(projectWorksApi.createProjectWork).toHaveBeenCalledWith('project-123', { work_type_id: 'wt-1', room_id: 'room-001', quantity: undefined })
    expect(projectWorksApi.createProjectWork).toHaveBeenCalledWith('project-123', { work_type_id: 'wt-2', room_id: null, quantity: 4 })
    expect(gwb.items.value).toHaveLength(0)
  })

  it('returns projectId: null and creates no ProjectWork when the Project itself fails to create — guest state is left untouched (nothing was lost)', async () => {
    const gwb = useGuestWorkBuilder()
    await gwb.addWork(buildBuilding(), manualWorkType, null, 4)
    projectPersistenceApi.createProjectFromDraft.mockResolvedValueOnce(null)

    const result = await gwb.saveSessionAfterAuth(buildBuilding())

    expect(result).toEqual({ projectId: null, failedCount: 0 })
    expect(projectWorksApi.createProjectWork).not.toHaveBeenCalled()
    expect(gwb.items.value).toHaveLength(1) // guest state NOT cleared — the user can just retry "Сохранить"
  })

  it('retries a failing ProjectWork creation once — a single transient failure still counts as a success', async () => {
    workCalculationsApi.calculateWorkQuantity.mockResolvedValueOnce({ quantity: 20, unit: 'm2', quantityMode: 'automatic' })
    const gwb = useGuestWorkBuilder()
    await gwb.addWork(buildBuilding(), automaticWorkType, 'room-001')

    projectPersistenceApi.createProjectFromDraft.mockResolvedValueOnce('project-123')
    projectWorksApi.createProjectWork
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({})

    const result = await gwb.saveSessionAfterAuth(buildBuilding())

    expect(result).toEqual({ projectId: 'project-123', failedCount: 0 })
    expect(projectWorksApi.createProjectWork).toHaveBeenCalledTimes(2)
  })

  it('reports a work that fails BOTH attempts via failedCount, without blocking the Project/other works, and clears guest state regardless (explicit, non-silent — see doc comment)', async () => {
    workCalculationsApi.calculateWorkQuantity.mockResolvedValueOnce({ quantity: 20, unit: 'm2', quantityMode: 'automatic' })
    const gwb = useGuestWorkBuilder()
    await gwb.addWork(buildBuilding(), automaticWorkType, 'room-001') // will fail both attempts
    await gwb.addWork(buildBuilding(), manualWorkType, null, 4) // will succeed

    projectPersistenceApi.createProjectFromDraft.mockResolvedValueOnce('project-123')
    projectWorksApi.createProjectWork
      .mockRejectedValueOnce(new Error('boom')) // item 1, attempt 1
      .mockRejectedValueOnce(new Error('boom')) // item 1, attempt 2 (retry)
      .mockResolvedValueOnce({}) // item 2

    const result = await gwb.saveSessionAfterAuth(buildBuilding())

    expect(result).toEqual({ projectId: 'project-123', failedCount: 1 })
    expect(projectWorksApi.createProjectWork).toHaveBeenCalledTimes(3)
    // Guest state is cleared even though one item failed — see doc comment on
    // saveSessionAfterAuth: the failure is reported via failedCount instead of
    // left to rot as orphaned localStorage state that could leak into an
    // unrelated future guest session.
    expect(gwb.items.value).toHaveLength(0)
  })
})
