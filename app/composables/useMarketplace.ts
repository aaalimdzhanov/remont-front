// Marketplace (Requests & Offers) — состояние + API-вызовы, тот же паттерн
// useState-композабла, что и useWorkBuilder.ts/useProjectPersistence.ts (НЕ
// Vuex/Pinia — в проекте их нет, см. app/composables/*). Building JSON здесь
// не хранится и не трогается — только id работы/проекта передаются в API.
//
// Marketplace Request Detail v2: публичный "получить заявку по id" (любой
// статус) теперь есть — requestDetail/loadRequestDetail() (см.
// api/marketplace.ts getPublicMarketplaceRequest). Это единственный
// источник work_type/quantity/unit/status/created_at для страницы деталей
// заявки, независимо от того, кто смотрит. Владелец (offers/Accept/Reject)
// и "мой оффер" (мастер) по-прежнему определяются через членство в уже
// загруженных myRequests/myOffers — единого "это моя заявка?"-эндпоинта
// нет, а весь список уже и так нужен для /marketplace (см. ниже).
import {
  cancelMarketplaceRequest as apiCancelMarketplaceRequest,
  closeMarketplaceRequest as apiCloseMarketplaceRequest,
  createMarketplaceRequest as apiCreateMarketplaceRequest,
  createOffer as apiCreateOffer,
  getMarketplaceRequestForWork,
  getPublicMarketplaceRequest,
  listMyMarketplaceRequests,
  listMyOffers as apiListMyOffers,
  listOffersForRequest as apiListOffersForRequest,
  listOpenMarketplaceRequests,
  updateOfferStatus as apiUpdateOfferStatus,
} from '~/api/marketplace'
import {
  addContractorService as apiAddContractorService,
  createContractor as apiCreateContractor,
  deleteContractorService as apiDeleteContractorService,
  getContractorOrNull,
  listContractorServices,
  updateContractor as apiUpdateContractor,
  updateContractorService as apiUpdateContractorService,
} from '~/api/contractor'
import { getWorkCategories, getWorkTypes } from '~/api/workCatalog'
import { isApiError, toApiError } from '~/api/client'
import { defaultRequestFilters, filterOpenRequests } from '~/utils/marketplace'
import type { RequestFilters } from '~/utils/marketplace'
import type {
  AddContractorServicePayload,
  ApiError,
  Contractor,
  ContractorService,
  CreateContractorPayload,
  CreateOfferPayload,
  MarketplaceOffer,
  MarketplaceRequest,
  OfferStatus,
  OpenMarketplaceRequest,
  PublicMarketplaceRequest,
  UpdateContractorServicePayload,
  WorkCategory,
  WorkType,
} from '~/api/types'

// Кэш "есть ли уже заявка на эту работу" — 'none' явно отличает "проверили,
// заявки нет" от undefined ("ещё не проверяли"), см. checkWorkRequest().
type WorkRequestState = MarketplaceRequest | 'none'

export function useMarketplace() {
  const openRequests = useState<OpenMarketplaceRequest[]>('marketplace-open-requests', () => [])
  const openRequestsLoading = useState<boolean>('marketplace-open-requests-loading', () => false)
  const openRequestsError = useState<ApiError | null>('marketplace-open-requests-error', () => null)

  // Marketplace Request Detail v2 — публичная деталь ОДНОЙ заявки (любой
  // статус, см. api/marketplace.ts getPublicMarketplaceRequest). undefined =
  // ещё не грузили; null = реальный 404 (заявки с таким id нет вообще —
  // отличаем от "ещё не проверяли", тот же паттерн, что и `contractor`
  // ниже); объект — загруженная заявка. Отдельная ошибка НЕ 404 (сеть/5xx)
  // идёт в requestDetailError, чтобы страница могла показать Retry, а не
  // спутать её с "заявка не найдена".
  const requestDetail = useState<PublicMarketplaceRequest | null | undefined>('marketplace-request-detail', () => undefined)
  const requestDetailLoading = useState<boolean>('marketplace-request-detail-loading', () => false)
  const requestDetailError = useState<ApiError | null>('marketplace-request-detail-error', () => null)

  const myRequests = useState<MarketplaceRequest[]>('marketplace-my-requests', () => [])
  const myRequestsLoading = useState<boolean>('marketplace-my-requests-loading', () => false)
  const myRequestsError = useState<ApiError | null>('marketplace-my-requests-error', () => null)

  const myOffers = useState<MarketplaceOffer[]>('marketplace-my-offers', () => [])
  const myOffersLoading = useState<boolean>('marketplace-my-offers-loading', () => false)
  const myOffersError = useState<ApiError | null>('marketplace-my-offers-error', () => null)

  // Оффера конкретной заявки (owner-вид detail-страницы).
  const requestOffers = useState<MarketplaceOffer[]>('marketplace-request-offers', () => [])
  const requestOffersLoading = useState<boolean>('marketplace-request-offers-loading', () => false)
  const requestOffersError = useState<ApiError | null>('marketplace-request-offers-error', () => null)

  // null = точно нет профиля (проверили, 404); undefined = ещё не проверяли.
  const contractor = useState<Contractor | null | undefined>('marketplace-contractor', () => undefined)
  const contractorLoading = useState<boolean>('marketplace-contractor-loading', () => false)
  const contractorError = useState<ApiError | null>('marketplace-contractor-error', () => null)
  const isSavingContractor = useState<boolean>('marketplace-saving-contractor', () => false)
  const saveContractorError = useState<ApiError | null>('marketplace-save-contractor-error', () => null)

  // "Мои услуги" (ContractorService) — полный список своего профиля, см.
  // app/api/contractor.ts listContractorServices(). unit/work_type в каждом
  // элементе уже резолвлены backend'ом из Work Catalog — здесь не дублируются.
  const services = useState<ContractorService[]>('marketplace-services', () => [])
  const servicesLoading = useState<boolean>('marketplace-services-loading', () => false)
  const servicesError = useState<ApiError | null>('marketplace-services-error', () => null)
  const isAddingService = useState<boolean>('marketplace-adding-service', () => false)
  const addServiceError = useState<ApiError | null>('marketplace-add-service-error', () => null)
  const serviceActionId = useState<string | null>('marketplace-service-action-id', () => null)
  const serviceActionError = useState<ApiError | null>('marketplace-service-action-error', () => null)

  // ---- Work Catalog для формы "Добавить услугу" и фильтров /marketplace ----
  // Полный каталог (все категории/виды работ сразу) — переиспользуется и для
  // выпадающих списков "Добавить услугу", и для маппинга work_type_id ->
  // category_id при фильтрации открытых заявок по категории (см.
  // filterOpenRequests() в utils/marketplace.ts — OpenMarketplaceRequest сам
  // по себе category_id не содержит). Тот же паттерн, что и
  // workTypeCatalog в useWorkBuilder.ts.
  const catalogCategories = useState<WorkCategory[]>('marketplace-catalog-categories', () => [])
  const catalogCategoriesLoading = useState<boolean>('marketplace-catalog-categories-loading', () => false)
  const catalogWorkTypes = useState<WorkType[]>('marketplace-catalog-work-types', () => [])
  const catalogWorkTypesLoading = useState<boolean>('marketplace-catalog-work-types-loading', () => false)
  const catalogLoaded = useState<boolean>('marketplace-catalog-loaded', () => false)

  const workTypeCategoryMap = computed<Record<string, string>>(
    () => Object.fromEntries(catalogWorkTypes.value.map(w => [w.id, w.categoryId])),
  )

  const requestFilters = useState<RequestFilters>('marketplace-request-filters', () => defaultRequestFilters())

  const filteredOpenRequests = computed(() =>
    filterOpenRequests(openRequests.value, requestFilters.value, workTypeCategoryMap.value),
  )

  const workRequestCache = useState<Record<string, WorkRequestState>>('marketplace-work-request-cache', () => ({}))
  const workRequestLoadingIds = useState<Set<string>>('marketplace-work-request-loading-ids', () => new Set())

  // Best-effort "название работы" по requestId — НЕ выдумка: заполняется
  // только реальными данными, которые фронтенд УЖЕ видел за эту сессию (при
  // просмотре открытых заявок). Ни MarketplaceRequest (приватная форма), ни
  // MarketplaceOffer не содержат work_type вообще (см. api/types.ts) — без
  // этого кэша "Мои предложения"/"Мои заявки" не смогли бы показать название
  // работы никак. Если заявки не было в открытом списке за эту сессию (или
  // сервер перезагружен) — честно показываем только количество/статус, без
  // фейковых данных.
  const requestTitleCache = useState<Record<string, OpenMarketplaceRequest>>('marketplace-request-title-cache', () => ({}))

  const isCreatingRequest = useState<boolean>('marketplace-creating-request', () => false)
  const createRequestError = useState<ApiError | null>('marketplace-create-request-error', () => null)
  const isCreatingOffer = useState<boolean>('marketplace-creating-offer', () => false)
  const createOfferError = useState<ApiError | null>('marketplace-create-offer-error', () => null)
  const offerActionId = useState<string | null>('marketplace-offer-action-id', () => null)
  const offerActionError = useState<ApiError | null>('marketplace-offer-action-error', () => null)
  const requestActionId = useState<string | null>('marketplace-request-action-id', () => null)

  function setErr(target: { value: ApiError | null }, err: unknown) {
    target.value = isApiError(err) ? err : toApiError(err)
  }

  async function loadOpenRequests(): Promise<void> {
    openRequestsLoading.value = true
    openRequestsError.value = null
    try {
      const items = await listOpenMarketplaceRequests()
      openRequests.value = items
      const additions: Record<string, OpenMarketplaceRequest> = {}
      for (const item of items) additions[item.id] = item
      requestTitleCache.value = { ...requestTitleCache.value, ...additions }
    } catch (err) {
      setErr(openRequestsError, err)
    } finally {
      openRequestsLoading.value = false
    }
  }

  // Публичная деталь одной заявки (см. requestDetail выше) — 404 кэшируется
  // как null (не как error), тот же паттерн, что и loadContractor()/
  // checkWorkRequest() уже используют в этом файле: "точно не найдено" —
  // не ошибка загрузки, страница показывает "не найдено", а не Retry.
  async function loadRequestDetail(id: string): Promise<void> {
    requestDetailLoading.value = true
    requestDetailError.value = null
    requestDetail.value = undefined
    try {
      requestDetail.value = await getPublicMarketplaceRequest(id)
    } catch (err) {
      if (isApiError(err) && err.status === 404) {
        requestDetail.value = null
      } else {
        setErr(requestDetailError, err)
      }
    } finally {
      requestDetailLoading.value = false
    }
  }

  async function loadMyRequests(): Promise<void> {
    myRequestsLoading.value = true
    myRequestsError.value = null
    try {
      myRequests.value = await listMyMarketplaceRequests()
    } catch (err) {
      setErr(myRequestsError, err)
    } finally {
      myRequestsLoading.value = false
    }
  }

  async function loadMyOffers(): Promise<void> {
    myOffersLoading.value = true
    myOffersError.value = null
    try {
      myOffers.value = await apiListMyOffers()
    } catch (err) {
      setErr(myOffersError, err)
    } finally {
      myOffersLoading.value = false
    }
  }

  async function loadContractor(): Promise<void> {
    contractorLoading.value = true
    contractorError.value = null
    try {
      contractor.value = await getContractorOrNull()
    } catch (err) {
      setErr(contractorError, err)
    } finally {
      contractorLoading.value = false
    }
  }

  async function createContractorProfile(payload: CreateContractorPayload): Promise<boolean> {
    contractorLoading.value = true
    contractorError.value = null
    try {
      contractor.value = await apiCreateContractor(payload)
      return true
    } catch (err) {
      setErr(contractorError, err)
      return false
    } finally {
      contractorLoading.value = false
    }
  }

  // Отдельный флаг/ошибка от createContractorProfile/loadContractor
  // (isSavingContractor/saveContractorError) — страница профиля показывает
  // "Сохраняем…"/inline-ошибку на форме редактирования, не путая их с
  // первичной загрузкой/quick-create sheet из requests/[id].vue. name/
  // description/phone — единственные поля, что реально уходят в PUT (status
  // backend не принимает — см. updateContractorRequest в contractor_dto.go,
  // "status has no update path in v1").
  async function updateContractorProfile(payload: CreateContractorPayload): Promise<boolean> {
    isSavingContractor.value = true
    saveContractorError.value = null
    try {
      contractor.value = await apiUpdateContractor(payload)
      return true
    } catch (err) {
      setErr(saveContractorError, err)
      return false
    } finally {
      isSavingContractor.value = false
    }
  }

  async function loadServices(): Promise<void> {
    servicesLoading.value = true
    servicesError.value = null
    try {
      services.value = await listContractorServices()
    } catch (err) {
      setErr(servicesError, err)
    } finally {
      servicesLoading.value = false
    }
  }

  async function addService(payload: AddContractorServicePayload): Promise<ContractorService | null> {
    if (isAddingService.value) return null
    isAddingService.value = true
    addServiceError.value = null
    try {
      const created = await apiAddContractorService(payload)
      services.value = [...services.value, created]
      return created
    } catch (err) {
      setErr(addServiceError, err)
      return null
    } finally {
      isAddingService.value = false
    }
  }

  async function updateService(id: string, payload: UpdateContractorServicePayload): Promise<boolean> {
    if (serviceActionId.value) return false
    serviceActionId.value = id
    serviceActionError.value = null
    try {
      const updated = await apiUpdateContractorService(id, payload)
      services.value = services.value.map(s => (s.id === id ? updated : s))
      return true
    } catch (err) {
      setErr(serviceActionError, err)
      return false
    } finally {
      serviceActionId.value = null
    }
  }

  async function deleteService(id: string): Promise<boolean> {
    if (serviceActionId.value) return false
    serviceActionId.value = id
    serviceActionError.value = null
    try {
      await apiDeleteContractorService(id)
      services.value = services.value.filter(s => s.id !== id)
      return true
    } catch (err) {
      setErr(serviceActionError, err)
      return false
    } finally {
      serviceActionId.value = null
    }
  }

  // Полный каталог грузится один раз за сессию (страница "Добавить услугу" и
  // фильтры /marketplace переиспользуют один и тот же стейт) — повторные
  // вызовы после успешной загрузки — no-op.
  async function loadFilterCatalog(): Promise<void> {
    if (catalogLoaded.value) return
    catalogCategoriesLoading.value = true
    catalogWorkTypesLoading.value = true
    try {
      const [cats, types] = await Promise.all([getWorkCategories(), getWorkTypes()])
      catalogCategories.value = cats
      catalogWorkTypes.value = types
      catalogLoaded.value = true
    } catch {
      // Каталог не критичен для открытия страницы — форма/фильтр просто
      // останутся пустыми до повторной попытки (нет отдельного retry UI на
      // этом стейте, тот же подход, что loadWorkTypeCatalog() в useWorkBuilder.ts).
    } finally {
      catalogCategoriesLoading.value = false
      catalogWorkTypesLoading.value = false
    }
  }

  function setRequestFilter(patch: Partial<RequestFilters>): void {
    requestFilters.value = { ...requestFilters.value, ...patch }
  }

  function resetRequestFilters(): void {
    requestFilters.value = defaultRequestFilters()
  }

  // Статус заявки по конкретной работе (для карточки ProjectWork) — 'none',
  // если заявки не было (404), сам объект — если была (любой статус:
  // open/cancelled/closed, backend не фильтрует).
  async function checkWorkRequest(projectId: string, workId: string): Promise<void> {
    if (workRequestLoadingIds.value.has(workId)) return
    workRequestLoadingIds.value.add(workId)
    try {
      const request = await getMarketplaceRequestForWork(projectId, workId)
      workRequestCache.value = { ...workRequestCache.value, [workId]: request }
    } catch (err) {
      if (isApiError(err) && err.status === 404) {
        workRequestCache.value = { ...workRequestCache.value, [workId]: 'none' }
      }
      // Другие ошибки молча не кэшируем — карточка просто повторит попытку
      // при следующем открытии меню, не блокируя остальной список.
    } finally {
      workRequestLoadingIds.value.delete(workId)
    }
  }

  async function createRequestForWork(projectId: string, workId: string): Promise<MarketplaceRequest | null> {
    if (isCreatingRequest.value) return null
    isCreatingRequest.value = true
    createRequestError.value = null
    try {
      const created = await apiCreateMarketplaceRequest(projectId, workId)
      myRequests.value = [...myRequests.value, created]
      workRequestCache.value = { ...workRequestCache.value, [workId]: created }
      return created
    } catch (err) {
      setErr(createRequestError, err)
      return null
    } finally {
      isCreatingRequest.value = false
    }
  }

  function replaceMyRequest(updated: MarketplaceRequest) {
    myRequests.value = myRequests.value.map(r => (r.id === updated.id ? updated : r))
    const workId = updated.projectWorkId
    if (workRequestCache.value[workId]) {
      workRequestCache.value = { ...workRequestCache.value, [workId]: updated }
    }
  }

  async function cancelRequest(projectId: string, workId: string): Promise<boolean> {
    if (requestActionId.value) return false
    requestActionId.value = workId
    try {
      const updated = await apiCancelMarketplaceRequest(projectId, workId)
      replaceMyRequest(updated)
      return true
    } catch (err) {
      setErr(myRequestsError, err)
      return false
    } finally {
      requestActionId.value = null
    }
  }

  async function closeRequest(projectId: string, workId: string): Promise<boolean> {
    if (requestActionId.value) return false
    requestActionId.value = workId
    try {
      const updated = await apiCloseMarketplaceRequest(projectId, workId)
      replaceMyRequest(updated)
      return true
    } catch (err) {
      setErr(myRequestsError, err)
      return false
    } finally {
      requestActionId.value = null
    }
  }

  async function loadOffersForRequest(requestId: string): Promise<void> {
    requestOffersLoading.value = true
    requestOffersError.value = null
    try {
      requestOffers.value = await apiListOffersForRequest(requestId)
    } catch (err) {
      setErr(requestOffersError, err)
    } finally {
      requestOffersLoading.value = false
    }
  }

  async function submitOffer(requestId: string, payload: CreateOfferPayload): Promise<MarketplaceOffer | null> {
    if (isCreatingOffer.value) return null
    isCreatingOffer.value = true
    createOfferError.value = null
    try {
      const created = await apiCreateOffer(requestId, payload)
      myOffers.value = [...myOffers.value, created]
      return created
    } catch (err) {
      setErr(createOfferError, err)
      return null
    } finally {
      isCreatingOffer.value = false
    }
  }

  // Обновляет оффер и в requestOffers (owner detail-страница), и в myOffers
  // (страница "Мои предложения") — оффер может присутствовать в обоих сразу
  // не одновременно у одного пользователя (owner видит requestOffers, только
  // контрактор — свой в myOffers), но держим оба места консистентными на
  // случай, если оба стейта уже загружены в этой сессии.
  function replaceOfferEverywhere(updated: MarketplaceOffer) {
    requestOffers.value = requestOffers.value.map(o => (o.id === updated.id ? updated : o))
    myOffers.value = myOffers.value.map(o => (o.id === updated.id ? updated : o))
  }

  async function setOfferStatus(offerId: string, status: Exclude<OfferStatus, 'pending'>): Promise<boolean> {
    if (offerActionId.value) return false
    offerActionId.value = offerId
    offerActionError.value = null
    try {
      const updated = await apiUpdateOfferStatus(offerId, status)
      replaceOfferEverywhere(updated)
      return true
    } catch (err) {
      setErr(offerActionError, err)
      return false
    } finally {
      offerActionId.value = null
    }
  }

  function cleanup(): void {
    myRequests.value = []
    myOffers.value = []
    requestOffers.value = []
    myRequestsError.value = null
    myOffersError.value = null
    requestOffersError.value = null
    createRequestError.value = null
    createOfferError.value = null
    offerActionError.value = null
    services.value = []
    servicesError.value = null
    addServiceError.value = null
    serviceActionError.value = null
    saveContractorError.value = null
  }

  return {
    openRequests,
    openRequestsLoading,
    openRequestsError,
    filteredOpenRequests,
    requestFilters,
    requestDetail,
    requestDetailLoading,
    requestDetailError,
    myRequests,
    myRequestsLoading,
    myRequestsError,
    myOffers,
    myOffersLoading,
    myOffersError,
    requestOffers,
    requestOffersLoading,
    requestOffersError,
    contractor,
    contractorLoading,
    contractorError,
    isSavingContractor,
    saveContractorError,
    services,
    servicesLoading,
    servicesError,
    isAddingService,
    addServiceError,
    serviceActionId,
    serviceActionError,
    catalogCategories,
    catalogCategoriesLoading,
    catalogWorkTypes,
    catalogWorkTypesLoading,
    workRequestCache,
    requestTitleCache,
    isCreatingRequest,
    createRequestError,
    isCreatingOffer,
    createOfferError,
    offerActionId,
    offerActionError,
    requestActionId,
    loadOpenRequests,
    loadRequestDetail,
    loadMyRequests,
    loadMyOffers,
    loadContractor,
    createContractorProfile,
    updateContractorProfile,
    loadServices,
    addService,
    updateService,
    deleteService,
    loadFilterCatalog,
    setRequestFilter,
    resetRequestFilters,
    checkWorkRequest,
    createRequestForWork,
    cancelRequest,
    closeRequest,
    loadOffersForRequest,
    submitOffer,
    setOfferStatus,
    cleanup,
  }
}
