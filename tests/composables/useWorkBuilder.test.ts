import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetShimState } from '../setup'

const workCatalogApi = {
  getWorkCategories: vi.fn(),
  getWorkTypes: vi.fn(),
}
vi.mock('~/api/workCatalog', () => workCatalogApi)

const projectWorksApi = {
  listProjectWorks: vi.fn(),
  createProjectWork: vi.fn(),
  updateProjectWorkStatus: vi.fn(),
  deleteProjectWork: vi.fn(),
  recalculateProjectWorks: vi.fn(),
}
vi.mock('~/api/projectWorks', () => projectWorksApi)

let useWorkBuilder: typeof import('~/composables/useWorkBuilder')['useWorkBuilder']

beforeEach(async () => {
  vi.resetModules()
  resetShimState()
  vi.clearAllMocks()
  ;({ useWorkBuilder } = await import('~/composables/useWorkBuilder'))
})

const category = { id: 'cat-1', name: 'Плитка', slug: 'tiles', sortOrder: 1 }
const workType = {
  id: 'wt-1', categoryId: 'cat-1', name: 'Плитка на пол', slug: 'floor-tiles',
  unit: 'm2' as const, measurementSource: 'floor_area' as const, quantityMode: 'automatic' as const, sortOrder: 1,
}
const manualWorkType = {
  id: 'wt-2', categoryId: 'cat-electrical', name: 'Установка розетки', slug: 'outlet-installation',
  unit: 'pcs' as const, measurementSource: 'fixed' as const, quantityMode: 'manual' as const, sortOrder: 1,
}

describe('useWorkBuilder — initial state', () => {
  it('starts on the list step with everything empty/unselected', () => {
    const wb = useWorkBuilder()
    expect(wb.currentStep.value).toBe('list')
    expect(wb.categories.value).toEqual([])
    expect(wb.projectWorks.value).toEqual([])
    expect(wb.selectedRoomId.value).toBeNull()
    expect(wb.selectedIsProjectLevel.value).toBe(false)
    expect(wb.selectedWorkType.value).toBeNull()
  })
})

describe('useWorkBuilder — add-work flow navigation', () => {
  it('startAddWork moves to the room step and loads the catalog once (not hardcoded)', async () => {
    workCatalogApi.getWorkCategories.mockResolvedValueOnce([category])
    const wb = useWorkBuilder()
    wb.startAddWork()
    expect(wb.currentStep.value).toBe('room')
    await vi.waitFor(() => expect(wb.categories.value).toEqual([category]))
    expect(workCatalogApi.getWorkCategories).toHaveBeenCalledTimes(1)
  })

  it('selectRoom(roomId) records the room and moves to category', () => {
    const wb = useWorkBuilder()
    wb.selectRoom('room-1')
    expect(wb.selectedRoomId.value).toBe('room-1')
    expect(wb.selectedIsProjectLevel.value).toBe(false)
    expect(wb.currentStep.value).toBe('category')
  })

  it('selectRoom(null) marks the work as project-level ("Весь проект"), not a fabricated room id', () => {
    const wb = useWorkBuilder()
    wb.selectRoom(null)
    expect(wb.selectedRoomId.value).toBeNull()
    expect(wb.selectedIsProjectLevel.value).toBe(true)
    expect(wb.currentStep.value).toBe('category')
  })

  it('selectCategory(id) fetches work types scoped to that category via category_id, not the full catalog', async () => {
    workCatalogApi.getWorkTypes.mockResolvedValueOnce([workType])
    const wb = useWorkBuilder()
    wb.selectCategory('cat-1')
    expect(wb.selectedCategoryId.value).toBe('cat-1')
    expect(wb.currentStep.value).toBe('type')
    await vi.waitFor(() => expect(wb.workTypes.value).toEqual([workType]))
    expect(workCatalogApi.getWorkTypes).toHaveBeenCalledWith('cat-1')
  })

  it('selectWorkType(id) moves to calculation and resolves selectedWorkType from the loaded list', async () => {
    workCatalogApi.getWorkTypes.mockResolvedValueOnce([workType])
    const wb = useWorkBuilder()
    wb.selectCategory('cat-1')
    await vi.waitFor(() => expect(wb.workTypes.value.length).toBe(1))
    wb.selectWorkType('wt-1')
    expect(wb.currentStep.value).toBe('calculation')
    expect(wb.selectedWorkType.value).toEqual(workType)
  })

  it('goBack steps back exactly one screen at a time and clears only the screen being left (см. задание: Screen5←Type, Screen4←Category, Screen3←Room, Screen2←Works)', async () => {
    workCatalogApi.getWorkTypes.mockResolvedValueOnce([workType])
    const wb = useWorkBuilder()
    wb.selectRoom('room-1')
    wb.selectCategory('cat-1')
    await vi.waitFor(() => expect(wb.workTypes.value.length).toBe(1))
    wb.selectWorkType('wt-1')
    expect(wb.currentStep.value).toBe('calculation')

    wb.goBack() // Screen 5 (calculation) → Screen 4 (type): clears только workType
    expect(wb.currentStep.value).toBe('type')
    expect(wb.selectedWorkTypeId.value).toBeNull()
    expect(wb.selectedCategoryId.value).toBe('cat-1') // категория остаётся выбранной

    wb.goBack() // Screen 4 (type) → Screen 3 (category): категория пока не тронута
    expect(wb.currentStep.value).toBe('category')
    expect(wb.selectedCategoryId.value).toBe('cat-1')
    expect(wb.selectedRoomId.value).toBe('room-1') // комната остаётся выбранной

    wb.goBack() // Screen 3 (category) → Screen 2 (room): только теперь категория очищается
    expect(wb.currentStep.value).toBe('room')
    expect(wb.selectedCategoryId.value).toBeNull()
    expect(wb.selectedRoomId.value).toBe('room-1')

    wb.goBack() // Screen 2 (room) → Screen 1 (list/Works): комната очищается
    expect(wb.currentStep.value).toBe('list')
    expect(wb.selectedRoomId.value).toBeNull()

    wb.goBack() // из 'list' назад некуда
    expect(wb.currentStep.value).toBe('list')
  })

  it('resetFlow ("×") returns straight to the list and clears every selection, regardless of current step', async () => {
    const wb = useWorkBuilder()
    wb.selectRoom('room-1')
    wb.selectCategory('cat-1')
    wb.resetFlow()
    expect(wb.currentStep.value).toBe('list')
    expect(wb.selectedRoomId.value).toBeNull()
    expect(wb.selectedCategoryId.value).toBeNull()
    expect(wb.selectedWorkTypeId.value).toBeNull()
  })
})

describe('useWorkBuilder — automatic work creation', () => {
  it('addWork for an automatic work type does not send its own quantity, and stores the backend-computed result verbatim', async () => {
    const created = {
      id: 'pw-1', projectId: 'p1', roomId: 'room-1', workTypeId: 'wt-1',
      status: 'planned' as const, quantity: 9.02, unit: 'm2' as const, quantityMode: 'automatic' as const,
      createdAt: 'c1', updatedAt: 'u1',
    }
    projectWorksApi.createProjectWork.mockResolvedValueOnce(created)
    const wb = useWorkBuilder()
    wb.selectRoom('room-1')
    wb.selectedCategoryId.value = 'cat-1'
    wb.selectedWorkTypeId.value = 'wt-1'

    const result = await wb.addWork('p1')

    expect(projectWorksApi.createProjectWork).toHaveBeenCalledWith('p1', {
      work_type_id: 'wt-1', room_id: 'room-1', quantity: undefined,
    })
    expect(result).toEqual(created)
    expect(result!.quantity).toBe(9.02) // ровно то, что вернул backend — не пересчитано на фронте
    expect(wb.projectWorks.value).toEqual([created])
    // Flow НЕ сбрасывается автоматически (currentStep) — экран расчёта сам
    // решает, когда вызвать resetFlow(), после того как покажет результат.
    expect(wb.selectedWorkTypeId.value).toBe('wt-1')
  })

  it('addWork sends room_id: null for a project-level ("Весь проект") work', async () => {
    projectWorksApi.createProjectWork.mockResolvedValueOnce({
      id: 'pw-2', projectId: 'p1', roomId: null, workTypeId: 'wt-2',
      status: 'planned' as const, quantity: 4, unit: 'pcs' as const, quantityMode: 'manual' as const,
      createdAt: 'c1', updatedAt: 'u1',
    })
    const wb = useWorkBuilder()
    wb.selectRoom(null)
    wb.selectedWorkTypeId.value = 'wt-2'

    await wb.addWork('p1', 4)

    expect(projectWorksApi.createProjectWork).toHaveBeenCalledWith('p1', {
      work_type_id: 'wt-2', room_id: null, quantity: 4,
    })
  })

  it('addWork guards against double-submit while a create is already in flight', async () => {
    let resolveCreate: (value: unknown) => void = () => {}
    projectWorksApi.createProjectWork.mockReturnValueOnce(new Promise((resolve) => { resolveCreate = resolve }))
    const wb = useWorkBuilder()
    wb.selectedWorkTypeId.value = 'wt-1'

    const first = wb.addWork('p1')
    const second = await wb.addWork('p1') // должен вернуть null немедленно, не начиная второй запрос
    expect(second).toBeNull()
    expect(projectWorksApi.createProjectWork).toHaveBeenCalledTimes(1)

    resolveCreate({
      id: 'pw-1', projectId: 'p1', roomId: null, workTypeId: 'wt-1',
      status: 'planned', quantity: 1, unit: 'm2', quantityMode: 'automatic', createdAt: 'c', updatedAt: 'c',
    })
    await first
  })

  it('addWork surfaces a failed create as createError and returns null without touching the list', async () => {
    projectWorksApi.createProjectWork.mockRejectedValueOnce({ status: 400, code: 'room_not_found', message: 'Комната не найдена' })
    const wb = useWorkBuilder()
    wb.selectedWorkTypeId.value = 'wt-1'
    const result = await wb.addWork('p1')
    expect(result).toBeNull()
    expect(wb.createError.value?.code).toBe('room_not_found')
    expect(wb.projectWorks.value).toEqual([])
  })
})

describe('useWorkBuilder — list actions', () => {
  it('deleteWork removes the work from the list only after backend confirms', async () => {
    const wb = useWorkBuilder()
    wb.projectWorks.value = [
      { id: 'pw-1', projectId: 'p1', roomId: null, workTypeId: 'wt-1', status: 'planned', quantity: 1, unit: 'm2', quantityMode: 'automatic', createdAt: 'c', updatedAt: 'c' },
    ]
    projectWorksApi.deleteProjectWork.mockResolvedValueOnce(undefined)
    const ok = await wb.deleteWork('p1', 'pw-1')
    expect(ok).toBe(true)
    expect(wb.projectWorks.value).toEqual([])
  })

  it('updateStatus replaces the item with the backend response, never optimistically before the request resolves', async () => {
    const wb = useWorkBuilder()
    const original = { id: 'pw-1', projectId: 'p1', roomId: null, workTypeId: 'wt-1', status: 'planned' as const, quantity: 1, unit: 'm2' as const, quantityMode: 'automatic' as const, createdAt: 'c', updatedAt: 'c' }
    wb.projectWorks.value = [original]
    projectWorksApi.updateProjectWorkStatus.mockResolvedValueOnce({ ...original, status: 'in_progress', updatedAt: 'c2' })
    await wb.updateStatus('p1', 'pw-1', 'in_progress')
    expect(wb.projectWorks.value[0]!.status).toBe('in_progress')
  })

  it('recalculate calls the recalculate endpoint then refreshes the list (backend returns only a count, not the list)', async () => {
    projectWorksApi.recalculateProjectWorks.mockResolvedValueOnce({ updated: 2 })
    projectWorksApi.listProjectWorks.mockResolvedValueOnce([
      { id: 'pw-1', projectId: 'p1', roomId: 'room-1', workTypeId: 'wt-1', status: 'planned', quantity: 15, unit: 'm2', quantityMode: 'automatic', createdAt: 'c', updatedAt: 'c2' },
    ])
    const wb = useWorkBuilder()
    const ok = await wb.recalculate('p1')
    expect(ok).toBe(true)
    expect(projectWorksApi.recalculateProjectWorks).toHaveBeenCalledWith('p1')
    expect(projectWorksApi.listProjectWorks).toHaveBeenCalledWith('p1', { signal: undefined })
    expect(wb.projectWorks.value[0]!.quantity).toBe(15)
  })
})
