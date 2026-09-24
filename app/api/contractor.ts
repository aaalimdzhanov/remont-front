// Типизированные методы для /api/v1/contractor — см.
// remont-back internal/interfaces/http/contractor_handler.go. Contractor —
// НЕ отдельная auth-роль (см. app/api/types.ts): любой авторизованный
// пользователь может завести ровно один Contractor-профиль (UNIQUE(user_id))
// и после этого отправлять предложения. Фронтенд определяет "я контрактор?"
// исключительно по успеху/404 этого GET — на backend нет отдельного role-поля.
import { apiFetch, isApiError } from './client'
import type {
  AddContractorServicePayload,
  Contractor,
  ContractorDto,
  ContractorService,
  ContractorServiceDto,
  CreateContractorPayload,
  PortfolioItem,
  PortfolioItemDto,
  PublicContractorProfile,
  PublicContractorProfileDto,
  PublicPortfolioItem,
  PublicPortfolioItemDto,
  ReorderPortfolioPayload,
  UpdateContractorServicePayload,
} from './types'

function toContractor(dto: ContractorDto): Contractor {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    phone: dto.phone,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

function toContractorService(dto: ContractorServiceDto): ContractorService {
  return {
    id: dto.id,
    workTypeId: dto.work_type_id,
    workType: dto.work_type,
    unit: dto.unit,
    priceFrom: dto.price_from,
    priceTo: dto.price_to,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export async function getContractor(): Promise<Contractor> {
  const dto = await apiFetch<ContractorDto>('/api/v1/contractor')
  return toContractor(dto)
}

// null означает "у пользователя ещё нет Contractor-профиля" (404
// contractor_not_found) — не ошибка приложения, ожидаемое состояние для
// большинства клиентов, поэтому не пробрасывается как исключение.
export async function getContractorOrNull(): Promise<Contractor | null> {
  try {
    return await getContractor()
  } catch (err) {
    if (isApiError(err) && err.status === 404) return null
    throw err
  }
}

export async function createContractor(payload: CreateContractorPayload): Promise<Contractor> {
  const dto = await apiFetch<ContractorDto>('/api/v1/contractor', { method: 'POST', body: payload })
  return toContractor(dto)
}

export async function updateContractor(payload: CreateContractorPayload): Promise<Contractor> {
  const dto = await apiFetch<ContractorDto>('/api/v1/contractor', { method: 'PUT', body: payload })
  return toContractor(dto)
}

// ---- ContractorService — /api/v1/contractor/services (см.
// contractor_service_handler.go). Нет {contractor_id} нигде в пути — каждая
// операция действует на профиль вызывающего пользователя.

export async function listContractorServices(): Promise<ContractorService[]> {
  const items = await apiFetch<ContractorServiceDto[]>('/api/v1/contractor/services')
  return items.map(toContractorService)
}

export async function addContractorService(payload: AddContractorServicePayload): Promise<ContractorService> {
  const dto = await apiFetch<ContractorServiceDto>('/api/v1/contractor/services', { method: 'POST', body: payload })
  return toContractorService(dto)
}

// work_type_id иммутабелен — backend вообще не принимает это поле при
// update (см. updateContractorServiceRequest), поэтому payload здесь
// намеренно уже не содержит его на уровне типа.
export async function updateContractorService(id: string, payload: UpdateContractorServicePayload): Promise<ContractorService> {
  const dto = await apiFetch<ContractorServiceDto>(`/api/v1/contractor/services/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  })
  return toContractorService(dto)
}

export async function deleteContractorService(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/contractor/services/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ---- Portfolio — /api/v1/contractor/portfolio (см. portfolio_handler.go).
// Как и /api/v1/contractor/services, нет {contractor_id} нигде в пути —
// backend сам резолвит "чей" портфолио из JWT (см. задание, секция
// SECURITY: "frontend не должен передавать contractor_id").
function toPortfolioItem(dto: PortfolioItemDto): PortfolioItem {
  return {
    id: dto.id,
    imageUrl: dto.image_url,
    title: dto.title,
    description: dto.description,
    sortOrder: dto.sort_order,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export async function listPortfolioItems(): Promise<PortfolioItem[]> {
  const items = await apiFetch<PortfolioItemDto[]>('/api/v1/contractor/portfolio')
  return items.map(toPortfolioItem)
}

// multipart/form-data — file обязателен, title/description опциональны
// (backend читает их через r.FormValue, пустая строка означает "не
// заполнено", см. portfolio_handler.go Create). Content-Type с boundary
// выставляет сам браузер — apiFetch()/$fetch не трогает body типа FormData
// (см. задание, секция 4: "не устанавливать вручную multipart/form-data").
export async function uploadPortfolioItem(file: File, title: string, description: string): Promise<PortfolioItem> {
  const formData = new FormData()
  formData.append('file', file)
  if (title) formData.append('title', title)
  if (description) formData.append('description', description)
  const dto = await apiFetch<PortfolioItemDto>('/api/v1/contractor/portfolio', { method: 'POST', body: formData })
  return toPortfolioItem(dto)
}

export async function deletePortfolioItem(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/contractor/portfolio/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// Backend ожидает ВЕСЬ список (id, sort_order) за один запрос, не дельту
// одного передвинутого элемента (см. api/types.ts ReorderPortfolioPayload и
// application/portfolio.Service.ReorderPortfolioItems — ErrEmptyReorder на
// пустой список). Response — уже пересчитанный backend'ом порядок (см.
// portfolio_handler.go Reorder: возвращает items.ListByContractor после
// применения), поэтому composable просто заменяет им локальный state, а не
// пересобирает порядок сам.
export async function reorderPortfolioItems(payload: ReorderPortfolioPayload): Promise<PortfolioItem[]> {
  const items = await apiFetch<PortfolioItemDto[]>('/api/v1/contractor/portfolio/reorder', { method: 'PATCH', body: payload })
  return items.map(toPortfolioItem)
}

// ---- Public Contractor Profile — GET /api/v1/contractors/{id} (см.
// public_contractor_handler.go). Публичный, без авторизации (auth: false,
// тот же паттерн, что и listOpenMarketplaceRequests в api/marketplace.ts) —
// это НЕ /api/v1/contractor (self-profile, требует auth), маппер и DTO
// сознательно отдельные (более узкий allowlist полей, см. api/types.ts).
function toPublicPortfolioItem(dto: PublicPortfolioItemDto): PublicPortfolioItem {
  return {
    id: dto.id,
    imageUrl: dto.image_url,
    title: dto.title,
    description: dto.description,
    sortOrder: dto.sort_order,
  }
}

function toPublicContractorProfile(dto: PublicContractorProfileDto): PublicContractorProfile {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    services: dto.services.map(s => ({
      workTypeId: s.work_type_id,
      workType: s.work_type,
      priceFrom: s.price_from ?? null,
      priceTo: s.price_to ?? null,
    })),
    rating: dto.rating ?? null,
    reviewsCount: dto.reviews_count,
    location: dto.location,
    // null (список мастеров) остаётся null — не схлопывать в [] (см.
    // api/types.ts PublicContractorProfileDto.portfolio).
    portfolio: dto.portfolio ? dto.portfolio.map(toPublicPortfolioItem) : null,
  }
}

export async function getPublicContractor(id: string): Promise<PublicContractorProfile> {
  const dto = await apiFetch<PublicContractorProfileDto>(`/api/v1/contractors/${encodeURIComponent(id)}`, { auth: false })
  return toPublicContractorProfile(dto)
}

// GET /api/v1/contractors — публичный список (см. задание "Мастера на
// платформе v1"): тот же маппер toPublicContractorProfile, что и у
// single-GET выше — backend отдаёт список через тот же toPublicContractorResponse
// (см. public_contractor_handler.go List()), поэтому элементы имеют
// идентичную форму, без отдельного DTO/типа. Плоский массив (как и у
// listOpenMarketplaceRequests) — backend без pagination/{"items":[...]}-обёртки.
export async function getPublicContractors(): Promise<PublicContractorProfile[]> {
  const items = await apiFetch<PublicContractorProfileDto[]>('/api/v1/contractors', { auth: false })
  return items.map(toPublicContractorProfile)
}
