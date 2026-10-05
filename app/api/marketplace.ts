// Типизированные методы для Marketplace Requests/Offers — см.
// remont-back internal/interfaces/http/marketplace_request_handler.go и
// marketplace_offer_handler.go. ВАЖНО (реальная асимметрия backend'а, не
// опечатка): requests живут под /api/v1/marketplace/requests (через слэш),
// offers — под /api/v1/marketplace-requests/{id}/offers (через дефис).
// Marketplace Request Detail v2: единый публичный "получить заявку по id"
// (любой статус) теперь есть — getPublicMarketplaceRequest(), под тем же
// дефисным семейством, что и offers: GET /api/v1/marketplace-requests/{id}.
// Приватный владельческий доступ остаётся, как и был: только
// project/work-scoped GET, либо членство в ListMine (см. useMarketplace.ts).
import { apiFetch } from './client'
import type {
  CreateOfferPayload,
  MarketplaceOffer,
  MarketplaceOfferDto,
  MarketplaceRequest,
  MarketplaceRequestDto,
  MarketplaceRequestListItem,
  MarketplaceRequestListItemDto,
  OfferStatus,
  OpenMarketplaceRequest,
  OpenMarketplaceRequestDto,
  PublicMarketplaceRequest,
  PublicMarketplaceRequestDto,
} from './types'

function toMarketplaceRequest(dto: MarketplaceRequestDto): MarketplaceRequest {
  return {
    id: dto.id,
    projectWorkId: dto.project_work_id,
    quantity: dto.quantity,
    unit: dto.unit,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

function toMarketplaceRequestListItem(dto: MarketplaceRequestListItemDto): MarketplaceRequestListItem {
  return {
    id: dto.id,
    projectWorkId: dto.project_work_id,
    projectId: dto.project_id,
    roomId: dto.room_id,
    quantity: dto.quantity,
    unit: dto.unit,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

function toOpenMarketplaceRequest(dto: OpenMarketplaceRequestDto): OpenMarketplaceRequest {
  return {
    id: dto.id,
    workTypeId: dto.work_type_id,
    workType: dto.work_type,
    quantity: dto.quantity,
    unit: dto.unit,
    createdAt: dto.created_at,
    location: dto.location,
  }
}

function toPublicMarketplaceRequest(dto: PublicMarketplaceRequestDto): PublicMarketplaceRequest {
  return {
    id: dto.id,
    workTypeId: dto.work_type_id,
    workType: dto.work_type,
    quantity: dto.quantity,
    unit: dto.unit,
    status: dto.status,
    createdAt: dto.created_at,
    location: dto.location,
  }
}

function toMarketplaceOffer(dto: MarketplaceOfferDto): MarketplaceOffer {
  return {
    id: dto.id,
    marketplaceRequestId: dto.marketplace_request_id,
    contractorId: dto.contractor_id,
    price: dto.price,
    comment: dto.comment,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

// ---- Marketplace Requests (project/work-scoped — только владелец) ----

// Тело запроса не передаётся вовсе — quantity/unit backend берёт из
// ProjectWork сам (см. createMarketplaceRequest в backend, body игнорируется).
export async function createMarketplaceRequest(projectId: string, workId: string): Promise<MarketplaceRequest> {
  const dto = await apiFetch<MarketplaceRequestDto>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/works/${encodeURIComponent(workId)}/marketplace-request`,
    { method: 'POST' },
  )
  return toMarketplaceRequest(dto)
}

// "Текущая" (последняя) заявка для этой работы — может быть open/cancelled/
// closed, backend не фильтрует по статусу. 404, если заявки не было вовсе.
export async function getMarketplaceRequestForWork(projectId: string, workId: string): Promise<MarketplaceRequest> {
  const dto = await apiFetch<MarketplaceRequestDto>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/works/${encodeURIComponent(workId)}/marketplace-request`,
  )
  return toMarketplaceRequest(dto)
}

export async function cancelMarketplaceRequest(projectId: string, workId: string): Promise<MarketplaceRequest> {
  const dto = await apiFetch<MarketplaceRequestDto>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/works/${encodeURIComponent(workId)}/marketplace-request/cancel`,
    { method: 'POST' },
  )
  return toMarketplaceRequest(dto)
}

export async function closeMarketplaceRequest(projectId: string, workId: string): Promise<MarketplaceRequest> {
  const dto = await apiFetch<MarketplaceRequestDto>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/works/${encodeURIComponent(workId)}/marketplace-request/close`,
    { method: 'POST' },
  )
  return toMarketplaceRequest(dto)
}

// Draft → Publish v1 (см. marketplace_request_handler.go Publish): тело
// пустое — backend сам выполняет transition draft -> open, фронтенд не
// отправляет status. 409 invalid_transition, если заявка уже не в draft
// (см. useMarketplace.ts publishRequest — вызывающий код сам решает, что
// делать с этой ошибкой).
export async function publishMarketplaceRequest(projectId: string, workId: string): Promise<MarketplaceRequest> {
  const dto = await apiFetch<MarketplaceRequestDto>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/works/${encodeURIComponent(workId)}/marketplace-request/publish`,
    { method: 'POST' },
  )
  return toMarketplaceRequest(dto)
}

// ---- Marketplace Requests (глобальные списки) ----

export async function listMyMarketplaceRequests(): Promise<MarketplaceRequestListItem[]> {
  const items = await apiFetch<MarketplaceRequestListItemDto[]>('/api/v1/marketplace/requests')
  return items.map(toMarketplaceRequestListItem)
}

// Публичный, не требует авторизации — см. router.go.
export async function listOpenMarketplaceRequests(): Promise<OpenMarketplaceRequest[]> {
  const items = await apiFetch<OpenMarketplaceRequestDto[]>('/api/v1/marketplace/requests/open', { auth: false })
  return items.map(toOpenMarketplaceRequest)
}

// Публичный, не требует авторизации, любой статус (Marketplace Request
// Detail v2, см. router.go MarketplaceRequestHandler.GetPublic) — единая
// точка входа для /marketplace/requests/[id].vue независимо от того, кто
// смотрит (гость/владелец/мастер): 404, если заявки с таким id нет вообще.
export async function getPublicMarketplaceRequest(id: string): Promise<PublicMarketplaceRequest> {
  const dto = await apiFetch<PublicMarketplaceRequestDto>(
    `/api/v1/marketplace-requests/${encodeURIComponent(id)}`,
    { auth: false },
  )
  return toPublicMarketplaceRequest(dto)
}

// ---- Marketplace Offers ----

export async function createOffer(requestId: string, payload: CreateOfferPayload): Promise<MarketplaceOffer> {
  const dto = await apiFetch<MarketplaceOfferDto>(
    `/api/v1/marketplace-requests/${encodeURIComponent(requestId)}/offers`,
    { method: 'POST', body: payload },
  )
  return toMarketplaceOffer(dto)
}

export async function listOffersForRequest(requestId: string): Promise<MarketplaceOffer[]> {
  const items = await apiFetch<MarketplaceOfferDto[]>(`/api/v1/marketplace-requests/${encodeURIComponent(requestId)}/offers`)
  return items.map(toMarketplaceOffer)
}

export async function listMyOffers(): Promise<MarketplaceOffer[]> {
  const items = await apiFetch<MarketplaceOfferDto[]>('/api/v1/offers/mine')
  return items.map(toMarketplaceOffer)
}

// status: 'accepted' | 'rejected' | 'withdrawn' — 'pending' не принимается
// backend'ом как целевой статус (это только начальное значение при создании).
export async function updateOfferStatus(offerId: string, status: Exclude<OfferStatus, 'pending'>): Promise<MarketplaceOffer> {
  const dto = await apiFetch<MarketplaceOfferDto>(
    `/api/v1/offers/${encodeURIComponent(offerId)}/status`,
    { method: 'PATCH', body: { status } },
  )
  return toMarketplaceOffer(dto)
}
