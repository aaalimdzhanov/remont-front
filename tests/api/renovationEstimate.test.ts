import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.fn()
vi.mock('~/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

const { estimateRenovationCost } = await import('~/api/renovationEstimate')

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('estimateRenovationCost', () => {
  it('POSTs the exact backend contract (5 fields, snake_case) to /api/v1/renovation-estimates without auth', async () => {
    apiFetchMock.mockResolvedValueOnce({
      min_amount: 67_000_000,
      max_amount: 86_000_000,
      currency: 'UZS',
      min_amount_per_m2: 1_030_769,
      max_amount_per_m2: 1_323_076,
      labor: { min_amount: 34_000_000, max_amount: 44_000_000 },
      materials: { min_amount: 33_000_000, max_amount: 42_000_000 },
      estimate_version: 2,
    })

    const result = await estimateRenovationCost({
      property_type: 'apartment',
      area: 65,
      condition: 'secondary',
      finish_level: 'standard',
      works: ['walls', 'floor', 'ceiling', 'electricity', 'plumbing'],
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/renovation-estimates', {
      method: 'POST',
      body: {
        property_type: 'apartment',
        area: 65,
        condition: 'secondary',
        finish_level: 'standard',
        works: ['walls', 'floor', 'ceiling', 'electricity', 'plumbing'],
      },
      signal: undefined,
      auth: false,
    })

    // v2 — задание (копия реального ответа backend TEST/MVP-тарифов).
    expect(result).toEqual({
      minAmount: 67_000_000,
      maxAmount: 86_000_000,
      currency: 'UZS',
      minAmountPerM2: 1_030_769,
      maxAmountPerM2: 1_323_076,
      labor: { minAmount: 34_000_000, maxAmount: 44_000_000 },
      materials: { minAmount: 33_000_000, maxAmount: 42_000_000 },
      estimateVersion: 2,
    })
  })

  it('passes decimal area through unchanged (backend accepts float, e.g. 65.5 m²)', async () => {
    apiFetchMock.mockResolvedValueOnce({
      min_amount: 1, max_amount: 2, currency: 'UZS', min_amount_per_m2: 1, max_amount_per_m2: 2,
      labor: { min_amount: 1, max_amount: 1 }, materials: { min_amount: 1, max_amount: 1 }, estimate_version: 2,
    })

    await estimateRenovationCost({
      property_type: 'house', area: 65.5, condition: 'shell', finish_level: 'economy', works: ['walls'],
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/renovation-estimates', expect.objectContaining({
      body: expect.objectContaining({ area: 65.5 }),
    }))
  })

  it('propagates backend errors unchanged (apiFetch/toApiError already normalizes them, see client.test.ts)', async () => {
    const apiError = { status: 503, code: 'renovation_pricing_unavailable', message: 'Сейчас не удалось рассчитать стоимость. Попробуйте немного позже.' }
    apiFetchMock.mockRejectedValueOnce(apiError)

    await expect(estimateRenovationCost({
      property_type: 'apartment', area: 65, condition: 'secondary', finish_level: 'standard', works: ['walls'],
    })).rejects.toEqual(apiError)
  })
})
