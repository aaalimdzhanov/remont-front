import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.fn()
vi.mock('~/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

const { createOrder, getOrder, listOrders, updateOrderStatus } = await import('~/api/orders')

beforeEach(() => {
  apiFetchMock.mockReset()
})

const dto = {
  id: 'o1',
  marketplace_offer_id: 'off1',
  marketplace_request_id: 'r1',
  project_work_id: 'pw1',
  client_user_id: 'u1',
  contractor_id: 'c1',
  price: 1500000,
  quantity: 35.5,
  unit: 'm2',
  status: 'planned',
  created_at: 'c',
  updated_at: 'u',
}

const order = {
  id: 'o1',
  marketplaceOfferId: 'off1',
  marketplaceRequestId: 'r1',
  projectWorkId: 'pw1',
  clientUserId: 'u1',
  contractorId: 'c1',
  price: 1500000,
  quantity: 35.5,
  unit: 'm2',
  status: 'planned',
  createdAt: 'c',
  updatedAt: 'u',
  // ListMine/Create/UpdateStatus DTOs have no `contractor` key at all (see
  // order_dto.go — только single-order GET использует orderDetailResponse)
  // — toOrder() нормализует отсутствие в null, а не undefined.
  contractor: null,
}

describe('order api methods (см. order_handler.go — реальный backend contract)', () => {
  it('createOrder POSTs to /api/v1/marketplace-offers/{offer_id}/order — NOT a marketplace-requests path', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    const result = await createOrder('off1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/marketplace-offers/off1/order', { method: 'POST' })
    expect(result).toEqual(order)
  })

  it('createOrder sends no request body at all (backend resolves everything from the accepted offer)', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    await createOrder('off1')
    const callArgs = apiFetchMock.mock.calls[0]!
    expect(callArgs[1]).toEqual({ method: 'POST' })
    expect(callArgs[1]).not.toHaveProperty('body')
  })

  it('listOrders GETs /api/v1/orders and maps every field to camelCase', async () => {
    apiFetchMock.mockResolvedValueOnce([dto])
    const result = await listOrders()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/orders')
    expect(result).toEqual([order])
  })

  it('getOrder GETs /api/v1/orders/{id}', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    const result = await getOrder('o1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/orders/o1')
    expect(result).toEqual(order)
  })

  it('updateOrderStatus PATCHes /api/v1/orders/{id}/status with exactly {status}', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...dto, status: 'in_progress' })
    const result = await updateOrderStatus('o1', 'in_progress')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/orders/o1/status', { method: 'PATCH', body: { status: 'in_progress' } })
    expect(result.status).toBe('in_progress')
  })

  it('price stays an exact integer end to end (int64 on the backend, never float)', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    const result = await getOrder('o1')
    expect(Number.isInteger(result.price)).toBe(true)
  })
})

describe('Order Party Details v1 — contractor summary (только GET /orders/{id}, см. order_dto.go orderDetailResponse)', () => {
  const dtoWithContractor = {
    ...dto,
    contractor: { id: 'ct1', name: 'Азиз', description: 'Плитка, 5 лет опыта', rating: 4.8, reviews_count: 12 },
  }

  it('getOrder parses contractor.id/name/description/rating/reviewsCount onto Order.contractor', async () => {
    apiFetchMock.mockResolvedValueOnce(dtoWithContractor)
    const result = await getOrder('o1')
    expect(result.contractor).toEqual({ id: 'ct1', name: 'Азиз', description: 'Плитка, 5 лет опыта', rating: 4.8, reviewsCount: 12 })
  })

  it('never surfaces phone or any other Contractor field beyond id/name/description/rating/reviewsCount', async () => {
    apiFetchMock.mockResolvedValueOnce(dtoWithContractor)
    const result = await getOrder('o1')
    expect(Object.keys(result.contractor!).sort()).toEqual(['description', 'id', 'name', 'rating', 'reviewsCount'])
    expect(result.contractor).not.toHaveProperty('phone')
    expect(result.contractor).not.toHaveProperty('status')
    expect(result.contractor).not.toHaveProperty('user_id')
  })
})

describe('Marketplace Review & Rating v1 — contractor.rating/reviews_count aggregate (см. задание секция 13/19)', () => {
  it('nullable contractor rating: rating omitted from the DTO (reviews_count: 0) normalizes to rating: null', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...dto, contractor: { id: 'ct1', name: 'Азиз', description: '', reviews_count: 0 } })
    const result = await getOrder('o1')
    expect(result.contractor?.rating).toBeNull()
    expect(result.contractor?.reviewsCount).toBe(0)
  })

  it('a real rating/reviews_count pair passes through untouched (backend aggregate, never recomputed)', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...dto, contractor: { id: 'ct1', name: 'Азиз', description: '', rating: 3.5, reviews_count: 2 } })
    const result = await getOrder('o1')
    expect(result.contractor?.rating).toBe(3.5)
    expect(result.contractor?.reviewsCount).toBe(2)
  })

  it('listOrders/createOrder/updateOrderStatus responses (no contractor key in the DTO) normalize to contractor: null, not undefined', async () => {
    apiFetchMock.mockResolvedValueOnce([dto])
    const list = await listOrders()
    expect(list[0]!.contractor).toBeNull()

    apiFetchMock.mockResolvedValueOnce(dto)
    const created = await createOrder('off1')
    expect(created.contractor).toBeNull()
  })

  it('an explicit contractor: null in the response (defensive edge case) also maps to null, not a crash', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...dto, contractor: null })
    const result = await getOrder('o1')
    expect(result.contractor).toBeNull()
  })
})
