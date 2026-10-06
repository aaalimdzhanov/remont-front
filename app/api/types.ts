// Типы API-слоя (граница Nuxt <-> Go backend). Отдельно от app/types/building.ts:
// там — доменная модель здания, здесь — форма HTTP-контракта (DTO с snake_case,
// как отдаёт Go, плюс нормализованные camelCase-версии для остального фронтенда).

import type { BuildingDocument } from '~/types/building'

export interface ApiError {
  status: number
  code: string
  message: string
  details?: unknown
}

// Ровно то, что возвращает GET/POST/PUT /api/v1/projects/{id} — см.
// projectResponse в remont-back/internal/interfaces/http/dto.go. location —
// Project Location v1 (coarse city/district | null, source of truth для
// "где находится объект ремонта" — НЕ Contractor.ServiceLocation, это два
// независимых понятия, см. api/contractor.ts PublicContractorProfile).
// Использует общий тип Location (см. ниже), а не второй DTO. Building JSON
// остаётся единственным источником истины для геометрии — location в него
// не добавляется, backend хранит его отдельным полем Project.
export interface ProjectDto {
  id: string
  name: string
  status: string
  building: BuildingDocument
  created_at: string
  updated_at: string
  location: Location | null
}

// GET /api/v1/projects — метаданные без Building JSON (projectListItem).
export interface ProjectListItemDto {
  id: string
  name: string
  status: string
  created_at: string
  updated_at: string
}

export interface CreateProjectPayload {
  name: string
  status: string
  building: BuildingDocument
  location: Location | null
}

export interface UpdateProjectPayload {
  name: string
  status: string
  building: BuildingDocument
  location: Location | null
}

// Нормализованные формы для остального фронтенда (camelCase).
export interface Project {
  id: string
  name: string
  status: string
  building: BuildingDocument
  createdAt: string
  updatedAt: string
  location: Location | null
}

export interface ProjectSummary {
  id: string
  name: string
  status: string
  createdAt: string
  updatedAt: string
}

// ---- Auth ----
// Wire DTOs mirror remont-back/internal/interfaces/http/auth_dto.go exactly
// (snake_case). The refresh token itself never appears here — it only ever
// travels as an HttpOnly cookie, never JSON reachable from JavaScript.

export type AuthPurpose = 'register' | 'login'

export interface AuthResponseDto {
  access_token: string
  token_type: string
  expires_in: number
}

export interface MeResponseDto {
  id: string
  phone: string
  created_at: string
  updated_at: string
}

// Нормализованные формы для остального фронтенда (camelCase).
export interface AuthSession {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface AuthUser {
  id: string
  phone: string
  createdAt: string
  updatedAt: string
}

// ---- Location (Location/Address v1) ----
// см. internal/interfaces/http/dto.go (locationResponse) — общая coarse
// city/district-форма, которую backend отдаёт и для Contractor.service_location
// (см. PublicContractorProfile ниже), и для Project (owner-only
// /api/v1/projects/{id}, вне Marketplace-контракта). city/district совпадают
// дословно в snake_case и camelCase, поэтому один тип на обе стороны
// границы — без отдельного *Dto (тот же приём, что и WorkUnit выше).
// Никогда не расширять latitude/longitude/полным адресом — backend
// сознательно этого не отдаёт (см. locationResponse doc comment).
export interface Location {
  city: string
  district: string
}

// ---- Work Catalog (/api/v1/work-categories, /api/v1/work-types) ----
// Публичный read-only справочник backend'а (source of truth для видов работ) —
// см. internal/interfaces/http/work_catalog_dto.go. Значения enum'ов ниже —
// ровно то, что реально возвращает backend (не список "на будущее").

export type WorkUnit = 'm2' | 'm' | 'pcs'
export type QuantityMode = 'automatic' | 'manual'
export type MeasurementSource = 'floor_area' | 'ceiling_area' | 'wall_net_area' | 'door_count' | 'window_count' | 'fixed'

export interface WorkCategoryDto {
  id: string
  name: string
  slug: string
  sort_order: number
}

export interface WorkCategory {
  id: string
  name: string
  slug: string
  sortOrder: number
}

export interface WorkTypeDto {
  id: string
  category_id: string
  name: string
  slug: string
  unit: WorkUnit
  measurement_source: MeasurementSource
  quantity_mode: QuantityMode
  sort_order: number
}

export interface WorkType {
  id: string
  categoryId: string
  name: string
  slug: string
  unit: WorkUnit
  measurementSource: MeasurementSource
  quantityMode: QuantityMode
  sortOrder: number
}

// ---- Work Calculation (/api/v1/work-calculations) ----
// Публичный read-only расчёт (см. задание "Guest Work Builder") — считает
// quantity из присланного building БЕЗ создания Project/ProjectWork. building
// в запросе — ВЕСЬ BuildingDocument (та же форма, что уже уходит в
// CreateProjectPayload.building/ProjectDto.building), не только внутренний
// Building — у BuildingDocument есть calculated, у Building — нет, а задание
// прямо предупреждает "building.calculated НЕ является source of truth".
export interface WorkCalculationResultDto {
  quantity: number
  unit: WorkUnit
  quantity_mode: QuantityMode
}

export interface WorkCalculationResult {
  quantity: number
  unit: WorkUnit
  quantityMode: QuantityMode
}

// Guest vs Authenticated Work Builder (см. useGuestWorkBuilder.ts) — одна и
// та же UI/selection-логика (useWorkBuilder), два разных способа
// persistence. Используется только тремя presentational-компонентами, которым
// нужно скрыть ProjectWork-only элементы (status/marketplace) для guest-работ —
// сам useWorkBuilder() об этом типе не знает и не должен.
export type WorkBuilderMode = 'guest' | 'authenticated'

// ---- ProjectWork (/api/v1/projects/{id}/works) ----
// room_id — тот же room.id из Building JSON проекта (backend читает его как
// произвольную строку, не UUID, см. миграцию 008) либо null для работы,
// не привязанной к конкретному помещению ("Весь проект").

export type WorkStatus = 'planned' | 'in_progress' | 'completed'

export interface CreateProjectWorkPayload {
  work_type_id: string
  room_id?: string | null
  quantity?: number
}

export interface ProjectWorkDto {
  id: string
  project_id: string
  room_id: string | null
  work_type_id: string
  status: WorkStatus
  quantity: number
  unit: WorkUnit
  quantity_mode: QuantityMode
  created_at: string
  updated_at: string
}

export interface ProjectWork {
  id: string
  projectId: string
  roomId: string | null
  workTypeId: string
  status: WorkStatus
  quantity: number
  unit: WorkUnit
  quantityMode: QuantityMode
  createdAt: string
  updatedAt: string
}

// ---- Marketplace Requests ----
// см. internal/interfaces/http/marketplace_request_dto.go. ВАЖНО: backend
// отдаёт ТРИ РАЗНЫЕ формы одного домена, не одну — они не взаимозаменяемы:
//
// - marketplaceRequestResponse (приватная, владелец: create/get/cancel/close/
//   ListMine) — project_work_id + status + updated_at, НИКОГДА не содержит
//   work_type_id/work_type (см. комментарий в DTO: "never includes any
//   WorkType projection").
// - openMarketplaceRequestResponse (публичная, ListOpen — только status=open,
//   status в ответе вообще нет) — work_type_id + work_type.
// - publicMarketplaceRequestResponse (публичная, GET /marketplace-requests/{id},
//   Marketplace Request Detail v2 — ЛЮБОЙ статус, КРОМЕ draft — backend
//   исключает draft на уровне SQL (WHERE mr.status != 'draft'), отдавая тот
//   же 404, что и для несуществующего id) — то же самое, что
//   OpenMarketplaceRequest, плюс явное поле status.
//
// Draft → Publish v1 (см. marketplace_request.go Publish()): New() теперь
// создаёт заявку в 'draft', а не 'open' — видна владельцу приватно (ListMine/
// Get), но не в ListOpen и не через публичный GetPublicByID, пока владелец
// не вызовет POST .../marketplace-request/publish. 'draft' добавлен в один
// и тот же MarketplaceRequestStatus, используемый и приватной, и публичной
// формой — второй тип не заводим (публичная форма просто никогда не
// придёт со значением 'draft' по факту, а не по типу).
//
// Ни одна публичная форма НИКОГДА не содержит project_work_id/project_id/
// room_id/owner_id — контрактор/гость в принципе не может узнать, чей это
// проект. Ни в одну из форм НЕЛЬЗЯ добавлять от себя имя клиента/проекта/
// комнаты — backend их сознательно не отдаёт.
//
// Marketplace request plan thumbnail v1: ListMine (GET /marketplace/requests,
// "Мои заявки") теперь отдаёт СВОЮ отдельную форму —
// MarketplaceRequestListItemDto/marketplaceRequestListItemResponse на
// backend — с ОДНИМ дополнительным полем, project_id, поверх всех полей
// MarketplaceRequestDto. Это единственный способ дойти до Building JSON
// заявки (project_id -> GET /projects/{id} -> ProjectsProjectPreview) для
// её владельца — см. useMarketplace.ts loadProjectPreview(). НЕ трогает
// Create/Get/Publish/Cancel/Close (те по-прежнему используют
// MarketplaceRequestDto без project_id) и НЕ трогает ни одну публичную
// форму (project_id туда никогда не добавляется — см. абзац выше).
//
// location (Project Location в Marketplace v1) — есть ТОЛЬКО у двух
// публичных форм (Open/Public), см. openMarketplaceRequestResponse/
// publicMarketplaceRequestResponse: coarse city/district, тот же общий
// Location-тип и toLocationResponse(), что уже отдают Project/Contractor —
// не второй DTO. null, если у Project нет location. Приватная
// MarketplaceRequestDto его не содержит вообще (marketplaceRequestResponse
// на backend этого поля не имеет).
export type MarketplaceRequestStatus = 'draft' | 'open' | 'cancelled' | 'closed'

export interface MarketplaceRequestDto {
  id: string
  project_work_id: string
  quantity: number
  unit: WorkUnit
  status: MarketplaceRequestStatus
  created_at: string
  updated_at: string
}

export interface MarketplaceRequest {
  id: string
  projectWorkId: string
  quantity: number
  unit: WorkUnit
  status: MarketplaceRequestStatus
  createdAt: string
  updatedAt: string
}

// ListMine's own shape (GET /api/v1/marketplace/requests, "Мои заявки") —
// MarketplaceRequestDto plus project_id/room_id (см. комментарий выше). Не
// используется ни Create/Get/Publish/Cancel/Close, ни одной публичной
// формой — только listMyMarketplaceRequests() в api/marketplace.ts.
// room_id — null для project-level ProjectWork (см. ProjectWork.roomId) —
// именно это поле отличает конкретную комнату одной заявки от другой: без
// него несколько заявок одного и того же проекта показывали бы ОДИНАКОВУЮ
// миниатюру всего здания (см. финальный отчёт, "plan thumbnail v2 — room_id").
export interface MarketplaceRequestListItemDto {
  id: string
  project_work_id: string
  project_id: string
  room_id: string | null
  quantity: number
  unit: WorkUnit
  status: MarketplaceRequestStatus
  created_at: string
  updated_at: string
}

export interface MarketplaceRequestListItem {
  id: string
  projectWorkId: string
  projectId: string
  roomId: string | null
  quantity: number
  unit: WorkUnit
  status: MarketplaceRequestStatus
  createdAt: string
  updatedAt: string
}

export interface OpenMarketplaceRequestDto {
  id: string
  work_type_id: string
  work_type: string
  quantity: number
  unit: WorkUnit
  created_at: string
  location: Location | null
}

export interface OpenMarketplaceRequest {
  id: string
  workTypeId: string
  workType: string
  quantity: number
  unit: WorkUnit
  createdAt: string
  location: Location | null
}

// GET /api/v1/marketplace-requests/{id} — публичный, любой статус (Marketplace
// Request Detail v2). Единственная публичная форма, содержащая status.
export interface PublicMarketplaceRequestDto {
  id: string
  work_type_id: string
  work_type: string
  quantity: number
  unit: WorkUnit
  status: MarketplaceRequestStatus
  created_at: string
  location: Location | null
}

export interface PublicMarketplaceRequest {
  id: string
  workTypeId: string
  workType: string
  quantity: number
  unit: WorkUnit
  status: MarketplaceRequestStatus
  createdAt: string
  location: Location | null
}

// ---- Marketplace Offers ----
// см. internal/interfaces/http/marketplace_offer_dto.go. price — целое int64
// (Go/Postgres NUMERIC без дробной части, единая валюта проекта, без units
// копеек/тийинов) — фронтенд НИКОГДА не должен отправлять/показывать дробную
// часть. Offer response НЕ включает профиль контрактора (только contractor_id) —
// имя/телефон/рейтинг здесь показывать нельзя, backend их не отдаёт.
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export interface CreateOfferPayload {
  price: number
  comment?: string | null
}

export interface MarketplaceOfferDto {
  id: string
  marketplace_request_id: string
  contractor_id: string
  price: number
  comment: string | null
  status: OfferStatus
  created_at: string
  updated_at: string
}

export interface MarketplaceOffer {
  id: string
  marketplaceRequestId: string
  contractorId: string
  price: number
  comment: string | null
  status: OfferStatus
  createdAt: string
  updatedAt: string
}

// ---- Contractor ----
// см. internal/interfaces/http/contractor_dto.go. Один Contractor на одного
// User (UNIQUE(user_id)) — не отдельная auth-роль, см. app/api/contractor.ts.
export interface CreateContractorPayload {
  name: string
  description: string
  phone: string
}

// profile_photo_url (Contractor Profile Photo v1, см. contractor_photo_handler.go
// PUT/DELETE /api/v1/contractor/photo) — публичный URL (тот же /uploads/
// паттерн, что и PortfolioItem.image_url), null пока фото не загружено.
// Обычный PUT /api/v1/contractor (updateContractor) никогда не трогает это
// поле — отдельный backend-метод репозитория на фото, поэтому здесь оно
// просто ещё одно поле снимка профиля, не отдельный кусок state.
export interface ContractorDto {
  id: string
  name: string
  description: string
  phone: string
  status: string
  profile_photo_url: string | null
  created_at: string
  updated_at: string
}

export interface Contractor {
  id: string
  name: string
  description: string
  phone: string
  status: string
  profilePhotoUrl: string | null
  createdAt: string
  updatedAt: string
}

// ---- ContractorService (/api/v1/contractor/services) ----
// см. internal/interfaces/http/contractor_service_dto.go. work_type_id
// иммутабелен после создания (backend не даёт его менять — см.
// updateContractorServiceRequest, там нет этого поля вообще). unit/work_type
// всегда резолвятся backend'ом из актуального WorkType, не хранятся здесь
// как копия — фронтенд их тоже никогда не отправляет обратно. price_from/
// price_to — *int64 на backend (может быть null — "не указано"), фронтенд
// никогда не отправляет float/дробную часть.
export interface AddContractorServicePayload {
  work_type_id: string
  price_from: number | null
  price_to: number | null
}

export interface UpdateContractorServicePayload {
  price_from: number | null
  price_to: number | null
}

export interface ContractorServiceDto {
  id: string
  work_type_id: string
  work_type: string
  unit: WorkUnit
  price_from: number | null
  price_to: number | null
  created_at: string
  updated_at: string
}

export interface ContractorService {
  id: string
  workTypeId: string
  workType: string
  unit: WorkUnit
  priceFrom: number | null
  priceTo: number | null
  createdAt: string
  updatedAt: string
}

// ---- Public Contractor Profile (GET /api/v1/contractors/{id}) ----
// см. internal/interfaces/http/public_contractor_dto.go. ПУБЛИЧНЫЙ endpoint
// (auth: false, см. api/contractor.ts getPublicContractor) — отдельный,
// более узкий DTO от ContractorDto/ContractorServiceDto (self-profile
// endpoints выше): здесь НИКОГДА нет id услуги, unit, work_type_id-only
// сервисов без имени, и уж тем более НИКОГДА phone/user_id/status/
// timestamps контрактора — этот ответ предназначен для показа кому угодно
// по одному только id, поэтому urlallowlist полей сознательно у́же, чем у
// приватного /api/v1/contractor. rating/reviews_count — тот же самый живой
// агрегат из Review, что и в OrderContractorSummary (см. выше) — то же
// поведение null/omitempty при отсутствии отзывов. location — Location/
// Address v1 (см. public_contractor_dto.go): где мастер оказывает услуги,
// НЕ адрес проживания — city/district или null, если контрактор его не
// указал (backend возвращает null, а не выдуманный fallback).
export interface PublicContractorServiceDto {
  work_type_id: string
  work_type: string
  price_from?: number | null
  price_to?: number | null
}

export interface PublicContractorService {
  workTypeId: string
  workType: string
  priceFrom: number | null
  priceTo: number | null
}

// ---- Portfolio (/api/v1/contractor/portfolio) ----
// см. internal/interfaces/http/portfolio_dto.go. Owner-facing форма
// (create/list/reorder — portfolioItemResponse) содержит timestamps;
// публичная форма ниже (publicPortfolioItemResponse, встроена в
// PublicContractorProfileDto) — нет. Та же пара "приватная форма шире
// публичной", что уже есть у MarketplaceRequestDto/PublicMarketplaceRequestDto
// выше — два разных типа, не один "оптимистичный" с необязательными полями.
// image_url — уже готовый публичный URL от backend (ImageStorage), фронтенд
// его не конструирует и не трогает (см. api/contractor.ts).
export interface PortfolioItemDto {
  id: string
  image_url: string
  title: string
  description: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PortfolioItem {
  id: string
  imageUrl: string
  title: string
  description: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// Тело PATCH /api/v1/contractor/portfolio/reorder — см.
// reorderPortfolioRequest на backend: плоский список ВСЕХ элементов
// портфолио с их новым sort_order (backend отклоняет пустой список —
// ErrEmptyReorder), не дельта одного передвинутого элемента.
export interface ReorderPortfolioPayload {
  items: Array<{ id: string, sort_order: number }>
}

export interface PublicPortfolioItemDto {
  id: string
  image_url: string
  title: string
  description: string
  sort_order: number
}

export interface PublicPortfolioItem {
  id: string
  imageUrl: string
  title: string
  description: string
  sortOrder: number
}

export interface PublicContractorProfileDto {
  id: string
  name: string
  description: string
  services: PublicContractorServiceDto[]
  rating?: number | null
  reviews_count: number
  location: Location | null
  // null — список мастеров (GET /contractors), portfolio сознательно не
  // резолвится backend'ом ради каждого элемента (см. секция PERFORMANCE) —
  // НЕ то же самое, что "пустое портфолио" (пустой массив) на detail-запросе
  // одного мастера (GET /contractors/{id}). Не схлопывать эти два случая.
  portfolio: PublicPortfolioItemDto[] | null
  // profile_photo_url (Contractor Profile Photo v1) — тот же публичный URL,
  // что и в приватном ContractorDto выше, null пока фото не загружено.
  profile_photo_url: string | null
}

export interface PublicContractorProfile {
  id: string
  name: string
  description: string
  services: PublicContractorService[]
  rating: number | null
  reviewsCount: number
  location: Location | null
  portfolio: PublicPortfolioItem[] | null
  profilePhotoUrl: string | null
}

// ---- Order (/api/v1/orders, /api/v1/marketplace-offers/{id}/order) ----
// см. internal/interfaces/http/order_dto.go. Order создаётся ИЗ ПРИНЯТОГО
// OFFER'а (POST .../marketplace-offers/{offer_id}/order — НЕ .../
// marketplace-requests/{request_id}/orders, это распространённое неверное
// предположение), пустым телом; backend сам резолвит price/quantity/unit/
// contractor_id как one-time snapshot принятого MarketplaceOffer/
// MarketplaceRequest — фронтенд никогда их не передаёт и не пересчитывает.
// Response — плоский, только IDs (marketplace_offer_id/marketplace_request_id/
// project_work_id/client_user_id/contractor_id) — НЕТ названия работы (см.
// requestTitleCache в useMarketplace.ts для best-effort резолва) и НЕТ
// профиля клиента вообще (у User нет display-name, см. order_dto.go —
// "There is no Client field here"). quantity — float64 на backend (не int),
// но в TS это всё равно обычный number, отдельного типа не нужно.
export type OrderStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

// ---- Order Party Details v1 (только GET /api/v1/orders/{id}) ----
// ВАЖНО: contractor приходит ТОЛЬКО в ответе single-order GET (см.
// orderDetailResponse в order_dto.go) — ListMine/Create/UpdateStatus
// по-прежнему отдают плоский orderResponse БЕЗ этого поля вовсе (не null,
// а ключа нет в JSON), поэтому здесь contractor опционален на уровне DTO.
// Сознательно узкий allowlist полей (id/name/description/rating/
// reviews_count) — backend НИКОГДА не отдаёт здесь phone/status/user_id/
// timestamps контрактора (см. комментарий orderContractorResponse: "why
// phone in particular is excluded"), фронтенд не должен их домысливать.
// description — обычная string на backend (никогда не null), но здесь
// допускается null тоже — исключительно defensive fallback на случай, если
// backend когда-нибудь пришлёт null явно (см. задание: "contractor может
// быть null/отсутствовать только как защитный edge case").
//
// rating/reviews_count (Marketplace Review & Rating v1, см.
// order_dto.go orderContractorResponse) — read-only агрегат, ВЫЧИСЛЯЕМЫЙ
// backend'ом на лету из Review (никогда не хранимая колонка) — фронтенд
// никогда не пересчитывает рейтинг сам. rating — *float64 с omitempty на
// backend: отсутствует в JSON (а не null) ровно когда reviews_count === 0
// ("контрактор без отзывов не имеет рейтинга, а не нулевой") — здесь тоже
// нормализуется в null для единообразия с остальными nullable-полями.
export interface OrderContractorSummaryDto {
  id: string
  name: string
  description: string
  rating?: number | null
  reviews_count: number
}

export interface OrderContractorSummary {
  id: string
  name: string
  description: string | null
  rating: number | null
  reviewsCount: number
}

export interface OrderDto {
  id: string
  marketplace_offer_id: string
  marketplace_request_id: string
  project_work_id: string
  client_user_id: string
  contractor_id: string
  price: number
  quantity: number
  unit: WorkUnit
  status: OrderStatus
  created_at: string
  updated_at: string
  contractor?: OrderContractorSummaryDto | null
}

export interface Order {
  id: string
  marketplaceOfferId: string
  marketplaceRequestId: string
  projectWorkId: string
  clientUserId: string
  contractorId: string
  price: number
  quantity: number
  unit: WorkUnit
  status: OrderStatus
  createdAt: string
  updatedAt: string
  // null — либо backend не прислал contractor (ListMine/Create/UpdateStatus,
  // см. выше), либо честный defensive edge case на single-order GET.
  contractor: OrderContractorSummary | null
}

// ---- Review (Marketplace Review & Rating v1) ----
// см. internal/interfaces/http/review_dto.go. Review создаётся ТОЛЬКО для
// completed Order (POST /api/v1/orders/{order_id}/reviews, см.
// api/reviews.ts) — тело содержит только rating/comment, никакого
// order_id/author_user_id/target_user_id: backend сам резолвит участников
// из Order (см. application/review.Service.Create — Client-автор всегда
// таргетит User за Order.ContractorID, Contractor-автор — Order.ClientUserID).
// Review иммутабелен — нет edit/delete/moderation ни на backend, ни здесь
// (см. задание, секция ARCHITECTURAL RULES). author_user_id/target_user_id —
// обычные User id (НЕ contractor_id) — единственный способ узнать "кто
// клиент, кто мастер" для конкретного review — сравнить author_user_id с
// Order.clientUserId (см. utils/review.ts resolveReviewAuthorRole) —
// сырой target_user_id мастера нигде не раскрывается отдельно (только
// косвенно через orders[].contractorId → orderContractorResponse.name).
export interface CreateReviewPayload {
  rating: number
  comment?: string | null
}

export interface ReviewDto {
  id: string
  order_id: string
  author_user_id: string
  target_user_id: string
  rating: number
  comment: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  orderId: string
  authorUserId: string
  targetUserId: string
  rating: number
  comment: string | null
  createdAt: string
  updatedAt: string
}
