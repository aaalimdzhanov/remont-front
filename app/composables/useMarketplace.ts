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
  publishMarketplaceRequest as apiPublishMarketplaceRequest,
  updateOfferStatus as apiUpdateOfferStatus,
} from '~/api/marketplace'
import {
  addContractorService as apiAddContractorService,
  createContractor as apiCreateContractor,
  deleteContractorPhoto as apiDeleteContractorPhoto,
  deleteContractorService as apiDeleteContractorService,
  deletePortfolioItem as apiDeletePortfolioItem,
  getContractorOrNull,
  listContractorServices,
  listPortfolioItems,
  reorderPortfolioItems as apiReorderPortfolioItems,
  setContractorServiceStatus as apiSetContractorServiceStatus,
  updateContractor as apiUpdateContractor,
  updateContractorService as apiUpdateContractorService,
  uploadContractorPhoto as apiUploadContractorPhoto,
  uploadPortfolioItem as apiUploadPortfolioItem,
} from '~/api/contractor'
import { getWorkCategories, getWorkTypes } from '~/api/workCatalog'
// Название работы на карточке "Мои заявки" (My Requests Card v2) — тот же
// GET /projects/{id}/works, что уже использует pages/projects/[id]/works.vue
// для списка ProjectWork проекта, не новый endpoint. MarketplaceRequestListItem
// (приватная ListMine-форма) содержит projectWorkId, но НЕ work_type/
// work_type_id (см. комментарий у MarketplaceRequestListItemDto ниже) —
// title резолвится тем же путём, что и privacy-safe project preview уже
// резолвит Building JSON: project_id -> реальные данные владельца, здесь
// project_id -> ProjectWork[] -> найти по projectWorkId -> work_type_id ->
// имя из уже загружаемого catalogWorkTypes (см. loadFilterCatalog ниже).
import { listProjectWorks } from '~/api/projectWorks'
// Мини-план заявки на карточке "Мои заявки"/её detail-странице — тот же
// GET /projects/{id}, что уже использует Dashboard (pages/projects/index.vue
// loadDetail()) для превью карточки проекта, не новый endpoint.
import { getProject } from '~/api/projects'
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
  MarketplaceRequestListItem,
  OfferStatus,
  OpenMarketplaceRequest,
  PortfolioItem,
  Project,
  ProjectWork,
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

  const myRequests = useState<MarketplaceRequestListItem[]>('marketplace-my-requests', () => [])
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
  // Contractor Profile Photo v1 (см. use-функции ниже).
  const isUploadingContractorPhoto = useState<boolean>('marketplace-uploading-contractor-photo', () => false)
  const uploadContractorPhotoError = useState<ApiError | null>('marketplace-upload-contractor-photo-error', () => null)
  const isDeletingContractorPhoto = useState<boolean>('marketplace-deleting-contractor-photo', () => false)
  const deleteContractorPhotoError = useState<ApiError | null>('marketplace-delete-contractor-photo-error', () => null)

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

  // "Мои работы" (Portfolio) — тот же паттерн состояния, что и "Мои услуги"
  // выше (см. app/api/contractor.ts listPortfolioItems/uploadPortfolioItem/
  // deletePortfolioItem/reorderPortfolioItems). portfolioActionId — busy-id
  // конкретного элемента (delete), тот же приём, что serviceActionId.
  const portfolio = useState<PortfolioItem[]>('marketplace-portfolio', () => [])
  const portfolioLoading = useState<boolean>('marketplace-portfolio-loading', () => false)
  const portfolioError = useState<ApiError | null>('marketplace-portfolio-error', () => null)
  const isUploadingPortfolio = useState<boolean>('marketplace-uploading-portfolio', () => false)
  const uploadPortfolioError = useState<ApiError | null>('marketplace-upload-portfolio-error', () => null)
  const portfolioActionId = useState<string | null>('marketplace-portfolio-action-id', () => null)
  const portfolioActionError = useState<ApiError | null>('marketplace-portfolio-action-error', () => null)
  const isReorderingPortfolio = useState<boolean>('marketplace-reordering-portfolio', () => false)
  const reorderPortfolioError = useState<ApiError | null>('marketplace-reorder-portfolio-error', () => null)

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

  // "Название работы" по requestId — ни MarketplaceRequest (приватная форма
  // заявки владельца), ни MarketplaceOffer, ни Order не содержат work_type
  // напрямую (см. api/types.ts) — без этого кэша "Мои предложения"/"Мои
  // заявки"/"Заказы" не смогли бы показать название работы никак.
  // Изначально (Marketplace Request Detail v1) заполнялся только
  // best-effort — реальными данными, которые фронтенд УЖЕ видел за эту
  // сессию при просмотре открытых заявок (loadOpenRequests ниже), поэтому
  // для заказов (Order.marketplaceRequestId почти всегда ссылается на уже
  // ЗАКРЫТУЮ заявку — открытых заявок владелец её не видел) título почти
  // никогда не резолвился, и карточка заказа показывала голое "Заказ".
  // Order Card work title v1: loadRequestTitle() ниже активно догружает
  // сюда же запись через канонический публичный GET
  // /marketplace-requests/{id} (тот же эндпоинт и тот же
  // getPublicMarketplaceRequest(), что уже использует requestDetail для
  // страницы деталей заявки, см. loadRequestDetail) — PublicMarketplaceRequest
  // структурно расширяет OpenMarketplaceRequest (те же id/workTypeId/
  // workType/quantity/unit/createdAt/location + status), поэтому это тот же
  // самый кэш, не второй. Работает для ЛЮБОГО статуса, кроме 'draft' — а у
  // заказа заявка 'draft' быть не может (Order создаётся только из
  // принятого Offer, Offer — только из 'open' заявки).
  const requestTitleCache = useState<Record<string, OpenMarketplaceRequest>>('marketplace-request-title-cache', () => ({}))
  const requestTitleLoadingIds = useState<Set<string>>('marketplace-request-title-loading-ids', () => new Set())

  // Marketplace request plan thumbnail v1: миниатюра плана проекта на
  // карточке "Мои заявки"/её detail-странице. Кэш по projectId (не по
  // requestId) — несколько заявок владельца часто ссылаются на один и тот
  // же проект (несколько видов работ одного ремонта), поэтому дедуп нужен,
  // чтобы не грузить один и тот же Building JSON по нескольку раз. null =
  // запрос выполнен, но проект не нашёлся (404/удалён) — честный fallback
  // на placeholder, не broken image. Отсутствие ключа = ещё не грузили.
  // ТОЛЬКО для владельца (MarketplaceRequestListItem.projectId существует
  // исключительно в приватной ListMine-форме, см. api/types.ts) — публичные
  // формы (Open/Public) проектов не раскрывают вообще, здесь этот кэш не
  // применим и не используется.
  const projectPreviewCache = useState<Record<string, Project | null>>('marketplace-project-preview-cache', () => ({}))
  const projectPreviewLoadingIds = useState<Set<string>>('marketplace-project-preview-loading-ids', () => new Set())

  // My Requests Card v2: название работы на карточке "Мои заявки" — тот же
  // dedup-по-projectId кэш, что и projectPreviewCache выше (несколько заявок
  // владельца часто указывают на один и тот же проект — не грузить его
  // ProjectWork-список по нескольку раз). Ключ — projectId (не requestId):
  // вызывающий компонент находит СВОЙ ProjectWork внутри списка сам по
  // request.projectWorkId (см. MyRequestCard.vue).
  const projectWorksCache = useState<Record<string, ProjectWork[] | null>>('marketplace-project-works-cache', () => ({}))
  const projectWorksLoadingIds = useState<Set<string>>('marketplace-project-works-loading-ids', () => new Set())

  // Пропускает уже загруженные/загружающиеся id — вызывающий компонент
  // (MarketplaceMyRequestCard.vue, requests/[id].vue) может звать это для
  // каждой отображаемой карточки без риска дублирующих запросов на один
  // и тот же projectId (тот же приём, что checkWorkRequest() уже использует
  // для workRequestLoadingIds ниже).
  async function loadProjectPreview(projectId: string): Promise<void> {
    if (projectId in projectPreviewCache.value || projectPreviewLoadingIds.value.has(projectId)) return
    projectPreviewLoadingIds.value = new Set(projectPreviewLoadingIds.value).add(projectId)
    try {
      const project = await getProject(projectId)
      projectPreviewCache.value = { ...projectPreviewCache.value, [projectId]: project }
    } catch (err) {
      // 404 (удалённый проект) — тот же честный "нет данных", что и любая
      // другая 404-ветка в этом файле (см. loadRequestDetail/loadContractor);
      // сеть/5xx — тоже просто "нет превью сейчас", у карточки уже есть
      // architectural-sketch fallback (ProjectsProjectPreview.vue), отдельный
      // retry-UI для декоративной миниатюры не нужен.
      if (!isApiError(err) || err.status !== 404) {
        // не запоминаем как null — временная сетевая ошибка не должна
        // навсегда "залипнуть" в fallback, следующий заход на страницу
        // попробует снова.
        return
      }
      projectPreviewCache.value = { ...projectPreviewCache.value, [projectId]: null }
    } finally {
      const next = new Set(projectPreviewLoadingIds.value)
      next.delete(projectId)
      projectPreviewLoadingIds.value = next
    }
  }

  // My Requests Card v2 — тот же dedup-guard/error-паттерн, что и
  // loadProjectPreview() выше (404 — реально удалённый проект, кэшируется
  // как null; сеть/5xx не кэшируется, чтобы следующий заход попробовал
  // снова). НЕ кэшируется по requestId/workId — один и тот же список нужен
  // всем карточкам одного проекта.
  async function loadProjectWorks(projectId: string): Promise<void> {
    if (projectId in projectWorksCache.value || projectWorksLoadingIds.value.has(projectId)) return
    projectWorksLoadingIds.value = new Set(projectWorksLoadingIds.value).add(projectId)
    try {
      const works = await listProjectWorks(projectId)
      projectWorksCache.value = { ...projectWorksCache.value, [projectId]: works }
    } catch (err) {
      if (!isApiError(err) || err.status !== 404) return
      projectWorksCache.value = { ...projectWorksCache.value, [projectId]: null }
    } finally {
      const next = new Set(projectWorksLoadingIds.value)
      next.delete(projectId)
      projectWorksLoadingIds.value = next
    }
  }

  const isCreatingRequest = useState<boolean>('marketplace-creating-request', () => false)
  const createRequestError = useState<ApiError | null>('marketplace-create-request-error', () => null)
  // Draft → Publish v1 — отдельная от createRequestError ошибка (та же
  // логика разделения, что уже есть между createRequestError и
  // myRequestsError для cancel/close): publish — своё действие со своим
  // видимым в UI результатом, не должно путаться с ошибкой создания заявки.
  const publishRequestError = useState<ApiError | null>('marketplace-publish-request-error', () => null)
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

  // Order Card work title v1: активное (не best-effort) заполнение
  // requestTitleCache для requestId, который заведомо НЕ был среди открытых
  // (заказ существует только для уже закрытой заявки) — см. комментарий у
  // requestTitleCache выше. Тот же dedup-guard/error-паттерн, что и
  // loadProjectPreview()/loadProjectWorks(): не перезапрашивать уже
  // закэшированный/загружающийся id; 404 (теоретически недостижимо для
  // заявки реального заказа, но defensive) не кэшируется как значение —
  // вызывающий компонент просто продолжит показывать fallback "Заказ".
  async function loadRequestTitle(requestId: string): Promise<void> {
    if (requestId in requestTitleCache.value || requestTitleLoadingIds.value.has(requestId)) return
    requestTitleLoadingIds.value = new Set(requestTitleLoadingIds.value).add(requestId)
    try {
      const detail = await getPublicMarketplaceRequest(requestId)
      requestTitleCache.value = { ...requestTitleCache.value, [requestId]: detail }
    } catch {
      // Сеть/404 — просто не резолвилось сейчас, честный "Заказ"-fallback
      // остаётся, следующий заход на страницу попробует снова (id не
      // кэшируется как отсутствующий).
    } finally {
      const next = new Set(requestTitleLoadingIds.value)
      next.delete(requestId)
      requestTitleLoadingIds.value = next
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

  // Contractor Profile Photo v1 — отдельные флаг/ошибка от
  // isSavingContractor/saveContractorError (тот же принцип, что развёл их с
  // createContractorProfile/loadContractor выше): фото — отдельное действие
  // со своим UI (upload sheet/confirm dialog), не должно путаться с
  // ошибкой/loading формы имени-телефона-описания. Оба метода пишут
  // результат ПРЯМО в contractor.value — единственный источник профиля
  // (см. задание, секция 12: "не создавать отдельное avatarUrl/masterPhoto
  // состояние"), а не в какое-то отдельное поле.
  async function uploadContractorPhoto(file: File): Promise<boolean> {
    isUploadingContractorPhoto.value = true
    uploadContractorPhotoError.value = null
    try {
      contractor.value = await apiUploadContractorPhoto(file)
      return true
    } catch (err) {
      setErr(uploadContractorPhotoError, err)
      return false
    } finally {
      isUploadingContractorPhoto.value = false
    }
  }

  // DELETE отвечает 204 независимо от того, было фото или нет (см.
  // contractor_photo_handler.go: "idempotent") — ответ не возвращает
  // профиль, поэтому contractor.value обновляется локально (обнуление
  // одного известного поля), а не перезапросом всего профиля с backend.
  async function deleteContractorPhoto(): Promise<boolean> {
    isDeletingContractorPhoto.value = true
    deleteContractorPhotoError.value = null
    try {
      await apiDeleteContractorPhoto()
      if (contractor.value) contractor.value = { ...contractor.value, profilePhotoUrl: null }
      return true
    } catch (err) {
      setErr(deleteContractorPhotoError, err)
      return false
    } finally {
      isDeletingContractorPhoto.value = false
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

  // Один и тот же POST и создаёт услугу, и реактивирует ранее отключённую
  // (см. addContractorService в api/contractor.ts). Во втором случае backend
  // возвращает УЖЕ СУЩЕСТВУЮЩУЮ запись (тот же id, прежние цены), поэтому
  // здесь upsert по id, а не безусловный append: иначе реактивация
  // нарисовала бы в списке вторую карточку той же услуги.
  async function addService(payload: AddContractorServicePayload): Promise<ContractorService | null> {
    if (isAddingService.value) return null
    isAddingService.value = true
    addServiceError.value = null
    try {
      const saved = await apiAddContractorService(payload)
      const existingIndex = services.value.findIndex(s => s.id === saved.id)
      services.value = existingIndex === -1
        ? [...services.value, saved]
        : services.value.map(s => (s.id === saved.id ? saved : s))
      return saved
    } catch (err) {
      setErr(addServiceError, err)
      return null
    } finally {
      isAddingService.value = false
    }
  }

  // Включение/отключение услуги (PATCH .../status). Оптимистично: флаг в
  // списке переключается сразу, при ошибке — откат к ПРЕЖНЕМУ состоянию
  // именно этой услуги (не к общему перезапросу списка), плюс показывается
  // сообщение. serviceActionId — тот же single-flight guard, что у
  // update/delete: пока запрос летит, повторное переключение игнорируется.
  async function setServiceStatus(id: string, isActive: boolean): Promise<boolean> {
    if (serviceActionId.value) return false
    const previous = services.value.find(s => s.id === id)
    if (!previous) return false

    serviceActionId.value = id
    serviceActionError.value = null
    services.value = services.value.map(s => (s.id === id ? { ...s, isActive } : s))
    try {
      const updated = await apiSetContractorServiceStatus(id, isActive)
      services.value = services.value.map(s => (s.id === id ? updated : s))
      return true
    } catch (err) {
      services.value = services.value.map(s => (s.id === id ? previous : s))
      setErr(serviceActionError, err)
      return false
    } finally {
      serviceActionId.value = null
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

  // ---- Portfolio ("Мои работы") ----

  async function loadPortfolio(): Promise<void> {
    portfolioLoading.value = true
    portfolioError.value = null
    try {
      portfolio.value = await listPortfolioItems()
    } catch (err) {
      setErr(portfolioError, err)
    } finally {
      portfolioLoading.value = false
    }
  }

  // Backend возвращает уже созданный item целиком (201) — просто добавляем
  // его в конец локального списка (сортировка уже совпадает: новые элементы
  // backend сам ставит в конец, см. AddPortfolioItem sort_order=len(existing)),
  // без повторного GET (см. задание, секция 5: "не делать обязательный
  // повторный GET, если backend response уже содержит созданный item").
  async function uploadPortfolio(file: File, title: string, description: string): Promise<PortfolioItem | null> {
    if (isUploadingPortfolio.value) return null
    isUploadingPortfolio.value = true
    uploadPortfolioError.value = null
    try {
      const created = await apiUploadPortfolioItem(file, title, description)
      portfolio.value = [...portfolio.value, created]
      return created
    } catch (err) {
      setErr(uploadPortfolioError, err)
      return null
    } finally {
      isUploadingPortfolio.value = false
    }
  }

  async function deletePortfolio(id: string): Promise<boolean> {
    if (portfolioActionId.value) return false
    portfolioActionId.value = id
    portfolioActionError.value = null
    try {
      await apiDeletePortfolioItem(id)
      portfolio.value = portfolio.value.filter(p => p.id !== id)
      return true
    } catch (err) {
      setErr(portfolioActionError, err)
      return false
    } finally {
      portfolioActionId.value = null
    }
  }

  // orderedItems — весь портфолио-список в новом порядке (после drag&drop) —
  // применяется в UI оптимистично сразу, ДО ответа backend (см. задание,
  // секция REORDER: "UI может оптимистично менять порядок"). sort_order
  // пересчитывается по позиции в массиве (0..n-1) — backend ожидает ВЕСЬ
  // список за один PATCH, не только передвинутый элемент (см.
  // api/types.ts ReorderPortfolioPayload). На успехе заменяется реальным
  // ответом backend; на ошибке — откат к snapshot до перетаскивания (см.
  // задание: "если backend вернул ошибку — вернуть предыдущий порядок").
  async function reorderPortfolio(orderedItems: PortfolioItem[]): Promise<boolean> {
    if (isReorderingPortfolio.value) return false
    const previous = portfolio.value
    portfolio.value = orderedItems
    isReorderingPortfolio.value = true
    reorderPortfolioError.value = null
    try {
      const updated = await apiReorderPortfolioItems({
        items: orderedItems.map((item, index) => ({ id: item.id, sort_order: index })),
      })
      portfolio.value = updated
      return true
    } catch (err) {
      setErr(reorderPortfolioError, err)
      portfolio.value = previous
      return false
    } finally {
      isReorderingPortfolio.value = false
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

  // roomId — тот же ProjectWork.roomId, который уже известен вызывающей
  // странице (см. pages/projects/[id]/works.vue confirmPlaceOnMarketplace:
  // pendingMarketplaceWork.value.roomId) — не второй источник истины,
  // просто прокидывается сюда, потому что POST .../marketplace-request
  // возвращает старую форму без него (см. комментарий ниже).
  async function createRequestForWork(projectId: string, workId: string, roomId: string | null): Promise<MarketplaceRequest | null> {
    if (isCreatingRequest.value) return null
    isCreatingRequest.value = true
    createRequestError.value = null
    try {
      const created = await apiCreateMarketplaceRequest(projectId, workId)
      // Create/Publish/Cancel/Close (см. api/marketplace.ts) по-прежнему
      // возвращают старую форму MarketplaceRequest без project_id/room_id —
      // только ListMine отдаёт MarketplaceRequestListItem (см. api/types.ts).
      // Оба поля здесь уже известны (параметры), достраиваем локально, не
      // выдумывая: тот же project/room, который только что использовали для
      // самого запроса.
      myRequests.value = [...myRequests.value, { ...created, projectId, roomId }]
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
    // updated — старая форма без project_id (см. createRequestForWork
    // выше) — сохраняем projectId уже загруженной записи (он неизменен для
    // данной заявки), а не теряем его при замене остальных полей.
    myRequests.value = myRequests.value.map(r => (r.id === updated.id ? { ...r, ...updated } : r))
    const workId = updated.projectWorkId
    if (workRequestCache.value[workId]) {
      workRequestCache.value = { ...workRequestCache.value, [workId]: updated }
    }
  }

  // Draft → Publish v1 — тот же guard-паттерн (requestActionId), что уже
  // используют cancelRequest/closeRequest ниже: пока один запрос летит,
  // повторный вызов (двойной клик) для того же workId — no-op, не второй
  // POST. Body — пустое (см. api/marketplace.ts): backend сам выполняет
  // draft -> open, frontend не отправляет status.
  async function publishRequest(projectId: string, workId: string): Promise<MarketplaceRequest | null> {
    if (requestActionId.value) return null
    requestActionId.value = workId
    publishRequestError.value = null
    try {
      const updated = await apiPublishMarketplaceRequest(projectId, workId)
      replaceMyRequest(updated)
      return updated
    } catch (err) {
      setErr(publishRequestError, err)
      // 409 invalid_transition и подобные — заявка уже не в draft (кто-то
      // другой её опубликовал/отменил параллельно). Обновляем кэш реальным
      // текущим состоянием с backend, а не оставляем UI думать, что она
      // всё ещё draft (см. задание, секция ERROR HANDLING).
      void checkWorkRequest(projectId, workId)
      return null
    } finally {
      requestActionId.value = null
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
    publishRequestError.value = null
    createOfferError.value = null
    offerActionError.value = null
    services.value = []
    servicesError.value = null
    addServiceError.value = null
    serviceActionError.value = null
    saveContractorError.value = null
    uploadContractorPhotoError.value = null
    deleteContractorPhotoError.value = null
    portfolio.value = []
    portfolioError.value = null
    uploadPortfolioError.value = null
    portfolioActionError.value = null
    reorderPortfolioError.value = null
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
    isUploadingContractorPhoto,
    uploadContractorPhotoError,
    isDeletingContractorPhoto,
    deleteContractorPhotoError,
    services,
    servicesLoading,
    servicesError,
    isAddingService,
    addServiceError,
    serviceActionId,
    serviceActionError,
    portfolio,
    portfolioLoading,
    portfolioError,
    isUploadingPortfolio,
    uploadPortfolioError,
    portfolioActionId,
    portfolioActionError,
    isReorderingPortfolio,
    reorderPortfolioError,
    catalogCategories,
    catalogCategoriesLoading,
    catalogWorkTypes,
    catalogWorkTypesLoading,
    catalogLoaded,
    workRequestCache,
    requestTitleCache,
    projectPreviewCache,
    loadProjectPreview,
    projectWorksCache,
    loadProjectWorks,
    isCreatingRequest,
    createRequestError,
    publishRequestError,
    isCreatingOffer,
    createOfferError,
    offerActionId,
    offerActionError,
    requestActionId,
    loadOpenRequests,
    loadRequestDetail,
    loadRequestTitle,
    loadMyRequests,
    loadMyOffers,
    loadContractor,
    createContractorProfile,
    updateContractorProfile,
    uploadContractorPhoto,
    deleteContractorPhoto,
    loadServices,
    addService,
    updateService,
    deleteService,
    setServiceStatus,
    loadPortfolio,
    uploadPortfolio,
    deletePortfolio,
    reorderPortfolio,
    loadFilterCatalog,
    setRequestFilter,
    resetRequestFilters,
    checkWorkRequest,
    createRequestForWork,
    publishRequest,
    cancelRequest,
    closeRequest,
    loadOffersForRequest,
    submitOffer,
    setOfferStatus,
    cleanup,
  }
}
