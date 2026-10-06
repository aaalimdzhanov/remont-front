// POST /api/v1/work-calculations — публичный расчёт quantity (см. задание
// "Guest Work Builder"): считает объём работы из присланного building, не
// создавая Project/ProjectWork. auth:false — тот же паттерн, что
// workCatalog.ts. building — ВСЕГДА весь BuildingDocument (см. doc comment
// у WorkCalculationResult в types.ts), не внутренний Building.
import { apiFetch } from './client'
import type { BuildingDocument } from '~/types/building'
import type { WorkCalculationResult, WorkCalculationResultDto } from './types'

function toWorkCalculationResult(dto: WorkCalculationResultDto): WorkCalculationResult {
  return {
    quantity: dto.quantity,
    unit: dto.unit,
    quantityMode: dto.quantity_mode,
  }
}

export async function calculateWorkQuantity(
  params: { building: BuildingDocument, workTypeId: string, roomId: string | null },
  options: { signal?: AbortSignal } = {},
): Promise<WorkCalculationResult> {
  const dto = await apiFetch<WorkCalculationResultDto>('/api/v1/work-calculations', {
    method: 'POST',
    body: {
      building: params.building,
      work_type_id: params.workTypeId,
      room_id: params.roomId ?? null,
    },
    signal: options.signal,
    auth: false,
  })
  return toWorkCalculationResult(dto)
}
