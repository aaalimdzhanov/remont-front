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
      id: '1', name: 'A', status: 'draft', building: buildingDoc, created_at: 'c1', updated_at: 'u1', location: null,
    })
    const result = await getProject('1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/1', { signal: undefined })
    expect(result.building).toEqual(buildingDoc)
    expect(result.updatedAt).toBe('u1')
  })

  it('createProject POSTs name/status/building/location and returns the canonical project', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'srv-1', name: 'A', status: 'draft', building: buildingDoc, created_at: 'c1', updated_at: 'u1', location: null,
    })
    const result = await createProject({ name: 'A', status: 'draft', building: buildingDoc as never, location: null })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects', {
      method: 'POST',
      body: { name: 'A', status: 'draft', building: buildingDoc, location: null },
    })
    expect(result.id).toBe('srv-1')
  })

  it('updateProject PUTs to the project id', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: '1', name: 'B', status: 'draft', building: buildingDoc, created_at: 'c1', updated_at: 'u2', location: null,
    })
    await updateProject('1', { name: 'B', status: 'draft', building: buildingDoc as never, location: null })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/1', {
      method: 'PUT',
      body: { name: 'B', status: 'draft', building: buildingDoc, location: null },
    })
  })

  // Project Location v1 — тот же общий Location-тип/formatLocation(), что уже
  // использует Marketplace (см. utils/marketplace.ts) — просто пробрасывается
  // мимо toProject(), без отдельного маппера.
  it('createProject passes a real location straight through to body and result', async () => {
    const location = { city: 'Ташкент', district: 'Юнусабадский' }
    apiFetchMock.mockResolvedValueOnce({
      id: 'srv-2', name: 'A', status: 'draft', building: buildingDoc, created_at: 'c1', updated_at: 'u1', location,
    })
    const result = await createProject({ name: 'A', status: 'draft', building: buildingDoc as never, location })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects', {
      method: 'POST',
      body: { name: 'A', status: 'draft', building: buildingDoc, location },
    })
    expect(result.location).toEqual(location)
  })

  it('getProject maps a real location through unchanged', async () => {
    const location = { city: 'Самарканд', district: 'Центр' }
    apiFetchMock.mockResolvedValueOnce({
      id: '1', name: 'A', status: 'draft', building: buildingDoc, created_at: 'c1', updated_at: 'u1', location,
    })
    const result = await getProject('1')
    expect(result.location).toEqual(location)
  })

  it('deleteProject issues a DELETE and propagates the underlying ApiError on failure', async () => {
    const apiError = { status: 404, code: 'project_not_found', message: 'Project not found' }
    apiFetchMock.mockRejectedValueOnce(apiError)
    await expect(deleteProject('missing')).rejects.toEqual(apiError)
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/missing', { method: 'DELETE', signal: undefined })
  })
})
