import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.fn()
vi.mock('~/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

const { createProject, deleteProject, getProject, getProjects, updateProject } = await import('~/api/projects')

const buildingDoc = {
  schema: { name: 'remont-building', version: '1.0' },
  project: { id: 'p', name: 'Test', status: 'draft' },
  units: { length: 'm', area: 'm2', volume: 'm3', angle: 'deg' },
  building: {
    id: 'b', type: 'house', dimensions: { width: 0, length: 0 },
    floors: [], rooms: [], walls: [], openings: [], stairs: [], roof: null, elements: [],
  },
  work_requirements: [],
  calculated: {
    areas: { floor: 0, ceiling: 0, wallGross: 0, wallNet: 0 },
    openings: { doors: 0, windows: 0, total: 0 },
    statistics: { roomCount: 0, wallCount: 0, doorCount: 0, windowCount: 0 },
    warnings: [],
  },
} as const

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('projects api methods', () => {
  it('getProjects fetches the list and maps snake_case metadata to camelCase', async () => {
    apiFetchMock.mockResolvedValueOnce([
      { id: '1', name: 'A', status: 'draft', created_at: 'c1', updated_at: 'u1' },
    ])
    const result = await getProjects()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects', { signal: undefined })
    expect(result).toEqual([{ id: '1', name: 'A', status: 'draft', createdAt: 'c1', updatedAt: 'u1' }])
  })

  it('getProject fetches by id and maps the full document', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: '1', name: 'A', status: 'draft', building: buildingDoc, created_at: 'c1', updated_at: 'u1',
    })
    const result = await getProject('1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/1', { signal: undefined })
    expect(result.building).toEqual(buildingDoc)
    expect(result.updatedAt).toBe('u1')
  })

  it('createProject POSTs name/status/building and returns the canonical project', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'srv-1', name: 'A', status: 'draft', building: buildingDoc, created_at: 'c1', updated_at: 'u1',
    })
    const result = await createProject({ name: 'A', status: 'draft', building: buildingDoc as never })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects', {
      method: 'POST',
      body: { name: 'A', status: 'draft', building: buildingDoc },
    })
    expect(result.id).toBe('srv-1')
  })

  it('updateProject PUTs to the project id', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: '1', name: 'B', status: 'draft', building: buildingDoc, created_at: 'c1', updated_at: 'u2',
    })
    await updateProject('1', { name: 'B', status: 'draft', building: buildingDoc as never })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/1', {
      method: 'PUT',
      body: { name: 'B', status: 'draft', building: buildingDoc },
    })
  })

  it('deleteProject issues a DELETE and propagates the underlying ApiError on failure', async () => {
    const apiError = { status: 404, code: 'project_not_found', message: 'Project not found' }
    apiFetchMock.mockRejectedValueOnce(apiError)
    await expect(deleteProject('missing')).rejects.toEqual(apiError)
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/missing', { method: 'DELETE', signal: undefined })
  })
})
