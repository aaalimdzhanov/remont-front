import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyBuildingDocument } from '~/composables/useBuilding'

const apiFetchMock = vi.fn()
vi.mock('~/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

const { calculateWorkQuantity } = await import('~/api/workCalculations')

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('calculateWorkQuantity', () => {
  it('POSTs the full BuildingDocument + snake_case fields to /api/v1/work-calculations without auth', async () => {
    const building = createEmptyBuildingDocument()
    apiFetchMock.mockResolvedValueOnce({ quantity: 38.4, unit: 'm2', quantity_mode: 'automatic' })

    const result = await calculateWorkQuantity({ building, workTypeId: 'wt-1', roomId: 'room-001' })

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/work-calculations', {
      method: 'POST',
      body: { building, work_type_id: 'wt-1', room_id: 'room-001' },
      signal: undefined,
      auth: false,
    })
    expect(result).toEqual({ quantity: 38.4, unit: 'm2', quantityMode: 'automatic' })
  })

  it('sends room_id: null for a whole-project (project-level) work', async () => {
    const building = createEmptyBuildingDocument()
    apiFetchMock.mockResolvedValueOnce({ quantity: 4, unit: 'pcs', quantity_mode: 'manual' })

    await calculateWorkQuantity({ building, workTypeId: 'wt-2', roomId: null })

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/work-calculations', expect.objectContaining({
      body: expect.objectContaining({ room_id: null }),
    }))
  })

  it('propagates backend errors (e.g. manual_quantity_required/room_not_found) unchanged — apiFetch already normalizes them', async () => {
    const building = createEmptyBuildingDocument()
    const apiError = { status: 400, code: 'manual_quantity_required', message: 'Для этой работы количество нужно указать вручную.' }
    apiFetchMock.mockRejectedValueOnce(apiError)

    await expect(calculateWorkQuantity({ building, workTypeId: 'wt-3', roomId: null })).rejects.toEqual(apiError)
  })
})
