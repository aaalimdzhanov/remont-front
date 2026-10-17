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
  SetContractorServiceStatusPayload,
  UpdateContractorServicePayload,
} from './types'

function toContractor(dto: ContractorDto): Contractor {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    phone: dto.phone,
    status: dto.status,
    profilePhotoUrl: dto.profile_photo_url,
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
    isActive: dto.is_active,
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

// ---- Contractor Profile Photo — PUT/DELETE /api/v1/contractor/photo (см.
// contractor_photo_handler.go). Как и /services и /portfolio выше, нет
// {contractor_id} в пути — backend сам резолвит "чей" профиль из JWT.
// Ответ PUT — полный профиль (та же форма, что и getContractor()), поэтому
// используется тот же toContractor()/ContractorDto — второй тип не заводится.
export async function uploadContractorPhoto(file: File): Promise<Contractor> {
  const formData = new FormData()
  formData.append('file', file)
  const dto = await apiFetch<ContractorDto>('/api/v1/contractor/photo', { method: 'PUT', body: formData })
  return toContractor(dto)
}

// 204 No Content — apiFetch<void> тот же паттерн, что и deletePortfolioItem/
// deleteContractorService выше (backend отвечает 204 даже если фото уже не
// было, см. contractor_photo_handler.go Delete: "idempotent").
export async function deleteContractorPhoto(): Promise<void> {
  await apiFetch<void>('/api/v1/contractor/photo', { method: 'DELETE' })
}

// ---- ContractorService — /api/v1/contractor/services (см.
// contractor_service_handler.go). Нет {contractor_id} нигде в пути — каждая
// операция действует на профиль вызывающего пользователя.

export async function listContractorServices(): Promise<ContractorService[]> {
  const items = await apiFetch<ContractorServiceDto[]>('/api/v1/contractor/services')
  return items.map(toContractorService)
}

// Тот же POST и создаёт новую услугу (201), и РЕАКТИВИРУЕТ ранее
// отключённую (200) — backend сам выбирает ветку по UNIQUE(contractor_id,
// work_type_id) (см. contractorservice/service.go: Create → ErrAlreadyExists
// → ReactivateForContractor). Тело ответа в обоих случаях одинаковое
// (contractorServiceResponse), поэтому отдельный "reactivate"-клиент не
// нужен и status code читать не требуется. ВАЖНО: на ветке реактивации
// price_from/price_to из запроса backend ВАЛИДИРУЕТ, но не применяет —
// UPDATE ... SET is_active = TRUE не трогает колонки цен. Менять цену
// можно только через updateContractorService() (PUT).
export async function addContractorService(payload: AddContractorServicePayload): Promise<ContractorService> {
  const dto = await apiFetch<ContractorServiceDto>('/api/v1/contractor/services', { method: 'POST', body: payload })
  return toContractorService(dto)
}

// PATCH /api/v1/contractor/services/{id}/status — включить/выключить услугу,
// НЕ удаляя её и не трогая цены (см. contractor_service_handler.go SetStatus:
// меняется только is_active/updated_at). Отключение разрешено всегда;
// включение может вернуть 409 work_type_inactive, если вид работ убрали из
// общего каталога.
export async function setContractorServiceStatus(id: string, isActive: boolean): Promise<ContractorService> {
  const dto = await apiFetch<ContractorServiceDto>(`/api/v1/contractor/services/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { is_active: isActive } satisfies SetContractorServiceStatusPayload,
  })
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
    profilePhotoUrl: dto.profile_photo_url,
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
