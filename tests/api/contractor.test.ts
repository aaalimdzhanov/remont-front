import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.fn()
vi.mock('~/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  isApiError: (value: unknown): value is { status: number, code: string, message: string } =>
    typeof value === 'object' && value !== null && 'status' in value && 'code' in value && 'message' in value,
}))

const {
  addContractorService,
  createContractor,
  deleteContractorService,
  getContractor,
  getContractorOrNull,
  getPublicContractor,
  getPublicContractors,
  listContractorServices,
  updateContractor,
  updateContractorService,
} = await import('~/api/contractor')

const dto = {
  id: 'c1', name: 'Азиз', description: 'Плитка', phone: '+998901234567', status: 'active', created_at: 'c1', updated_at: 'u1',
}

const serviceDto = {
  id: 's1', work_type_id: 'wt1', work_type: 'Поклейка обоев', unit: 'm2', price_from: 150000, price_to: 300000, created_at: 'c1', updated_at: 'u1',
}

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('contractor api methods', () => {
  it('getContractor GETs /api/v1/contractor and maps to camelCase', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    const result = await getContractor()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor')
    expect(result).toEqual({
      id: 'c1', name: 'Азиз', description: 'Плитка', phone: '+998901234567', status: 'active', createdAt: 'c1', updatedAt: 'u1',
    })
  })

  it('getContractorOrNull returns null on 404 (no contractor profile yet) instead of throwing', async () => {
    apiFetchMock.mockRejectedValueOnce({ status: 404, code: 'contractor_not_found', message: 'not found' })
    const result = await getContractorOrNull()
    expect(result).toBeNull()
  })

  it('getContractorOrNull rethrows non-404 errors (e.g. 401) — not silently swallowed', async () => {
    apiFetchMock.mockRejectedValueOnce({ status: 401, code: 'session_expired', message: 'expired' })
    await expect(getContractorOrNull()).rejects.toMatchObject({ status: 401 })
  })

  it('createContractor POSTs name/description/phone', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    await createContractor({ name: 'Азиз', description: 'Плитка', phone: '+998901234567' })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor', {
      method: 'POST',
      body: { name: 'Азиз', description: 'Плитка', phone: '+998901234567' },
    })
  })

  it('updateContractor PUTs to the same path', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    await updateContractor({ name: 'Азиз', description: 'Плитка', phone: '+998901234567' })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor', {
      method: 'PUT',
      body: { name: 'Азиз', description: 'Плитка', phone: '+998901234567' },
    })
  })
})

describe('contractor service api methods (/api/v1/contractor/services, см. contractor_service_handler.go)', () => {
  it('listContractorServices GETs /api/v1/contractor/services and maps to camelCase', async () => {
    apiFetchMock.mockResolvedValueOnce([serviceDto])
    const result = await listContractorServices()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor/services')
    expect(result).toEqual([{
      id: 's1', workTypeId: 'wt1', workType: 'Поклейка обоев', unit: 'm2', priceFrom: 150000, priceTo: 300000, createdAt: 'c1', updatedAt: 'u1',
    }])
  })

  it('addContractorService POSTs work_type_id/price_from/price_to exactly', async () => {
    apiFetchMock.mockResolvedValueOnce(serviceDto)
    await addContractorService({ work_type_id: 'wt1', price_from: 150000, price_to: 300000 })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor/services', {
      method: 'POST',
      body: { work_type_id: 'wt1', price_from: 150000, price_to: 300000 },
    })
  })

  it('updateContractorService PUTs only price_from/price_to to /{id} — no work_type_id in the payload (immutable)', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...serviceDto, price_from: 200000 })
    await updateContractorService('s1', { price_from: 200000, price_to: 300000 })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor/services/s1', {
      method: 'PUT',
      body: { price_from: 200000, price_to: 300000 },
    })
  })

  it('deleteContractorService DELETEs /{id}', async () => {
    apiFetchMock.mockResolvedValueOnce(undefined)
    await deleteContractorService('s1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor/services/s1', { method: 'DELETE' })
  })
})

describe('Public Contractor Profile v1 — GET /api/v1/contractors/{id} (public_contractor_handler.go, public — no auth)', () => {
  const publicDto = {
    id: 'c1',
    name: 'Азиз',
    description: 'Ремонт квартир и домов',
    services: [
      { work_type_id: 'wt1', work_type: 'Штукатурка стен', price_from: 150000, price_to: 300000 },
      { work_type_id: 'wt2', work_type: 'Покраска стен', price_from: 100000 },
      { work_type_id: 'wt3', work_type: 'Демонтаж', price_to: 200000 },
      { work_type_id: 'wt4', work_type: 'Сборка мебели' },
    ],
    rating: 4.5,
    reviews_count: 2,
  }

  it('getPublicContractor GETs /api/v1/contractors/{id} with auth:false (public endpoint, no Authorization header)', async () => {
    apiFetchMock.mockResolvedValueOnce(publicDto)
    await getPublicContractor('c1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractors/c1', { auth: false })
  })

  it('maps id/name/description/rating/reviewsCount and every service to camelCase', async () => {
    apiFetchMock.mockResolvedValueOnce(publicDto)
    const result = await getPublicContractor('c1')
    expect(result.id).toBe('c1')
    expect(result.name).toBe('Азиз')
    expect(result.description).toBe('Ремонт квартир и домов')
    expect(result.rating).toBe(4.5)
    expect(result.reviewsCount).toBe(2)
    expect(result.services).toEqual([
      { workTypeId: 'wt1', workType: 'Штукатурка стен', priceFrom: 150000, priceTo: 300000 },
      { workTypeId: 'wt2', workType: 'Покраска стен', priceFrom: 100000, priceTo: null },
      { workTypeId: 'wt3', workType: 'Демонтаж', priceFrom: null, priceTo: 200000 },
      { workTypeId: 'wt4', workType: 'Сборка мебели', priceFrom: null, priceTo: null },
    ])
  })

  it('nullable rating: reviews_count 0 with rating omitted (omitempty on backend) normalizes to rating: null', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'c1', name: 'Азиз', description: '', services: [], reviews_count: 0 })
    const result = await getPublicContractor('c1')
    expect(result.rating).toBeNull()
    expect(result.reviewsCount).toBe(0)
  })

  it('services is always an array, even when empty', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'c1', name: 'Азиз', description: '', services: [], reviews_count: 0 })
    const result = await getPublicContractor('c1')
    expect(result.services).toEqual([])
  })

  it('never surfaces phone/user_id/status/timestamps — only the public allowlist', async () => {
    apiFetchMock.mockResolvedValueOnce(publicDto)
    const result = await getPublicContractor('c1')
    expect(Object.keys(result).sort()).toEqual(['description', 'id', 'name', 'rating', 'reviewsCount', 'services'].sort())
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('userId')
    expect(result).not.toHaveProperty('status')
    expect(result).not.toHaveProperty('createdAt')
    expect(result).not.toHaveProperty('updatedAt')
  })
})

// getPublicContractors — «Мастера на платформе» v1: GET /api/v1/contractors
// (list, public, see router.go PublicContractorHandler.List). Backend maps
// every item through the exact same toPublicContractorResponse as the
// single-GET above, so the per-item shape/mapper is identical — this suite
// only needs to confirm the list-specific bits (path, auth:false, array
// mapping), not re-derive every single-item mapping case already covered
// above.
describe('getPublicContractors', () => {
  const listDto = [
    {
      id: 'c1',
      name: 'Азиз',
      description: 'Ремонт квартир и домов',
      services: [{ work_type_id: 'wt1', work_type: 'Штукатурка стен', price_from: 150000, price_to: 300000 }],
      rating: 4.5,
      reviews_count: 2,
    },
    {
      id: 'c2',
      name: 'Мастер Без Отзывов',
      description: '',
      services: [],
      reviews_count: 0,
    },
  ]

  it('GETs /api/v1/contractors with auth:false (public endpoint, no Authorization header)', async () => {
    apiFetchMock.mockResolvedValueOnce([])
    await getPublicContractors()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractors', { auth: false })
  })

  it('is exactly 1 request — no per-contractor follow-up calls', async () => {
    apiFetchMock.mockResolvedValueOnce(listDto)
    await getPublicContractors()
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps every item through the same mapper as getPublicContractor (id/name/description/services/rating/reviewsCount)', async () => {
    apiFetchMock.mockResolvedValueOnce(listDto)
    const result = await getPublicContractors()
    expect(result).toEqual([
      {
        id: 'c1',
        name: 'Азиз',
        description: 'Ремонт квартир и домов',
        services: [{ workTypeId: 'wt1', workType: 'Штукатурка стен', priceFrom: 150000, priceTo: 300000 }],
        rating: 4.5,
        reviewsCount: 2,
      },
      {
        id: 'c2',
        name: 'Мастер Без Отзывов',
        description: '',
        services: [],
        rating: null,
        reviewsCount: 0,
      },
    ])
  })

  it('returns an empty array when the backend has no contractors yet (not an error)', async () => {
    apiFetchMock.mockResolvedValueOnce([])
    const result = await getPublicContractors()
    expect(result).toEqual([])
  })

  it('never surfaces phone/user_id/status/timestamps on any item — only the public allowlist', async () => {
    apiFetchMock.mockResolvedValueOnce(listDto)
    const result = await getPublicContractors()
    for (const item of result) {
      expect(Object.keys(item).sort()).toEqual(['description', 'id', 'name', 'rating', 'reviewsCount', 'services'].sort())
      expect(item).not.toHaveProperty('phone')
      expect(item).not.toHaveProperty('userId')
      expect(item).not.toHaveProperty('status')
    }
  })
})
