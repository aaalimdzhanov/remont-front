// POST /api/v1/renovation-estimates — публичный stateless-расчёт
// предварительной стоимости (см. app/api/types.ts, doc comment у
// RenovationEstimateResult). auth:false — тот же паттерн, что
// workCalculations.ts/workCatalog.ts: backend-эндпоинт не читает
// Authorization и ничего не сохраняет.
import { apiFetch } from './client'
import type { RenovationEstimateRequestDto, RenovationEstimateResult, RenovationEstimateResultDto } from './types'

function toRenovationEstimateResult(dto: RenovationEstimateResultDto): RenovationEstimateResult {
  return {
    minAmount: dto.min_amount,
    maxAmount: dto.max_amount,
    currency: dto.currency,
    minAmountPerM2: dto.min_amount_per_m2,
    maxAmountPerM2: dto.max_amount_per_m2,
    labor: { minAmount: dto.labor.min_amount, maxAmount: dto.labor.max_amount },
    materials: { minAmount: dto.materials.min_amount, maxAmount: dto.materials.max_amount },
    estimateVersion: dto.estimate_version,
  }
}

export async function estimateRenovationCost(
  payload: RenovationEstimateRequestDto,
  options: { signal?: AbortSignal } = {},
): Promise<RenovationEstimateResult> {
  const dto = await apiFetch<RenovationEstimateResultDto>('/api/v1/renovation-estimates', {
    method: 'POST',
    body: payload,
    signal: options.signal,
    auth: false,
  })
  return toRenovationEstimateResult(dto)
}
