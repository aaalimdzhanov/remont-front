import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.fn()
vi.mock('~/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

const {
  cancelMarketplaceRequest,
  closeMarketplaceRequest,
  createMarketplaceRequest,
  createOffer,
  getMarketplaceRequestForWork,
  getPublicMarketplaceRequest,
  listMyMarketplaceRequests,
  listMyOffers,
  listOffersForRequest,
  listOpenMarketplaceRequests,
  publishMarketplaceRequest,
  updateOfferStatus,
} = await import('~/api/marketplace')

beforeEach(() => {
  apiFetchMock.mockReset()
})

const privateDto = {
  id: 'r1', project_work_id: 'pw1', quantity: 35.5, unit: 'm2', status: 'open', created_at: 'c1', updated_at: 'u1',
}
const openDto = {
  id: 'r1', work_type_id: 'wt1', work_type: 'Поклейка обоев', quantity: 35.5, unit: 'm2', created_at: 'c1', location: null,
}
const offerDto = {
  id: 'o1', marketplace_request_id: 'r1', contractor_id: 'ct1', price: 1500000, comment: 'Сделаю за 3 дня', status: 'pending', created_at: 'c1', updated_at: 'u1',
}

describe('marketplace requests — real backend path family (см. router.go)', () => {
  it('createMarketplaceRequest POSTs to the project/work-scoped path with NO body (backend snapshots quantity itself)', async () => {
    apiFetchMock.mockResolvedValueOnce(privateDto)
    const result = await createMarketplaceRequest('p1', 'w1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works/w1/marketplace-request', { method: 'POST' })
    expect(result).toEqual({
      id: 'r1', projectWorkId: 'pw1', quantity: 35.5, unit: 'm2', status: 'open', createdAt: 'c1', updatedAt: 'u1',
    })
  })

  it('getMarketplaceRequestForWork GETs the project/work-scoped path', async () => {
    apiFetchMock.mockResolvedValueOnce(privateDto)
    await getMarketplaceRequestForWork('p1', 'w1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works/w1/marketplace-request')
  })

  it('cancelMarketplaceRequest and closeMarketplaceRequest POST to their own sub-paths', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...privateDto, status: 'cancelled' })
    await cancelMarketplaceRequest('p1', 'w1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works/w1/marketplace-request/cancel', { method: 'POST' })

    apiFetchMock.mockResolvedValueOnce({ ...privateDto, status: 'closed' })
    await closeMarketplaceRequest('p1', 'w1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works/w1/marketplace-request/close', { method: 'POST' })
  })

  // Draft → Publish v1 — см. remont-back marketplace_request_handler.go
  // Publish(): создание теперь возвращает 'draft', не 'open'.
  it('createMarketplaceRequest passes a real draft response through unchanged', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...privateDto, status: 'draft' })
    const result = await createMarketplaceRequest('p1', 'w1')
    expect(result.status).toBe('draft')
  })

  it('publishMarketplaceRequest POSTs to its own sub-path with no body and returns the now-open request', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...privateDto, status: 'open' })
    const result = await publishMarketplaceRequest('p1', 'w1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/projects/p1/works/w1/marketplace-request/publish', { method: 'POST' })
    expect(result.status).toBe('open')
  })

  it('listMyMarketplaceRequests uses /marketplace/requests (slash, not hyphen)', async () => {
    apiFetchMock.mockResolvedValueOnce([privateDto])
    const result = await listMyMarketplaceRequests()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/marketplace/requests')
    expect(result[0]).not.toHaveProperty('workType') // приватная форма НЕ содержит work_type
  })

  it('listOpenMarketplaceRequests uses /marketplace/requests/open and is public (auth:false)', async () => {
    apiFetchMock.mockResolvedValueOnce([openDto])
    const result = await listOpenMarketplaceRequests()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/marketplace/requests/open', { auth: false })
    expect(result[0]).toEqual({
      id: 'r1', workTypeId: 'wt1', workType: 'Поклейка обоев', quantity: 35.5, unit: 'm2', createdAt: 'c1', location: null,
    })
    expect(result[0]).not.toHaveProperty('status') // публичная форма НЕ содержит status/project_work_id
  })

  it('listOpenMarketplaceRequests returns an empty array when there are no open requests (not an error)', async () => {
    apiFetchMock.mockResolvedValueOnce([])
    const result = await listOpenMarketplaceRequests()
    expect(result).toEqual([])
  })

  // Project Location в Marketplace v1 — location проброшен от backend как
  // есть (coarse city/district | null), без второго форматтера/маппера.
  it('listOpenMarketplaceRequests maps a real location through unchanged', async () => {
    apiFetchMock.mockResolvedValueOnce([{ ...openDto, location: { city: 'Ташкент', district: 'Юнусабадский район' } }])
    const result = await listOpenMarketplaceRequests()
    expect(result[0].location).toEqual({ city: 'Ташкент', district: 'Юнусабадский район' })
  })

  it('listOpenMarketplaceRequests keeps location: null as null, not a fabricated address', async () => {
    apiFetchMock.mockResolvedValueOnce([openDto])
    const result = await listOpenMarketplaceRequests()
    expect(result[0].location).toBeNull()
  })
})

// Marketplace Request Detail v2 — the one public single-request endpoint,
// under the hyphenated marketplace-requests family (like offers), distinct
// from both listMyMarketplaceRequests (private) and listOpenMarketplaceRequests
// (public, open-only, no status field at all).
describe('getPublicMarketplaceRequest — public (auth:false), any status', () => {
  it('GETs /marketplace-requests/{id} with auth:false and maps status too', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'r1', work_type_id: 'wt1', work_type: 'Поклейка обоев', quantity: 35.5, unit: 'm2', status: 'closed', created_at: 'c1', location: null,
    })
    const result = await getPublicMarketplaceRequest('r1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/marketplace-requests/r1', { auth: false })
    expect(result).toEqual({
      id: 'r1', workTypeId: 'wt1', workType: 'Поклейка обоев', quantity: 35.5, unit: 'm2', status: 'closed', createdAt: 'c1', location: null,
    })
  })

  it('URL-encodes the id', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'a/b', work_type_id: 'wt1', work_type: 'X', quantity: 1, unit: 'pcs', status: 'open', created_at: 'c1', location: null })
    await getPublicMarketplaceRequest('a/b')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/marketplace-requests/a%2Fb', { auth: false })
  })

  // Project Location в Marketplace v1 — тот же общий Location-тип и
  // formatLocation(), что уже используют Contractor/OpenMarketplaceRequest.
  it('maps a real location through unchanged', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'r1', work_type_id: 'wt1', work_type: 'Поклейка обоев', quantity: 35.5, unit: 'm2', status: 'open', created_at: 'c1',
      location: { city: 'Ташкент', district: 'Юнусабадский район' },
    })
    const result = await getPublicMarketplaceRequest('r1')
    expect(result.location).toEqual({ city: 'Ташкент', district: 'Юнусабадский район' })
  })

  it('location: null passes through as null, not a fabricated address', async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: 'r1', work_type_id: 'wt1', work_type: 'Поклейка обоев', quantity: 35.5, unit: 'm2', status: 'open', created_at: 'c1', location: null,
    })
    const result = await getPublicMarketplaceRequest('r1')
    expect(result.location).toBeNull()
  })
})

describe('marketplace offers — hyphenated path family, distinct from requests', () => {
  it('createOffer POSTs price/comment to the hyphenated marketplace-requests path', async () => {
    apiFetchMock.mockResolvedValueOnce(offerDto)
    const result = await createOffer('r1', { price: 1500000, comment: 'Сделаю за 3 дня' })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/marketplace-requests/r1/offers', {
      method: 'POST',
      body: { price: 1500000, comment: 'Сделаю за 3 дня' },
    })
    expect(result.price).toBe(1500000)
    expect(Number.isInteger(result.price)).toBe(true) // price всегда целое (int64 backend)
  })

  it('listOffersForRequest GETs the same hyphenated path', async () => {
    apiFetchMock.mockResolvedValueOnce([offerDto])
    await listOffersForRequest('r1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/marketplace-requests/r1/offers')
  })

  it('listMyOffers GETs /offers/mine', async () => {
    apiFetchMock.mockResolvedValueOnce([offerDto])
    await listMyOffers()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/offers/mine')
  })

  it('updateOfferStatus PATCHes /offers/{id}/status with exactly {status}', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...offerDto, status: 'accepted' })
    const result = await updateOfferStatus('o1', 'accepted')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/offers/o1/status', { method: 'PATCH', body: { status: 'accepted' } })
    expect(result.status).toBe('accepted')
  })
})
