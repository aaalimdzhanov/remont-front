import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetShimState } from '../setup'

const marketplaceApi = {
  createMarketplaceRequest: vi.fn(),
  getMarketplaceRequestForWork: vi.fn(),
  getPublicMarketplaceRequest: vi.fn(),
  cancelMarketplaceRequest: vi.fn(),
  closeMarketplaceRequest: vi.fn(),
  listMyMarketplaceRequests: vi.fn(),
  listOpenMarketplaceRequests: vi.fn(),
  createOffer: vi.fn(),
  listOffersForRequest: vi.fn(),
  listMyOffers: vi.fn(),
  updateOfferStatus: vi.fn(),
}
vi.mock('~/api/marketplace', () => marketplaceApi)

const contractorApi = {
  getContractorOrNull: vi.fn(),
  createContractor: vi.fn(),
  updateContractor: vi.fn(),
  listContractorServices: vi.fn(),
  addContractorService: vi.fn(),
  updateContractorService: vi.fn(),
  deleteContractorService: vi.fn(),
}
vi.mock('~/api/contractor', () => contractorApi)

const workCatalogApi = {
  getWorkCategories: vi.fn(),
  getWorkTypes: vi.fn(),
}
vi.mock('~/api/workCatalog', () => workCatalogApi)

let useMarketplace: typeof import('~/composables/useMarketplace')['useMarketplace']

beforeEach(async () => {
  vi.resetModules()
  resetShimState()
  vi.clearAllMocks()
  ;({ useMarketplace } = await import('~/composables/useMarketplace'))
})

const openReq = { id: 'r1', workTypeId: 'wt1', workType: 'Поклейка обоев', quantity: 35.5, unit: 'm2' as const, createdAt: 'c1' }
const privateReq = { id: 'r1', projectWorkId: 'pw1', quantity: 35.5, unit: 'm2' as const, status: 'open' as const, createdAt: 'c1', updatedAt: 'u1' }
const offer = { id: 'o1', marketplaceRequestId: 'r1', contractorId: 'ct1', price: 1500000, comment: null, status: 'pending' as const, createdAt: 'c1', updatedAt: 'u1' }

describe('useMarketplace — work request status cache (ProjectWorkCard)', () => {
  it('checkWorkRequest caches "none" on a 404 (no request yet), not an error', async () => {
    marketplaceApi.getMarketplaceRequestForWork.mockRejectedValueOnce({ status: 404, code: 'marketplace_request_not_found', message: 'not found' })
    const mp = useMarketplace()
    await mp.checkWorkRequest('p1', 'w1')
    expect(mp.workRequestCache.value.w1).toBe('none')
  })

  it('checkWorkRequest caches the real request object when one exists', async () => {
    marketplaceApi.getMarketplaceRequestForWork.mockResolvedValueOnce(privateReq)
    const mp = useMarketplace()
    await mp.checkWorkRequest('p1', 'w1')
    expect(mp.workRequestCache.value.w1).toEqual(privateReq)
  })

  it('does not fire a second request for the same workId while one is already in flight', async () => {
    let resolve: (v: unknown) => void = () => {}
    marketplaceApi.getMarketplaceRequestForWork.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const mp = useMarketplace()
    const first = mp.checkWorkRequest('p1', 'w1')
    await mp.checkWorkRequest('p1', 'w1') // should be a no-op while first is pending
    expect(marketplaceApi.getMarketplaceRequestForWork).toHaveBeenCalledTimes(1)
    resolve(privateReq)
    await first
  })
})

describe('useMarketplace — creating a request ("Найти мастера")', () => {
  it('createRequestForWork adds to myRequests and warms the per-work cache with the real response', async () => {
    marketplaceApi.createMarketplaceRequest.mockResolvedValueOnce(privateReq)
    const mp = useMarketplace()
    const result = await mp.createRequestForWork('p1', 'pw1')
    expect(result).toEqual(privateReq)
    expect(mp.myRequests.value).toEqual([privateReq])
  })

  it('guards against double-submit while a create is already in flight', async () => {
    let resolve: (v: unknown) => void = () => {}
    marketplaceApi.createMarketplaceRequest.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const mp = useMarketplace()
    const first = mp.createRequestForWork('p1', 'w1')
    const second = await mp.createRequestForWork('p1', 'w1')
    expect(second).toBeNull()
    expect(marketplaceApi.createMarketplaceRequest).toHaveBeenCalledTimes(1)
    resolve(privateReq)
    await first
  })
})

describe('useMarketplace — open requests warm the best-effort title cache', () => {
  it('loadOpenRequests populates requestTitleCache with real work_type data seen this session', async () => {
    marketplaceApi.listOpenMarketplaceRequests.mockResolvedValueOnce([openReq])
    const mp = useMarketplace()
    await mp.loadOpenRequests()
    expect(mp.openRequests.value).toEqual([openReq])
    expect(mp.requestTitleCache.value.r1).toEqual(openReq)
  })
})

// Public Marketplace v1: loadOpenRequests is the one call a guest page makes
// on mount (see pages/marketplace/index.vue, requests/[id].vue) — it must
// work standalone, without loadMyRequests/loadContractor ever being called,
// and recover cleanly on retry (see задание, секция TESTS: "guest loading;
// success; error; retry").
describe('useMarketplace — loadOpenRequests as a guest (no auth-required calls)', () => {
  it('surfaces a network/server error via openRequestsError, not a thrown exception', async () => {
    marketplaceApi.listOpenMarketplaceRequests.mockRejectedValueOnce({ status: 0, code: 'network_error', message: 'Не удалось подключиться к серверу.' })
    const mp = useMarketplace()
    await mp.loadOpenRequests()
    expect(mp.openRequests.value).toEqual([])
    expect(mp.openRequestsError.value?.code).toBe('network_error')
    expect(mp.openRequestsLoading.value).toBe(false)
  })

  it('retrying loadOpenRequests after an error clears the error and populates the list', async () => {
    marketplaceApi.listOpenMarketplaceRequests.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'Internal server error' })
    const mp = useMarketplace()
    await mp.loadOpenRequests()
    expect(mp.openRequestsError.value).not.toBeNull()

    marketplaceApi.listOpenMarketplaceRequests.mockResolvedValueOnce([openReq])
    await mp.loadOpenRequests()
    expect(mp.openRequestsError.value).toBeNull()
    expect(mp.openRequests.value).toEqual([openReq])
  })

  it('never calls the authenticated ListMine/contractor endpoints on its own', async () => {
    marketplaceApi.listOpenMarketplaceRequests.mockResolvedValueOnce([openReq])
    const mp = useMarketplace()
    await mp.loadOpenRequests()
    expect(marketplaceApi.listMyMarketplaceRequests).not.toHaveBeenCalled()
    expect(contractorApi.getContractorOrNull).not.toHaveBeenCalled()
  })
})

// Marketplace Request Detail v2 — loadRequestDetail() is the single public
// call pages/marketplace/requests/[id].vue makes for ANY viewer (guest,
// owner, or contractor) to learn what the request actually is. See задание,
// секция TESTS: "guest; client owner; contractor; stranger; 404; retry".
const publicReq = { id: 'r1', workTypeId: 'wt1', workType: 'Поклейка обоев', quantity: 35.5, unit: 'm2' as const, status: 'open' as const, createdAt: 'c1' }

describe('useMarketplace — loadRequestDetail (public, any status)', () => {
  it('populates requestDetail on success', async () => {
    marketplaceApi.getPublicMarketplaceRequest.mockResolvedValueOnce(publicReq)
    const mp = useMarketplace()
    await mp.loadRequestDetail('r1')
    expect(marketplaceApi.getPublicMarketplaceRequest).toHaveBeenCalledWith('r1')
    expect(mp.requestDetail.value).toEqual(publicReq)
    expect(mp.requestDetailLoading.value).toBe(false)
    expect(mp.requestDetailError.value).toBeNull()
  })

  it('caches a 404 as requestDetail = null, not an error (stranger/unknown id)', async () => {
    marketplaceApi.getPublicMarketplaceRequest.mockRejectedValueOnce({ status: 404, code: 'marketplace_request_not_found', message: 'not found' })
    const mp = useMarketplace()
    await mp.loadRequestDetail('does-not-exist')
    expect(mp.requestDetail.value).toBeNull()
    expect(mp.requestDetailError.value).toBeNull()
  })

  it('surfaces a network/server error via requestDetailError, leaving requestDetail unset (not a false not-found)', async () => {
    marketplaceApi.getPublicMarketplaceRequest.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'Internal server error' })
    const mp = useMarketplace()
    await mp.loadRequestDetail('r1')
    expect(mp.requestDetail.value).toBeUndefined()
    expect(mp.requestDetailError.value?.code).toBe('internal_error')
  })

  it('retrying after an error clears the error and populates requestDetail', async () => {
    marketplaceApi.getPublicMarketplaceRequest.mockRejectedValueOnce({ status: 0, code: 'network_error', message: 'offline' })
    const mp = useMarketplace()
    await mp.loadRequestDetail('r1')
    expect(mp.requestDetailError.value).not.toBeNull()

    marketplaceApi.getPublicMarketplaceRequest.mockResolvedValueOnce(publicReq)
    await mp.loadRequestDetail('r1')
    expect(mp.requestDetailError.value).toBeNull()
    expect(mp.requestDetail.value).toEqual(publicReq)
  })

  it('resets requestDetail to undefined at the start of every call, so a stale previous request never flashes', async () => {
    marketplaceApi.getPublicMarketplaceRequest.mockResolvedValueOnce(publicReq)
    const mp = useMarketplace()
    await mp.loadRequestDetail('r1')
    expect(mp.requestDetail.value).toEqual(publicReq)

    let sawUndefinedMidFlight = false
    marketplaceApi.getPublicMarketplaceRequest.mockImplementationOnce(async () => {
      sawUndefinedMidFlight = mp.requestDetail.value === undefined
      return { ...publicReq, id: 'r2', workType: 'Другая работа' }
    })
    await mp.loadRequestDetail('r2')
    expect(sawUndefinedMidFlight).toBe(true)
    expect(mp.requestDetail.value?.id).toBe('r2')
  })
})

describe('useMarketplace — offers', () => {
  it('submitOffer adds the created offer to myOffers, using the backend-returned (int64) price verbatim', async () => {
    marketplaceApi.createOffer.mockResolvedValueOnce(offer)
    const mp = useMarketplace()
    const result = await mp.submitOffer('r1', { price: 1500000, comment: null })
    expect(result).toEqual(offer)
    expect(mp.myOffers.value).toEqual([offer])
  })

  it('setOfferStatus updates the offer in both requestOffers and myOffers wherever present', async () => {
    const mp = useMarketplace()
    mp.requestOffers.value = [offer]
    mp.myOffers.value = [offer]
    marketplaceApi.updateOfferStatus.mockResolvedValueOnce({ ...offer, status: 'accepted' })
    const ok = await mp.setOfferStatus('o1', 'accepted')
    expect(ok).toBe(true)
    expect(mp.requestOffers.value[0]!.status).toBe('accepted')
    expect(mp.myOffers.value[0]!.status).toBe('accepted')
  })

  it('surfaces a 409 offer_already_accepted conflict as offerActionError without mutating local state', async () => {
    const mp = useMarketplace()
    mp.requestOffers.value = [offer]
    marketplaceApi.updateOfferStatus.mockRejectedValueOnce({ status: 409, code: 'offer_already_accepted', message: 'This marketplace request already has an accepted offer' })
    const ok = await mp.setOfferStatus('o1', 'accepted')
    expect(ok).toBe(false)
    expect(mp.offerActionError.value?.code).toBe('offer_already_accepted')
    expect(mp.requestOffers.value[0]!.status).toBe('pending') // не изменилось локально без успешного ответа
  })
})

describe('useMarketplace — contractor profile gate', () => {
  it('loadContractor sets contractor to null when none exists yet (getContractorOrNull resolves null)', async () => {
    contractorApi.getContractorOrNull.mockResolvedValueOnce(null)
    const mp = useMarketplace()
    await mp.loadContractor()
    expect(mp.contractor.value).toBeNull()
  })

  it('createContractorProfile stores the created profile on success', async () => {
    const created = { id: 'c1', name: 'Азиз', description: '', phone: '+998901234567', status: 'active', createdAt: 'c', updatedAt: 'c' }
    contractorApi.createContractor.mockResolvedValueOnce(created)
    const mp = useMarketplace()
    const ok = await mp.createContractorProfile({ name: 'Азиз', description: '', phone: '+998901234567' })
    expect(ok).toBe(true)
    expect(mp.contractor.value).toEqual(created)
  })

  it('updateContractorProfile stores the updated profile using its own loading/error state, not createContractorProfile\'s', async () => {
    const updated = { id: 'c1', name: 'Азиз Улугбекович', description: 'Плитка', phone: '+998901234567', status: 'active', createdAt: 'c', updatedAt: 'u2' }
    contractorApi.updateContractor.mockResolvedValueOnce(updated)
    const mp = useMarketplace()
    const ok = await mp.updateContractorProfile({ name: 'Азиз Улугбекович', description: 'Плитка', phone: '+998901234567' })
    expect(ok).toBe(true)
    expect(mp.contractor.value).toEqual(updated)
    expect(mp.isSavingContractor.value).toBe(false)
  })

  it('updateContractorProfile surfaces a failure via saveContractorError without touching contractorError', async () => {
    contractorApi.updateContractor.mockRejectedValueOnce({ status: 400, code: 'invalid_request', message: 'name is required' })
    const mp = useMarketplace()
    const ok = await mp.updateContractorProfile({ name: '', description: '', phone: '' })
    expect(ok).toBe(false)
    expect(mp.saveContractorError.value?.code).toBe('invalid_request')
    expect(mp.contractorError.value).toBeNull()
  })
})

describe('useMarketplace — ContractorService list (Мои услуги)', () => {
  const service = { id: 's1', workTypeId: 'wt1', workType: 'Поклейка обоев', unit: 'm2' as const, priceFrom: 150000, priceTo: 300000, createdAt: 'c1', updatedAt: 'u1' }

  it('loadServices populates services from listContractorServices', async () => {
    contractorApi.listContractorServices.mockResolvedValueOnce([service])
    const mp = useMarketplace()
    await mp.loadServices()
    expect(mp.services.value).toEqual([service])
  })

  it('addService appends the created service to the list on success', async () => {
    contractorApi.addContractorService.mockResolvedValueOnce(service)
    const mp = useMarketplace()
    const created = await mp.addService({ work_type_id: 'wt1', price_from: 150000, price_to: 300000 })
    expect(created).toEqual(service)
    expect(mp.services.value).toEqual([service])
  })

  it('addService surfaces a 409 duplicate as addServiceError without adding a local placeholder', async () => {
    contractorApi.addContractorService.mockRejectedValueOnce({ status: 409, code: 'contractor_service_already_exists', message: 'This work type is already in your service list' })
    const mp = useMarketplace()
    const created = await mp.addService({ work_type_id: 'wt1', price_from: null, price_to: null })
    expect(created).toBeNull()
    expect(mp.addServiceError.value?.code).toBe('contractor_service_already_exists')
    expect(mp.services.value).toEqual([])
  })

  it('updateService replaces the matching service in place, using serviceActionId to guard concurrent calls', async () => {
    const mp = useMarketplace()
    mp.services.value = [service]
    contractorApi.updateContractorService.mockResolvedValueOnce({ ...service, priceFrom: 200000 })
    const ok = await mp.updateService('s1', { price_from: 200000, price_to: 300000 })
    expect(ok).toBe(true)
    expect(mp.services.value[0]!.priceFrom).toBe(200000)
  })

  it('deleteService removes the service from the list on success', async () => {
    const mp = useMarketplace()
    mp.services.value = [service]
    contractorApi.deleteContractorService.mockResolvedValueOnce(undefined)
    const ok = await mp.deleteService('s1')
    expect(ok).toBe(true)
    expect(mp.services.value).toEqual([])
  })

  it('deleteService keeps the service on a failed delete and surfaces serviceActionError', async () => {
    const mp = useMarketplace()
    mp.services.value = [service]
    contractorApi.deleteContractorService.mockRejectedValueOnce({ status: 404, code: 'contractor_service_not_found', message: 'not found' })
    const ok = await mp.deleteService('s1')
    expect(ok).toBe(false)
    expect(mp.services.value).toEqual([service])
    expect(mp.serviceActionError.value?.code).toBe('contractor_service_not_found')
  })
})

describe('useMarketplace — /marketplace request filters', () => {
  it('resetRequestFilters restores defaults after setRequestFilter changed them', async () => {
    const mp = useMarketplace()
    mp.setRequestFilter({ categoryId: 'cat1', workTypeId: 'wt1', quantityMin: 5 })
    expect(mp.requestFilters.value).toMatchObject({ categoryId: 'cat1', workTypeId: 'wt1', quantityMin: 5 })
    mp.resetRequestFilters()
    expect(mp.requestFilters.value).toEqual({ categoryId: null, workTypeId: null, quantityMin: null, quantityMax: null, sort: 'newest' })
  })

  it('filteredOpenRequests narrows openRequests using the loaded work-type -> category map', async () => {
    workCatalogApi.getWorkCategories.mockResolvedValueOnce([{ id: 'cat-walls', name: 'Стены', slug: 'walls', sortOrder: 1 }])
    workCatalogApi.getWorkTypes.mockResolvedValueOnce([
      { id: 'wt-wall', categoryId: 'cat-walls', name: 'Поклейка обоев', slug: 'wallpaper', unit: 'm2', measurementSource: 'wall_net_area', quantityMode: 'automatic', sortOrder: 1 },
      { id: 'wt-floor', categoryId: 'cat-floors', name: 'Ламинат', slug: 'laminate', unit: 'm2', measurementSource: 'floor_area', quantityMode: 'automatic', sortOrder: 1 },
    ])
    const mp = useMarketplace()
    await mp.loadFilterCatalog()
    mp.openRequests.value = [
      { id: 'r1', workTypeId: 'wt-wall', workType: 'Поклейка обоев', quantity: 10, unit: 'm2', createdAt: 'c1' },
      { id: 'r2', workTypeId: 'wt-floor', workType: 'Ламинат', quantity: 20, unit: 'm2', createdAt: 'c2' },
    ]
    mp.setRequestFilter({ categoryId: 'cat-walls' })
    expect(mp.filteredOpenRequests.value.map(r => r.id)).toEqual(['r1'])
  })
})
