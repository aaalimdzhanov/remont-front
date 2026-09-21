import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetShimState } from '../setup'

const ordersApi = {
  createOrder: vi.fn(),
  listOrders: vi.fn(),
  getOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}
vi.mock('~/api/orders', () => ordersApi)

let useOrders: typeof import('~/composables/useOrders')['useOrders']

beforeEach(async () => {
  vi.resetModules()
  resetShimState()
  vi.clearAllMocks()
  ;({ useOrders } = await import('~/composables/useOrders'))
})

const order = {
  id: 'o1', marketplaceOfferId: 'off1', marketplaceRequestId: 'r1', projectWorkId: 'pw1',
  clientUserId: 'u1', contractorId: 'c1', price: 1500000, quantity: 35.5, unit: 'm2' as const,
  status: 'planned' as const, createdAt: 'c', updatedAt: 'u', contractor: null,
}

describe('useOrders — fetchOrders (loading/success/error)', () => {
  it('populates orders on success and toggles loading', async () => {
    let resolveList!: (v: unknown) => void
    ordersApi.listOrders.mockReturnValueOnce(new Promise((r) => { resolveList = r }))
    const o = useOrders()
    const p = o.fetchOrders()
    expect(o.ordersLoading.value).toBe(true)
    resolveList([order])
    await p
    expect(o.ordersLoading.value).toBe(false)
    expect(o.orders.value).toEqual([order])
  })

  it('surfaces an error via ordersError without throwing', async () => {
    ordersApi.listOrders.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    const o = useOrders()
    await o.fetchOrders()
    expect(o.ordersError.value?.code).toBe('internal_error')
    expect(o.orders.value).toEqual([])
  })
})

describe('useOrders — fetchOrder (single order, 404 handling)', () => {
  it('sets currentOrder on success', async () => {
    ordersApi.getOrder.mockResolvedValueOnce(order)
    const o = useOrders()
    await o.fetchOrder('o1')
    expect(o.currentOrder.value).toEqual(order)
  })

  it('sets currentOrder to null on a 404 — Not Found, never reinterpreted as a permission error', async () => {
    ordersApi.getOrder.mockRejectedValueOnce({ status: 404, code: 'order_not_found', message: 'not found' })
    const o = useOrders()
    await o.fetchOrder('missing')
    expect(o.currentOrder.value).toBeNull()
    expect(o.currentOrderError.value).toBeNull()
  })

  it('keeps currentOrder undefined and surfaces a non-404 error separately', async () => {
    ordersApi.getOrder.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    const o = useOrders()
    await o.fetchOrder('o1')
    expect(o.currentOrder.value).toBeUndefined()
    expect(o.currentOrderError.value?.code).toBe('internal_error')
  })

  it('Order Party Details v1: contractor data from GET /orders/{id} is stored as-is on currentOrder', async () => {
    const contractor = { id: 'ct1', name: 'Азиз', description: 'Плитка, 5 лет опыта' }
    ordersApi.getOrder.mockResolvedValueOnce({ ...order, contractor })
    const o = useOrders()
    await o.fetchOrder('o1')
    expect(o.currentOrder.value?.contractor).toEqual(contractor)
  })
})

describe('useOrders — createOrder (from an accepted offer)', () => {
  it('creates an order from an offer id and prepends it to orders', async () => {
    ordersApi.createOrder.mockResolvedValueOnce(order)
    const o = useOrders()
    const result = await o.createOrder('off1')
    expect(ordersApi.createOrder).toHaveBeenCalledWith('off1')
    expect(result).toEqual(order)
    expect(o.orders.value).toEqual([order])
  })

  it('guards against double-submit while a create is already in flight', async () => {
    let resolve!: (v: unknown) => void
    ordersApi.createOrder.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const o = useOrders()
    const first = o.createOrder('off1')
    const second = await o.createOrder('off1')
    expect(second).toBeNull()
    expect(ordersApi.createOrder).toHaveBeenCalledTimes(1)
    resolve(order)
    await first
  })

  it('on 409 order_already_exists, fetches the real order via GET /orders instead of surfacing an error', async () => {
    ordersApi.createOrder.mockRejectedValueOnce({ status: 409, code: 'order_already_exists', message: 'already exists' })
    ordersApi.listOrders.mockResolvedValueOnce([order])
    const o = useOrders()
    const result = await o.createOrder('off1')
    expect(result).toEqual(order)
    expect(o.createOrderError.value).toBeNull()
  })

  it('surfaces a genuine error (e.g. offer not accepted) via createOrderError', async () => {
    ordersApi.createOrder.mockRejectedValueOnce({ status: 409, code: 'offer_not_accepted', message: 'not accepted' })
    const o = useOrders()
    const result = await o.createOrder('off1')
    expect(result).toBeNull()
    expect(o.createOrderError.value?.code).toBe('offer_not_accepted')
  })
})

describe('useOrders — updateStatus (no optimistic update, backend confirms first)', () => {
  it('updates the order in orders and currentOrder on success', async () => {
    const o = useOrders()
    o.orders.value = [order]
    o.currentOrder.value = order
    ordersApi.updateOrderStatus.mockResolvedValueOnce({ ...order, status: 'in_progress' })

    const ok = await o.updateStatus('o1', 'in_progress')

    expect(ok).toBe(true)
    expect(o.orders.value[0]!.status).toBe('in_progress')
    expect(o.currentOrder.value?.status).toBe('in_progress')
  })

  it('leaves state untouched (no optimistic update) when the backend rejects the transition', async () => {
    const o = useOrders()
    o.orders.value = [order]
    ordersApi.updateOrderStatus.mockRejectedValueOnce({ status: 409, code: 'invalid_order_transition', message: 'not allowed' })

    const ok = await o.updateStatus('o1', 'completed')

    expect(ok).toBe(false)
    expect(o.orders.value[0]!.status).toBe('planned')
    expect(o.statusActionError.value?.code).toBe('invalid_order_transition')
  })

  it('guards against concurrent status updates on different orders too (single in-flight action)', async () => {
    let resolve!: (v: unknown) => void
    ordersApi.updateOrderStatus.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const o = useOrders()
    const first = o.updateStatus('o1', 'in_progress')
    const second = await o.updateStatus('o2', 'cancelled')
    expect(second).toBe(false)
    resolve({ ...order, status: 'in_progress' })
    await first
  })
})

describe('useOrders — findOrderByRequestId (best-effort lookup for ProjectWorkCard/OfferCard)', () => {
  it('finds the order matching a marketplace request id', () => {
    const o = useOrders()
    o.orders.value = [order]
    expect(o.findOrderByRequestId('r1')).toEqual(order)
    expect(o.findOrderByRequestId('unknown')).toBeUndefined()
  })
})
