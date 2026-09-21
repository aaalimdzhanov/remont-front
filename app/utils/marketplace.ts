// Presentation-only хелперы для Marketplace UI: подписи статусов,
// форматирование цены, валидация цены ContractorService и client-side
// фильтрация открытых заявок. Ничего не считает и не хранит на backend —
// только преобразует уже готовые backend-значения в читаемый вид и фильтрует
// уже загруженный набор (см. app/api/types.ts).
import type { MarketplaceRequestStatus, OfferStatus, OpenMarketplaceRequest, PublicContractorProfile, PublicContractorService, WorkCategory, WorkType } from '~/api/types'

const REQUEST_STATUS_LABELS: Record<MarketplaceRequestStatus, string> = {
  open: 'Открыта',
  cancelled: 'Отменена',
  closed: 'Закрыта',
}

export function marketplaceRequestStatusLabel(status: MarketplaceRequestStatus): string {
  return REQUEST_STATUS_LABELS[status]
}

const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: 'Ожидает ответа',
  accepted: 'Принято',
  rejected: 'Отклонено',
  withdrawn: 'Отозвано',
}

export function offerStatusLabel(status: OfferStatus): string {
  return OFFER_STATUS_LABELS[status]
}

// price — целое (int64 на backend, см. api/types.ts) — здесь только
// визуальная группировка разрядов, значение не округляется/не меняется.
export function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString('ru-RU')} сум`
}

export function formatMarketplaceDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

// ---- ContractorService price range ----
// price_from/price_to — *int64 на backend, здесь уже number|null (см.
// app/api/contractor.ts). Оба null — цена ещё не указана (backend это
// разрешает, поле необязательное).
export function formatPriceRange(priceFrom: number | null, priceTo: number | null): string {
  if (priceFrom === null && priceTo === null) return 'Цена не указана'
  if (priceFrom !== null && priceTo !== null) {
    if (priceFrom === priceTo) return formatPrice(priceFrom)
    return `${Math.round(priceFrom).toLocaleString('ru-RU')} — ${formatPrice(priceTo)}`
  }
  if (priceFrom !== null) return `от ${formatPrice(priceFrom)}`
  return `до ${formatPrice(priceTo as number)}`
}

// ---- PublicContractorCard.vue helpers («Мастера на платформе» v1) ----
// Presentation-only, как и весь остальной файл: ничего не запрашивает,
// только сворачивает уже загруженный PublicContractorProfile.services в
// то, что реально помещается в компактную карточку.

// "Электрика · Сантехника · Отделка +2" — первые `max` названий услуг
// (реальный work_type из backend, не выдуманный), остальные — просто
// счётчик, без отдельного списка (см. задание, секция 14: "не показывать
// все 20 услуг", "не делать карточку огромной"). null, если услуг нет
// вообще — вызывающий компонент просто не рендерит блок (см. задание:
// "если services пустой — не показывать пустой блок").
export function contractorServicesLabel(services: PublicContractorService[], max = 3): string | null {
  if (services.length === 0) return null
  const visible = services.slice(0, max).map(s => s.workType).join(' · ')
  const extra = services.length - max
  return extra > 0 ? `${visible} +${extra}` : visible
}

// Цена — из ПЕРВОЙ услуги контрактора (backend не отдаёт единую "цену
// мастера", только цену за услугу — агрегировать/выбирать "лучшую" значило
// бы выдумывать бизнес-правило, которого нет). formatPriceRange уже
// возвращает "Цена не указана" для null/null — но карточка должна вообще
// СКРЫТЬ строку цены в этом случае (см. задание, секция 15: "оба
// отсутствуют — не показывать цену"), поэтому здесь предварительная
// проверка перед вызовом того же самого форматтера, а не новый формат.
export function contractorCardPriceLabel(services: PublicContractorService[]): string | null {
  const first = services[0]
  if (!first) return null
  if (first.priceFrom === null && first.priceTo === null) return null
  return formatPriceRange(first.priceFrom, first.priceTo)
}

// input может прийти и строкой, и числом (Vue кастит v-model
// <input type="number"> в number автоматически при вводе — тот же баг, что
// уже был исправлен в WorkCalculationStep.vue/CreateOfferSheet.vue, см.
// комментарии там) — никогда не polagается на .trim()/parseFloat, только
// Math.round(Number(...)), как и formatPrice() ниже уже делает.
export function normalizePriceInput(raw: string | number): number {
  return Math.round(Number(raw))
}

// '' / null / undefined — поле оставлено пустым, это допустимое состояние
// (price_from/price_to необязательны на backend) — валидным, но
// "пустым" считается отдельно вызывающим кодом через isPriceInputEmpty().
export function isPriceInputEmpty(raw: string | number | null | undefined): boolean {
  return raw === '' || raw === null || raw === undefined
}

export function isValidPriceValue(raw: string | number): boolean {
  const n = normalizePriceInput(raw)
  return Number.isFinite(n) && n >= 0
}

// price_from >= 0, price_to >= 0, price_to >= price_from — то же самое
// правило, что validatePriceRange() на backend (см.
// internal/domain/contractorservice/contractor_service.go), продублировано
// здесь только для мгновенной inline-валидации до отправки запроса.
export function isPriceRangeValid(priceFrom: number | null, priceTo: number | null): boolean {
  if (priceFrom !== null && (!Number.isFinite(priceFrom) || priceFrom < 0)) return false
  if (priceTo !== null && (!Number.isFinite(priceTo) || priceTo < 0)) return false
  if (priceFrom !== null && priceTo !== null && priceTo < priceFrom) return false
  return true
}

// ---- /marketplace open requests — client-side filters ----
// Только client-side: реальный /api/v1/marketplace/requests/open не
// принимает никаких query-параметров фильтрации (см. api/marketplace.ts) —
// поэтому фильтруется уже загруженный список, ничего не выдумывается на
// уровне backend-контракта.
export type RequestSort = 'newest' | 'oldest'

export interface RequestFilters {
  categoryId: string | null
  workTypeId: string | null
  quantityMin: number | null
  quantityMax: number | null
  sort: RequestSort
}

export function defaultRequestFilters(): RequestFilters {
  return { categoryId: null, workTypeId: null, quantityMin: null, quantityMax: null, sort: 'newest' }
}

// Сортировка не считается "фильтром" для бейджа (см. задание, секция
// MOBILE FILTER UX: "Фильтры 2") — считаются только сужающие условия.
export function countActiveRequestFilters(filters: RequestFilters): number {
  let count = 0
  if (filters.categoryId) count += 1
  if (filters.workTypeId) count += 1
  if (filters.quantityMin !== null) count += 1
  if (filters.quantityMax !== null) count += 1
  return count
}

// workTypeCategoryMap — work_type_id -> category_id, резолвится из полного
// Work Catalog (GET /api/v1/work-types без category_id), потому что
// OpenMarketplaceRequest сам по себе category_id не содержит (только
// work_type_id/work_type, см. api/types.ts) — не выдумываем это поле.
export function filterOpenRequests(
  requests: OpenMarketplaceRequest[],
  filters: RequestFilters,
  workTypeCategoryMap: Record<string, string>,
): OpenMarketplaceRequest[] {
  const filtered = requests.filter((r) => {
    if (filters.categoryId && workTypeCategoryMap[r.workTypeId] !== filters.categoryId) return false
    if (filters.workTypeId && r.workTypeId !== filters.workTypeId) return false
    if (filters.quantityMin !== null && r.quantity < filters.quantityMin) return false
    if (filters.quantityMax !== null && r.quantity > filters.quantityMax) return false
    return true
  })
  return [...filtered].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return filters.sort === 'newest' ? -diff : diff
  })
}

// ---- Request card icon (Marketplace UI/UX v2) ----
// Небольшая декоративная иконка по типу работы для OpenRequestCard.vue — не
// выдумка: резолвится из РЕАЛЬНЫХ backend-полей (work_type_id -> WorkType.
// categoryId -> WorkCategory.slug), оба каталога уже загружаются для
// фильтров (см. useMarketplace.ts loadFilterCatalog -> catalogWorkTypes/
// catalogCategories) — это просто ещё один потребитель уже загруженных
// данных, а не новый API-запрос. slug — стабильный backend-идентификатор
// категории (walls/floors/tiles/ceilings/electrical/plumbing/doors-windows/
// demolition — см. GET /api/v1/work-categories), а не угаданный по
// свободному тексту work_type.name. 'hammer' — честный generic fallback,
// если каталог ещё не загрузился или backend когда-нибудь добавит новую
// категорию без записи в этой таблице ниже.
export type RequestCardIcon = 'wall' | 'layers' | 'grid' | 'ceiling' | 'bolt' | 'faucet' | 'door' | 'hammer'

const CATEGORY_SLUG_ICONS: Record<string, RequestCardIcon> = {
  walls: 'wall',
  floors: 'layers',
  tiles: 'grid',
  ceilings: 'ceiling',
  electrical: 'bolt',
  plumbing: 'faucet',
  'doors-windows': 'door',
  demolition: 'hammer',
}

export function requestCardIcon(workTypeId: string, workTypes: WorkType[], categories: WorkCategory[]): RequestCardIcon {
  const workType = workTypes.find(w => w.id === workTypeId)
  if (!workType) return 'hammer'
  const category = categories.find(c => c.id === workType.categoryId)
  if (!category) return 'hammer'
  return CATEGORY_SLUG_ICONS[category.slug] ?? 'hammer'
}

// ---- «Мастера» tab filter (Marketplace Tabs v1) ----
// Client-side only, over the already-loaded public contractors list — see
// задание, секция 6: "фильтры должны использовать только реально доступные
// данные... список work_type из services", "не придумывать backend-
// фильтрацию, которой нет". No new API call, no new endpoint.

export interface ContractorWorkTypeOption {
  id: string
  name: string
}

// Уникальные вид-работ, реально встречающиеся хотя бы у одного мастера из
// уже загруженного списка (не полный work-catalog — тот включал бы виды
// работ, которые вообще никто не оказывает, что было бы бесполезным
// фильтром). Порядок — первое появление в списке (сортировку/ranking не
// придумываем, задание явно против).
export function uniqueContractorWorkTypes(contractors: PublicContractorProfile[]): ContractorWorkTypeOption[] {
  const seen = new Map<string, string>()
  for (const c of contractors) {
    for (const s of c.services) {
      if (!seen.has(s.workTypeId)) seen.set(s.workTypeId, s.workType)
    }
  }
  return Array.from(seen, ([id, name]) => ({ id, name }))
}

// null (или отсутствие) — фильтр не применён, показать всех. Иначе —
// только мастера, у которых есть услуга с этим work_type_id среди services.
export function filterContractorsByWorkType(
  contractors: PublicContractorProfile[],
  workTypeId: string | null,
): PublicContractorProfile[] {
  if (!workTypeId) return contractors
  return contractors.filter(c => c.services.some(s => s.workTypeId === workTypeId))
}
