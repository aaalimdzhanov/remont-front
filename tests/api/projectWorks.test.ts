import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.fn()
vi.mock('~/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

const {
  createProjectWork,
  deleteProjectWork,
  listProjectWorks,
  recalculateProjectWorks,
  updateProjectWorkStatus,
} = await import('~/api/projectWorks')

const dto = {
  id: 'w1',
  project_id: 'p1',
  room_id: 'room-001',
  work_type_id: 'wt1',
  status: 'planned',
  quantity: 9.02,
  unit: 'm2',
  quantity_mode: 'automatic',
  created_at: 'c1',
  updated_at: 'u1',
}

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('projectWorks api methods', () => {
  it('listProjectWorks GETs the project works and maps to camelCase', async () => {
    apiFetchMock.mockResolvedValueOnce([dto])
    const result = await listProjectWorks('p1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works', { signal: undefined })
    expect(result).toEqual([{
      id: 'w1', projectId: 'p1', roomId: 'room-001', workTypeId: 'wt1', status: 'planned',
      quantity: 9.02, unit: 'm2', quantityMode: 'automatic', createdAt: 'c1', updatedAt: 'u1',
    }])
  })

  it('createProjectWork POSTs work_type_id/room_id/quantity as given (room_id can be a plain Building-JSON id, not a UUID)', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    await createProjectWork('p1', { work_type_id: 'wt1', room_id: 'room-001' })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works', {
      method: 'POST',
      body: { work_type_id: 'wt1', room_id: 'room-001' },
    })
  })

  it('createProjectWork supports room_id: null for project-level work', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...dto, room_id: null })
    const result = await createProjectWork('p1', { work_type_id: 'wt1', room_id: null, quantity: 4 })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works', {
      method: 'POST',
      body: { work_type_id: 'wt1', room_id: null, quantity: 4 },
    })
    expect(result.roomId).toBeNull()
  })

  it('updateProjectWorkStatus issues a PATCH to the status sub-resource', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...dto, status: 'in_progress' })
    const result = await updateProjectWorkStatus('p1', 'w1', 'in_progress')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works/w1/status', {
      method: 'PATCH',
      body: { status: 'in_progress' },
    })
    expect(result.status).toBe('in_progress')
  })

  it('deleteProjectWork issues a DELETE', async () => {
    apiFetchMock.mockResolvedValueOnce(undefined)
    await deleteProjectWork('p1', 'w1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works/w1', { method: 'DELETE' })
  })

  it('recalculateProjectWorks POSTs and returns only the updated count (backend does not return the list)', async () => {
    apiFetchMock.mockResolvedValueOnce({ updated: 3 })
    const result = await recalculateProjectWorks('p1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works/recalculate', { method: 'POST' })
    expect(result).toEqual({ updated: 3 })
  })
})
