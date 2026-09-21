// Типизированные методы для публичного справочника /api/v1/work-categories и
// /api/v1/work-types — Work Catalog, source of truth для видов работ (см.
// remont-back internal/interfaces/http/work_catalog_handler.go). Оба
// endpoint'а не требуют авторизации, но всё равно идут через apiFetch —
// единственную точку HTTP-транспорта во фронтенде.
import { apiFetch } from './client'
import type { WorkCategory, WorkCategoryDto, WorkType, WorkTypeDto } from './types'

function toWorkCategory(dto: WorkCategoryDto): WorkCategory {
  return { id: dto.id, name: dto.name, slug: dto.slug, sortOrder: dto.sort_order }
}

function toWorkType(dto: WorkTypeDto): WorkType {
  return {
    id: dto.id,
    categoryId: dto.category_id,
    name: dto.name,
    slug: dto.slug,
    unit: dto.unit,
    measurementSource: dto.measurement_source,
    quantityMode: dto.quantity_mode,
    sortOrder: dto.sort_order,
  }
}

export async function getWorkCategories(options: { signal?: AbortSignal } = {}): Promise<WorkCategory[]> {
  const items = await apiFetch<WorkCategoryDto[]>('/api/v1/work-categories', { signal: options.signal, auth: false })
  return items.map(toWorkCategory)
}

// categoryId не передаётся вовсе, если не указан — backend возвращает полный
// каталог видов работ (используется только для search по названию, см.
// useWorkBuilder).
export async function getWorkTypes(categoryId?: string, options: { signal?: AbortSignal } = {}): Promise<WorkType[]> {
  const path = categoryId ? `/api/v1/work-types?category_id=${encodeURIComponent(categoryId)}` : '/api/v1/work-types'
  const items = await apiFetch<WorkTypeDto[]>(path, { signal: options.signal, auth: false })
  return items.map(toWorkType)
}
