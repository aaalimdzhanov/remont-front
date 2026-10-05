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
  deleteContractorPhoto,
  deleteContractorService,
  deletePortfolioItem,
  getContractor,
  getContractorOrNull,
  getPublicContractor,
  getPublicContractors,
  listContractorServices,
  listPortfolioItems,
  reorderPortfolioItems,
  updateContractor,
  updateContractorService,
  uploadContractorPhoto,
  uploadPortfolioItem,
} = await import('~/api/contractor')

const dto = {
  id: 'c1', name: 'Азиз', description: 'Плитка', phone: '+998901234567', status: 'active', profile_photo_url: null, created_at: 'c1', updated_at: 'u1',
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
      id: 'c1', name: 'Азиз', description: 'Плитка', phone: '+998901234567', status: 'active', profilePhotoUrl: null, createdAt: 'c1', updatedAt: 'u1',
    })
  })

  it('getContractor maps a real profile_photo_url through as-is (backend-generated URL, never rebuilt on frontend)', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...dto, profile_photo_url: '/uploads/contractors/c1/abc.jpg' })
    const result = await getContractor()
    expect(result.profilePhotoUrl).toBe('/uploads/contractors/c1/abc.jpg')
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

describe('contractor profile photo api methods (/api/v1/contractor/photo, см. contractor_photo_handler.go)', () => {
  it('uploadContractorPhoto PUTs multipart/form-data with field "file" and returns the full profile', async () => {
    const photoDto = { ...dto, profile_photo_url: '/uploads/contractors/c1/new.jpg' }
    apiFetchMock.mockResolvedValueOnce(photoDto)
    const file = new File([new Uint8Array(10)], 'me.jpg', { type: 'image/jpeg' })
    const result = await uploadContractorPhoto(file)

    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetchMock.mock.calls[0] as [string, { method: string, body: FormData }]
    expect(path).toBe('/api/v1/contractor/photo')
    expect(options.method).toBe('PUT')
    // Реальный FormData — apiFetch()/$fetch не должен получать вручную
    // выставленный Content-Type (браузер сам ставит boundary), тот же
    // паттерн, что и uploadPortfolioItem выше.
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('file')).toBe(file)
    expect(result.profilePhotoUrl).toBe('/uploads/contractors/c1/new.jpg')
  })

  it('deleteContractorPhoto DELETEs /api/v1/contractor/photo (204 No Content — apiFetch<void>, no body to map)', async () => {
    apiFetchMock.mockResolvedValueOnce(undefined)
    await deleteContractorPhoto()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor/photo', { method: 'DELETE' })
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
    location: { city: 'Ташкент', district: 'Юнусабад' },
    profile_photo_url: '/uploads/contractors/c1/photo.jpg',
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
    expect(result.location).toEqual({ city: 'Ташкент', district: 'Юнусабад' })
    expect(result.services).toEqual([
      { workTypeId: 'wt1', workType: 'Штукатурка стен', priceFrom: 150000, priceTo: 300000 },
      { workTypeId: 'wt2', workType: 'Покраска стен', priceFrom: 100000, priceTo: null },
      { workTypeId: 'wt3', workType: 'Демонтаж', priceFrom: null, priceTo: 200000 },
      { workTypeId: 'wt4', workType: 'Сборка мебели', priceFrom: null, priceTo: null },
    ])
    expect(result.profilePhotoUrl).toBe('/uploads/contractors/c1/photo.jpg')
  })

  it('profilePhotoUrl is null when the contractor has no photo', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'c1', name: 'Азиз', description: '', services: [], reviews_count: 0, location: null, profile_photo_url: null })
    const result = await getPublicContractor('c1')
    expect(result.profilePhotoUrl).toBeNull()
  })

  it('nullable rating: reviews_count 0 with rating omitted (omitempty on backend) normalizes to rating: null', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'c1', name: 'Азиз', description: '', services: [], reviews_count: 0, location: null })
    const result = await getPublicContractor('c1')
    expect(result.rating).toBeNull()
    expect(result.reviewsCount).toBe(0)
  })

  it('services is always an array, even when empty', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'c1', name: 'Азиз', description: '', services: [], reviews_count: 0, location: null })
    const result = await getPublicContractor('c1')
    expect(result.services).toEqual([])
  })

  it('never surfaces phone/user_id/status/timestamps — only the public allowlist', async () => {
    apiFetchMock.mockResolvedValueOnce(publicDto)
    const result = await getPublicContractor('c1')
    expect(Object.keys(result).sort()).toEqual(['description', 'id', 'location', 'name', 'portfolio', 'profilePhotoUrl', 'rating', 'reviewsCount', 'services'].sort())
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('userId')
    expect(result).not.toHaveProperty('status')
    expect(result).not.toHaveProperty('createdAt')
    expect(result).not.toHaveProperty('updatedAt')
  })

  // Portfolio v1 — см. public_contractor_dto.go: массив (даже пустой) на
  // detail-запросе одного мастера, null только на списке (см. отдельный
  // describe ниже) — эти два случая нельзя схлопывать в один.
  it('maps a real portfolio array through to camelCase, preserving sort_order', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ...publicDto,
      portfolio: [
        { id: 'p1', image_url: 'http://host/uploads/contractors/c1/p1.jpg', title: 'Ремонт кухни', description: 'До и после', sort_order: 0 },
        { id: 'p2', image_url: 'http://host/uploads/contractors/c1/p2.jpg', title: '', description: '', sort_order: 1 },
      ],
    })
    const result = await getPublicContractor('c1')
    expect(result.portfolio).toEqual([
      { id: 'p1', imageUrl: 'http://host/uploads/contractors/c1/p1.jpg', title: 'Ремонт кухни', description: 'До и после', sortOrder: 0 },
      { id: 'p2', imageUrl: 'http://host/uploads/contractors/c1/p2.jpg', title: '', description: '', sortOrder: 1 },
    ])
  })

  it('an empty portfolio array on detail stays an empty array, not null', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...publicDto, portfolio: [] })
    const result = await getPublicContractor('c1')
    expect(result.portfolio).toEqual([])
  })

  it('portfolio: null on detail passes through as null (not [])', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...publicDto, portfolio: null })
    const result = await getPublicContractor('c1')
    expect(result.portfolio).toBeNull()
  })

  // Location/Address v1 — city/district — где мастер РАБОТАЕТ, не адрес
  // проживания (см. public_contractor_dto.go doc comment). null — контрактор
  // локацию не указал, честно передаётся дальше как null (не выдуманный
  // fallback).
  it('maps location city/district through unchanged', async () => {
    apiFetchMock.mockResolvedValueOnce(publicDto)
    const result = await getPublicContractor('c1')
    expect(result.location).toEqual({ city: 'Ташкент', district: 'Юнусабад' })
  })

  it('location: null passes through as null, not a fabricated address', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'c1', name: 'Азиз', description: '', services: [], reviews_count: 0, location: null })
    const result = await getPublicContractor('c1')
    expect(result.location).toBeNull()
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
      location: { city: 'Ташкент', district: 'Юнусабад' },
      portfolio: null,
    },
    {
      id: 'c2',
      name: 'Мастер Без Отзывов',
      description: '',
      services: [],
      reviews_count: 0,
      location: null,
      portfolio: null,
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

  it('maps every item through the same mapper as getPublicContractor (id/name/description/services/rating/reviewsCount/location)', async () => {
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
        location: { city: 'Ташкент', district: 'Юнусабад' },
        portfolio: null,
      },
      {
        id: 'c2',
        name: 'Мастер Без Отзывов',
        description: '',
        services: [],
        rating: null,
        reviewsCount: 0,
        location: null,
        portfolio: null,
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
      expect(Object.keys(item).sort()).toEqual(['description', 'id', 'location', 'name', 'portfolio', 'profilePhotoUrl', 'rating', 'reviewsCount', 'services'].sort())
      expect(item).not.toHaveProperty('phone')
      expect(item).not.toHaveProperty('userId')
      expect(item).not.toHaveProperty('status')
    }
  })

  // Performance — см. задание, секция PERFORMANCE: список никогда не
  // резолвит portfolio (backend экономит N+1), это должно быть видно и на
  // фронтенде как null, а не как выдуманный [].
  it('portfolio stays null for every list item — the list never resolves it (see PERFORMANCE)', async () => {
    apiFetchMock.mockResolvedValueOnce(listDto)
    const result = await getPublicContractors()
    for (const item of result) {
      expect(item.portfolio).toBeNull()
    }
  })
})

// Portfolio v1 — /api/v1/contractor/portfolio* (см. portfolio_handler.go).
// Owner-facing, требует auth — никакого contractor_id ни в пути, ни в теле
// (см. задание, секция SECURITY): backend сам резолвит "чей" портфолио из
// JWT, фронтенд ничего не передаёт от себя.
describe('Portfolio — /api/v1/contractor/portfolio (owner-facing, auth required)', () => {
  const portfolioItemDto = {
    id: 'p1',
    image_url: 'http://host/uploads/contractors/c1/p1.jpg',
    title: 'Ремонт кухни',
    description: 'До и после',
    sort_order: 0,
    created_at: 'c1',
    updated_at: 'u1',
  }

  it('listPortfolioItems GETs /api/v1/contractor/portfolio and maps to camelCase', async () => {
    apiFetchMock.mockResolvedValueOnce([portfolioItemDto])
    const result = await listPortfolioItems()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor/portfolio')
    expect(result).toEqual([{
      id: 'p1', imageUrl: 'http://host/uploads/contractors/c1/p1.jpg', title: 'Ремонт кухни', description: 'До и после', sortOrder: 0, createdAt: 'c1', updatedAt: 'u1',
    }])
  })

  it('uploadPortfolioItem POSTs multipart/form-data with file/title/description', async () => {
    apiFetchMock.mockResolvedValueOnce(portfolioItemDto)
    const file = new File([new Uint8Array(10)], 'kitchen.jpg', { type: 'image/jpeg' })
    const result = await uploadPortfolioItem(file, 'Ремонт кухни', 'До и после')

    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetchMock.mock.calls[0] as [string, { method: string, body: FormData }]
    expect(path).toBe('/api/v1/contractor/portfolio')
    expect(options.method).toBe('POST')
    // body — реальный FormData, не JSON: apiFetch()/$fetch не должен
    // получать вручную выставленный Content-Type (браузер сам ставит
    // boundary, см. задание, секция 4) — здесь просто проверяем, что ушёл
    // именно FormData с нужными полями, а не plain-object.
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('file')).toBe(file)
    expect(options.body.get('title')).toBe('Ремонт кухни')
    expect(options.body.get('description')).toBe('До и после')
    expect(result.id).toBe('p1')
  })

  it('uploadPortfolioItem omits empty title/description fields entirely rather than sending empty strings', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...portfolioItemDto, title: '', description: '' })
    const file = new File([new Uint8Array(10)], 'kitchen.jpg', { type: 'image/jpeg' })
    await uploadPortfolioItem(file, '', '')

    const options = apiFetchMock.mock.calls[0]![1] as { body: FormData }
    expect(options.body.has('title')).toBe(false)
    expect(options.body.has('description')).toBe(false)
  })

  it('deletePortfolioItem DELETEs /api/v1/contractor/portfolio/{id}', async () => {
    apiFetchMock.mockResolvedValueOnce(undefined)
    await deletePortfolioItem('p1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor/portfolio/p1', { method: 'DELETE' })
  })

  it('reorderPortfolioItems PATCHes the real backend shape ({items:[{id,sort_order}]}) and maps the response', async () => {
    apiFetchMock.mockResolvedValueOnce([{ ...portfolioItemDto, sort_order: 1 }, { ...portfolioItemDto, id: 'p2', sort_order: 0 }])
    const result = await reorderPortfolioItems({ items: [{ id: 'p1', sort_order: 1 }, { id: 'p2', sort_order: 0 }] })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/contractor/portfolio/reorder', {
      method: 'PATCH',
      body: { items: [{ id: 'p1', sort_order: 1 }, { id: 'p2', sort_order: 0 }] },
    })
    expect(result.map(i => i.id)).toEqual(['p1', 'p2'])
    expect(result[0]?.sortOrder).toBe(1)
    expect(result[1]?.sortOrder).toBe(0)
  })
})
