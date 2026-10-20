import { beforeEach, describe, expect, it, vi } from 'vitest'

const estimateRenovationCostMock = vi.fn()
vi.mock('~/api/renovationEstimate', () => ({
  estimateRenovationCost: (...args: unknown[]) => estimateRenovationCostMock(...args),
}))

const { useRenovationEstimateFlow } = await import('~/composables/useRenovationEstimateFlow')

const VALID_RESULT = {
  minAmount: 67_000_000,
  maxAmount: 86_000_000,
  currency: 'UZS',
  minAmountPerM2: 1_030_769,
  maxAmountPerM2: 1_323_076,
  labor: { minAmount: 34_000_000, maxAmount: 44_000_000 },
  materials: { minAmount: 33_000_000, maxAmount: 42_000_000 },
  estimateVersion: 2,
}

function fillAllSteps(flow: ReturnType<typeof useRenovationEstimateFlow>) {
  flow.propertyType.value = 'apartment'
  flow.area.value = 65
  flow.condition.value = 'secondary'
  flow.finishLevel.value = 'standard'
  flow.works.value = ['walls', 'floor']
}

beforeEach(() => {
  estimateRenovationCostMock.mockReset()
})

describe('useRenovationEstimateFlow — step validation (canProceed)', () => {
  it('step 1 requires a property type', () => {
    const flow = useRenovationEstimateFlow()
    expect(flow.canProceed.value).toBe(false)
    flow.propertyType.value = 'apartment'
    expect(flow.canProceed.value).toBe(true)
  })

  it('step 2 requires a valid area (1–1000, rejects null/NaN/out-of-range)', () => {
    const flow = useRenovationEstimateFlow()
    flow.propertyType.value = 'apartment'
    flow.step.value = 2
    expect(flow.canProceed.value).toBe(false)
    flow.area.value = 0
    expect(flow.canProceed.value).toBe(false)
    flow.area.value = Number.NaN
    expect(flow.canProceed.value).toBe(false)
    flow.area.value = 1001
    expect(flow.canProceed.value).toBe(false)
    flow.area.value = 65.5
    expect(flow.canProceed.value).toBe(true)
  })

  it('step 5 requires at least one selected work type', () => {
    const flow = useRenovationEstimateFlow()
    flow.step.value = 5
    expect(flow.canProceed.value).toBe(false)
    flow.toggleWork('walls')
    expect(flow.canProceed.value).toBe(true)
    flow.toggleWork('walls')
    expect(flow.canProceed.value).toBe(false)
  })

  it('toggleWork never includes "other" unless explicitly toggled — the UI simply never offers it (see renovation-estimate.vue WORK_OPTIONS)', () => {
    const flow = useRenovationEstimateFlow()
    flow.toggleWork('walls')
    flow.toggleWork('doors')
    expect(flow.works.value).toEqual(['walls', 'doors'])
    expect(flow.works.value).not.toContain('other')
  })
})

describe('useRenovationEstimateFlow — goNext/goBack preserve answers', () => {
  it('goNext does not call the API before the final step', async () => {
    const flow = useRenovationEstimateFlow()
    flow.propertyType.value = 'apartment'
    await flow.goNext()
    expect(flow.step.value).toBe(2)
    expect(estimateRenovationCostMock).not.toHaveBeenCalled()
  })

  it('goNext refuses to advance past an invalid step (no request fires on invalid data)', async () => {
    const flow = useRenovationEstimateFlow()
    // step 1, nothing selected yet
    await flow.goNext()
    expect(flow.step.value).toBe(1)
    expect(estimateRenovationCostMock).not.toHaveBeenCalled()
  })

  it('going back and forward through all 5 steps keeps every earlier answer intact', async () => {
    const flow = useRenovationEstimateFlow()
    fillAllSteps(flow)
    flow.step.value = 5

    flow.goBack()
    flow.goBack()
    flow.goBack()
    flow.goBack()
    expect(flow.step.value).toBe(1)
    // Answers from steps 2-5, filled before navigating back, must survive.
    expect(flow.propertyType.value).toBe('apartment')
    expect(flow.area.value).toBe(65)
    expect(flow.condition.value).toBe('secondary')
    expect(flow.finishLevel.value).toBe('standard')
    expect(flow.works.value).toEqual(['walls', 'floor'])

    await flow.goNext()
    await flow.goNext()
    await flow.goNext()
    expect(flow.step.value).toBe(4)
    expect(flow.condition.value).toBe('secondary')
  })

  it('goBack on step 1 is a no-op (no step 0)', () => {
    const flow = useRenovationEstimateFlow()
    flow.goBack()
    expect(flow.step.value).toBe(1)
  })
})

describe('useRenovationEstimateFlow — submit (final step only)', () => {
  it('sends the exact 5-field backend contract and stores the mapped result', async () => {
    const flow = useRenovationEstimateFlow()
    fillAllSteps(flow)
    flow.step.value = 5
    estimateRenovationCostMock.mockResolvedValueOnce(VALID_RESULT)

    await flow.goNext()

    expect(estimateRenovationCostMock).toHaveBeenCalledWith(
      {
        property_type: 'apartment',
        area: 65,
        condition: 'secondary',
        finish_level: 'standard',
        works: ['walls', 'floor'],
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(flow.result.value).toEqual(VALID_RESULT)
    expect(flow.submitting.value).toBe(false)
  })

  it('sets submitting:true during the request and false after — loading state is observable', async () => {
    const flow = useRenovationEstimateFlow()
    fillAllSteps(flow)
    flow.step.value = 5
    let resolveFetch!: (v: typeof VALID_RESULT) => void
    estimateRenovationCostMock.mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve }))

    const promise = flow.goNext()
    expect(flow.submitting.value).toBe(true)
    resolveFetch(VALID_RESULT)
    await promise
    expect(flow.submitting.value).toBe(false)
  })

  it('double-submit guard: calling submit() again while a request is in flight does not fire a second request', async () => {
    const flow = useRenovationEstimateFlow()
    fillAllSteps(flow)
    flow.step.value = 5
    let resolveFetch!: (v: typeof VALID_RESULT) => void
    estimateRenovationCostMock.mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve }))

    const first = flow.submit()
    const second = flow.submit() // fired while submitting.value is already true
    resolveFetch(VALID_RESULT)
    await Promise.all([first, second])

    expect(estimateRenovationCostMock).toHaveBeenCalledTimes(1)
  })

  it('does not call the API at all if required fields are missing (defensive, mirrors canProceed)', async () => {
    const flow = useRenovationEstimateFlow()
    flow.step.value = 5
    // propertyType/area/condition/finishLevel left unset.
    await flow.submit()
    expect(estimateRenovationCostMock).not.toHaveBeenCalled()
  })
})

describe('useRenovationEstimateFlow — error handling', () => {
  it.each([
    [{ status: 400, code: 'invalid_area', message: 'Укажите корректную площадь — от 1 до 1000 м².' }],
    [{ status: 500, code: 'internal_error', message: 'Внутренняя ошибка сервера.' }],
    [{ status: 503, code: 'renovation_pricing_unavailable', message: 'Сейчас не удалось рассчитать стоимость. Попробуйте немного позже.' }],
    [{ status: 0, code: 'network_error', message: 'Не удалось подключиться к серверу. Проверьте, что backend запущен и доступен по этому адресу, и повторите попытку.' }],
  ])('surfaces the already-localized ApiError message for %o without throwing', async (apiError) => {
    const flow = useRenovationEstimateFlow()
    fillAllSteps(flow)
    flow.step.value = 5
    estimateRenovationCostMock.mockRejectedValueOnce(apiError)

    await flow.goNext()

    expect(flow.submitError.value).toBe(apiError.message)
    expect(flow.submitting.value).toBe(false)
    expect(flow.result.value).toBeNull()
  })

  it('preserves every answer after a failed request — the user can retry without refilling the survey', async () => {
    const flow = useRenovationEstimateFlow()
    fillAllSteps(flow)
    flow.step.value = 5
    estimateRenovationCostMock.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'Внутренняя ошибка сервера.' })

    await flow.goNext()

    expect(flow.propertyType.value).toBe('apartment')
    expect(flow.area.value).toBe(65)
    expect(flow.condition.value).toBe('secondary')
    expect(flow.finishLevel.value).toBe('standard')
    expect(flow.works.value).toEqual(['walls', 'floor'])
  })

  it('retrying submit() after an error clears the previous error on a new attempt', async () => {
    const flow = useRenovationEstimateFlow()
    fillAllSteps(flow)
    flow.step.value = 5
    estimateRenovationCostMock.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'Внутренняя ошибка сервера.' })
    await flow.submit()
    expect(flow.submitError.value).not.toBeNull()

    estimateRenovationCostMock.mockResolvedValueOnce(VALID_RESULT)
    await flow.submit()
    expect(flow.submitError.value).toBeNull()
    expect(flow.result.value).toEqual(VALID_RESULT)
  })
})

describe('useRenovationEstimateFlow — restart', () => {
  it('clears every answer, the result and any error, and returns to step 1 ("Рассчитать ещё раз")', async () => {
    const flow = useRenovationEstimateFlow()
    fillAllSteps(flow)
    flow.step.value = 5
    estimateRenovationCostMock.mockResolvedValueOnce(VALID_RESULT)
    await flow.goNext()
    expect(flow.result.value).not.toBeNull()

    flow.restart()

    expect(flow.step.value).toBe(1)
    expect(flow.propertyType.value).toBeNull()
    expect(flow.area.value).toBeNull()
    expect(flow.condition.value).toBeNull()
    expect(flow.finishLevel.value).toBeNull()
    expect(flow.works.value).toEqual([])
    expect(flow.result.value).toBeNull()
    expect(flow.submitError.value).toBeNull()
    expect(flow.areaTouched.value).toBe(false)
    expect(flow.worksTouched.value).toBe(false)
  })
})
