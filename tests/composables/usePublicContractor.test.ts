import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetShimState } from '../setup'

const contractorApi = {
  getPublicContractor: vi.fn(),
  getPublicContractors: vi.fn(),
}
vi.mock('~/api/contractor', () => contractorApi)

let usePublicContractor: typeof import('~/composables/usePublicContractor')['usePublicContractor']

beforeEach(async () => {
  vi.resetModules()
  resetShimState()
  vi.clearAllMocks()
  ;({ usePublicContractor } = await import('~/composables/usePublicContractor'))
})

const profile = {
  id: 'c1', name: 'Азиз', description: 'Ремонт квартир', services: [], rating: 4.5, reviewsCount: 2,
}

describe('usePublicContractor — initial state', () => {
  it('starts as undefined (not yet fetched), not loading, no error', () => {
    const { contractor, isLoading, error } = usePublicContractor()
    expect(contractor.value).toBeUndefined()
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })
})

describe('usePublicContractor — fetchContractor: loading + success', () => {
  it('toggles isLoading and populates contractor on success', async () => {
    let resolve!: (v: unknown) => void
    contractorApi.getPublicContractor.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const pc = usePublicContractor()
    const p = pc.fetchContractor('c1')
    expect(pc.isLoading.value).toBe(true)
    resolve(profile)
    await p
    expect(pc.isLoading.value).toBe(false)
    expect(pc.contractor.value).toEqual(profile)
    expect(pc.error.value).toBeNull()
  })
})

describe('usePublicContractor — 404 (contractor_not_found)', () => {
  it('sets contractor to null on 404, not an error', async () => {
    contractorApi.getPublicContractor.mockRejectedValueOnce({ status: 404, code: 'contractor_not_found', message: 'Contractor not found' })
    const pc = usePublicContractor()
    await pc.fetchContractor('missing')
    expect(pc.contractor.value).toBeNull()
    expect(pc.error.value).toBeNull()
  })
})

describe('usePublicContractor — server/network error', () => {
  it('leaves contractor undefined and surfaces the error separately', async () => {
    contractorApi.getPublicContractor.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    const pc = usePublicContractor()
    await pc.fetchContractor('c1')
    expect(pc.contractor.value).toBeUndefined()
    expect(pc.error.value?.code).toBe('internal_error')
  })
})

describe('usePublicContractor — retry', () => {
  it('a second fetchContractor call after a failure can succeed and clears the previous error', async () => {
    contractorApi.getPublicContractor.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    const pc = usePublicContractor()
    await pc.fetchContractor('c1')
    expect(pc.error.value?.code).toBe('internal_error')

    contractorApi.getPublicContractor.mockResolvedValueOnce(profile)
    await pc.fetchContractor('c1')
    expect(pc.error.value).toBeNull()
    expect(pc.contractor.value).toEqual(profile)
  })
})

describe('usePublicContractor — state reset between IDs (см. задание секция TESTS)', () => {
  it('does not show the previous contractor while a new id is loading', async () => {
    contractorApi.getPublicContractor.mockResolvedValueOnce(profile)
    const pc = usePublicContractor()
    await pc.fetchContractor('c1')
    expect(pc.contractor.value).toEqual(profile)

    let resolve!: (v: unknown) => void
    contractorApi.getPublicContractor.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const p = pc.fetchContractor('c2')
    // Пока второй запрос в полёте, старые данные первого мастера не должны
    // "мигать" на экране — contractor должен быть сброшен в undefined.
    expect(pc.contractor.value).toBeUndefined()

    const profile2 = { ...profile, id: 'c2', name: 'Бахтиёр' }
    resolve(profile2)
    await p
    expect(pc.contractor.value).toEqual(profile2)
  })
})

// «Мастера на платформе» v1 — список (fetchContractors/retryContractors),
// тот же composable, отдельное состояние (contractors/contractorsLoading/
// contractorsError), не путать с одиночным contractor выше.
const contractorsList = [profile, { ...profile, id: 'c2', name: 'Бахтиёр', rating: null, reviewsCount: 0 }]

describe('usePublicContractor — fetchContractors: initial state', () => {
  it('starts as an empty array, not loading, no error', () => {
    const { contractors, contractorsLoading, contractorsError } = usePublicContractor()
    expect(contractors.value).toEqual([])
    expect(contractorsLoading.value).toBe(false)
    expect(contractorsError.value).toBeNull()
  })
})

describe('usePublicContractor — fetchContractors: loading + success', () => {
  it('toggles contractorsLoading and populates contractors on success', async () => {
    let resolve!: (v: unknown) => void
    contractorApi.getPublicContractors.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const pc = usePublicContractor()
    const p = pc.fetchContractors()
    expect(pc.contractorsLoading.value).toBe(true)
    resolve(contractorsList)
    await p
    expect(pc.contractorsLoading.value).toBe(false)
    expect(pc.contractors.value).toEqual(contractorsList)
    expect(pc.contractorsError.value).toBeNull()
  })
})

describe('usePublicContractor — fetchContractors: empty list', () => {
  it('an empty backend response is a normal success, not an error', async () => {
    contractorApi.getPublicContractors.mockResolvedValueOnce([])
    const pc = usePublicContractor()
    await pc.fetchContractors()
    expect(pc.contractors.value).toEqual([])
    expect(pc.contractorsError.value).toBeNull()
  })
})

describe('usePublicContractor — fetchContractors: error', () => {
  it('leaves contractors empty and surfaces the error separately (Open Requests must keep working independently)', async () => {
    contractorApi.getPublicContractors.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    const pc = usePublicContractor()
    await pc.fetchContractors()
    expect(pc.contractors.value).toEqual([])
    expect(pc.contractorsError.value?.code).toBe('internal_error')
  })
})

describe('usePublicContractor — fetchContractors: no duplicate requests', () => {
  it('does not re-fetch once already loaded (avoids a request on every reactive update/re-mount)', async () => {
    contractorApi.getPublicContractors.mockResolvedValueOnce(contractorsList)
    const pc = usePublicContractor()
    await pc.fetchContractors()
    expect(contractorApi.getPublicContractors).toHaveBeenCalledTimes(1)

    await pc.fetchContractors()
    await pc.fetchContractors()
    expect(contractorApi.getPublicContractors).toHaveBeenCalledTimes(1)
  })

  it('does not fire a second concurrent request while one is already in flight', async () => {
    let resolve!: (v: unknown) => void
    contractorApi.getPublicContractors.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const pc = usePublicContractor()
    const p1 = pc.fetchContractors()
    const p2 = pc.fetchContractors()
    resolve(contractorsList)
    await Promise.all([p1, p2])
    expect(contractorApi.getPublicContractors).toHaveBeenCalledTimes(1)
  })
})

describe('usePublicContractor — retryContractors', () => {
  it('re-attempts after a failure and clears the previous error on success', async () => {
    contractorApi.getPublicContractors.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    const pc = usePublicContractor()
    await pc.fetchContractors()
    expect(pc.contractorsError.value?.code).toBe('internal_error')

    contractorApi.getPublicContractors.mockResolvedValueOnce(contractorsList)
    await pc.retryContractors()
    expect(pc.contractorsError.value).toBeNull()
    expect(pc.contractors.value).toEqual(contractorsList)
  })

  it('retryContractors actually issues a new request even though the first one "loaded" as failed', async () => {
    contractorApi.getPublicContractors.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    const pc = usePublicContractor()
    await pc.fetchContractors()

    contractorApi.getPublicContractors.mockResolvedValueOnce(contractorsList)
    await pc.retryContractors()
    expect(contractorApi.getPublicContractors).toHaveBeenCalledTimes(2)
  })
})
