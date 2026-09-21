import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.fn()
vi.mock('~/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

const { getWorkCategories, getWorkTypes } = await import('~/api/workCatalog')

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('workCatalog api methods', () => {
  it('getWorkCategories fetches the public catalog without auth and maps to camelCase', async () => {
    apiFetchMock.mockResolvedValueOnce([
      { id: 'c1', name: 'Стены', slug: 'walls', sort_order: 1 },
    ])
    const result = await getWorkCategories()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/work-categories', { signal: undefined, auth: false })
    expect(result).toEqual([{ id: 'c1', name: 'Стены', slug: 'walls', sortOrder: 1 }])
  })

  it('getWorkTypes without categoryId fetches the full catalog', async () => {
    apiFetchMock.mockResolvedValueOnce([])
    await getWorkTypes()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/work-types', { signal: undefined, auth: false })
  })

  it('getWorkTypes with categoryId filters by category_id query param', async () => {
    apiFetchMock.mockResolvedValueOnce([
      {
        id: 'wt1', category_id: 'c1', name: 'Поклейка обоев', slug: 'wallpaper-installation',
        unit: 'm2', measurement_source: 'wall_net_area', quantity_mode: 'automatic', sort_order: 1,
      },
    ])
    const result = await getWorkTypes('c1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/work-types?category_id=c1', { signal: undefined, auth: false })
    expect(result).toEqual([{
      id: 'wt1', categoryId: 'c1', name: 'Поклейка обоев', slug: 'wallpaper-installation',
      unit: 'm2', measurementSource: 'wall_net_area', quantityMode: 'automatic', sortOrder: 1,
    }])
  })
})
