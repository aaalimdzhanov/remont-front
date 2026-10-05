<script setup lang="ts">
// Work Builder — /projects/{id}/works. Отдельный route от Builder'а
// (/projects/{id}), Builder этот файл не импортирует и не меняет. Building
// JSON грузится тем же существующим механизмом (useProjectPersistence +
// useBuilding), что и в Builder'е — read-only здесь (страница ничего не
// сохраняет в Building JSON, только читает rooms/площади для отображения).
import type { MarketplaceRequest, ProjectWork, WorkStatus } from '~/api/types'
import { calculateRoomArea } from '~/geometry/calculations'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

const { document: buildingDocument } = useBuilding()
const { loadProject, error: projectError, cleanup: cleanupPersistence } = useProjectPersistence()
const {
  currentStep,
  categories, categoriesLoading, categoriesError, categoriesById,
  workTypes, workTypesLoading, workTypesError,
  workTypeCatalog, loadWorkTypeCatalog,
  projectWorks, projectWorksLoading, projectWorksError,
  isCreating, createError,
  isRecalculating, recalculateError,
  statusUpdatingId, deletingId,
  selectedRoomId, selectedIsProjectLevel, selectedCategoryId, selectedWorkType,
  searchQuery,
  loadCatalog, loadProjectWorks,
  startAddWork, selectRoom, selectCategory, selectWorkType, goBack, resetFlow,
  addWork, deleteWork, updateStatus, recalculate,
  cleanup: cleanupWorkBuilder,
} = useWorkBuilder()
const {
  workRequestCache,
  requestActionId,
  isCreatingRequest,
  createRequestError,
  publishRequestError,
  checkWorkRequest,
  createRequestForWork,
  publishRequest,
  cleanup: cleanupMarketplace,
} = useMarketplace()
const { findOrderByRequestId, fetchOrders, cleanup: cleanupOrders } = useOrders()

const { t, locale } = useI18n()

useHead({ title: computed(() => t('builder.workBuilder.pageTitle', { name: buildingDocument.value.project.name })) })

type Phase = 'loading' | 'not-found' | 'error' | 'ready'
const phase = ref<Phase>('loading')

onMounted(async () => {
  const id = projectId.value
  if (!id) {
    phase.value = 'not-found'
    return
  }
  const ok = await loadProject(id)
  if (!ok) {
    if (projectError.value?.status === 401) {
      await navigateTo('/auth/login')
      return
    }
    phase.value = projectError.value?.status === 404 ? 'not-found' : 'error'
    return
  }
  phase.value = 'ready'
  void loadProjectWorks(id)
  void loadCatalog()
  void loadWorkTypeCatalog()
  // Для "Заказ · посмотреть" на закрытых заявках (см. ProjectWorkCard.vue) —
  // тот же best-effort lookup, что и на requests/[id].vue/offers.vue.
  void fetchOrders()
})

onBeforeUnmount(() => {
  cleanupWorkBuilder()
  cleanupPersistence()
  cleanupMarketplace()
  cleanupOrders()
})

const hasWorks = computed(() => projectWorks.value.length > 0)
const selectedCategory = computed(() => categories.value.find(c => c.id === selectedCategoryId.value) ?? null)

const scopeLabel = computed(() => {
  if (currentStep.value === 'room') return ''
  if (selectedIsProjectLevel.value) return t('builder.workBuilder.wholeProject')
  const room = buildingDocument.value.building.rooms.find(r => r.id === selectedRoomId.value)
  return room ? t('builder.workBuilder.roomAreaLabel', { name: room.name, area: calculateRoomArea(room).toFixed(1) }) : ''
})

interface WorkGroup { roomId: string | null, label: string, works: ProjectWork[] }
const groupedWorks = computed<WorkGroup[]>(() => {
  const groups = new Map<string, WorkGroup>()
  for (const work of projectWorks.value) {
    const key = work.roomId ?? '__project__'
    if (!groups.has(key)) {
      const room = work.roomId ? buildingDocument.value.building.rooms.find(r => r.id === work.roomId) : null
      const label = work.roomId
        ? (room ? t('builder.workBuilder.roomAreaLabel', { name: room.name, area: calculateRoomArea(room).toFixed(1) }) : t('builder.workBuilder.roomDeleted'))
        : t('builder.workBuilder.wholeProject')
      groups.set(key, { roomId: work.roomId, label, works: [] })
    }
    groups.get(key)!.works.push(work)
  }
  // "Весь проект" всегда последним, порядок помещений — как в списке backend.
  return Array.from(groups.values()).sort((a, b) => (a.roomId === null ? 1 : 0) - (b.roomId === null ? 1 : 0))
})

function resolveWorkTitle(work: ProjectWork): string {
  return workTypeCatalog.value[work.workTypeId]?.name ?? t('builder.workBuilder.fallbackWorkTitle')
}

function resolveWorkIcon(work: ProjectWork) {
  const wt = workTypeCatalog.value[work.workTypeId]
  if (!wt) return 'room' as const
  const category = categoriesById.value[wt.categoryId]
  return workTypeIcon(wt.slug, category?.slug ?? '')
}

const createdWork = ref<ProjectWork | null>(null)

function handleSelectWorkType(id: string) {
  createdWork.value = null
  selectWorkType(id)
}

function handleRetryWorkTypes() {
  if (selectedCategoryId.value) selectCategory(selectedCategoryId.value)
}

async function handleConfirmCreate(quantity?: number) {
  const result = await addWork(projectId.value, quantity)
  if (result) createdWork.value = result
}

function handleDone() {
  createdWork.value = null
  resetFlow()
}

function handleGoBack() {
  createdWork.value = null
  goBack()
}

function handleClose() {
  createdWork.value = null
  resetFlow()
}

async function handleRecalculate() {
  await recalculate(projectId.value)
}

async function handleDelete(workId: string) {
  await deleteWork(projectId.value, workId)
}

async function handleStatusChange(workId: string, status: WorkStatus) {
  await updateStatus(projectId.value, workId, status)
}

// ---- Marketplace: "Найти мастера" (см. useMarketplace.ts) ----
// Статус заявки на работу проверяется лениво — только когда пользователь
// реально открыл меню конкретной карточки, а не для всех работ сразу.
function handleMenuOpened(workId: string) {
  if (workRequestCache.value[workId] === undefined) void checkWorkRequest(projectId.value, workId)
}

const pendingMarketplaceWork = ref<ProjectWork | null>(null)
// Draft → Publish v1: Create теперь возвращает 'draft', не 'open' — заявка
// НЕ публична сразу (см. задание, секция CREATE REQUEST FLOW). draftRequest
// открывает второй диалог ("Заявка создана… Опубликовать?"), отдельный от
// pendingMarketplaceWork ("Разместить работу на бирже?" — сам факт создания
// заявки). publishedRequestId — id только что реально опубликованной
// заявки, для ссылки "Посмотреть заявку" на уже существующий
// /marketplace/requests/{id} (никогда не ссылаемся на ещё не
// опубликованный draft — backend отдаёт по нему 404 на публичном detail).
const draftRequest = ref<MarketplaceRequest | null>(null)
const publishedRequestId = ref<string | null>(null)
const marketplaceSuccessMessage = ref(false)
const isPublishingDraft = computed(() => !!draftRequest.value && requestActionId.value === draftRequest.value.projectWorkId)

function handleFindContractor(work: ProjectWork) {
  marketplaceSuccessMessage.value = false
  pendingMarketplaceWork.value = work
}

async function confirmPlaceOnMarketplace() {
  const work = pendingMarketplaceWork.value
  if (!work) return
  const created = await createRequestForWork(projectId.value, work.id, work.roomId)
  pendingMarketplaceWork.value = null
  // created.status === 'draft' здесь всегда (см. backend New()) — НЕ
  // считаем заявку опубликованной, не показываем публичный успех, а
  // предлагаем опубликовать явным вторым шагом.
  if (created) draftRequest.value = created
}

async function confirmPublishDraft() {
  const draft = draftRequest.value
  if (!draft || isPublishingDraft.value) return
  const updated = await publishRequest(projectId.value, draft.projectWorkId)
  if (updated) {
    draftRequest.value = null
    publishedRequestId.value = updated.id
    marketplaceSuccessMessage.value = true
  }
  // На ошибке (см. useMarketplace.ts publishRequest — включая 409
  // invalid_transition) диалог намеренно НЕ закрываем молча: пользователь
  // видит текст ошибки во floating-баннере ниже и решает сам — повторить
  // или "Оставить как черновик". workRequestCache уже обновлён актуальным
  // статусом с backend публикацией внутри publishRequest().
}

function dismissDraft() {
  draftRequest.value = null
}

async function handlePublishFromCard(work: ProjectWork) {
  await publishRequest(projectId.value, work.id)
}

function handleViewMarketplaceRequest(requestId: string) {
  navigateTo(`/marketplace/requests/${requestId}`)
}

function resolveOrderForWork(work: ProjectWork) {
  const request = workRequestCache.value[work.id]
  if (!request || request === 'none' || request.status !== 'closed') return null
  return findOrderByRequestId(request.id) ?? null
}

function handleViewOrder(orderId: string) {
  navigateTo(`/orders/${orderId}`)
}
</script>

<template>
  <main class="works-page">
    <div v-if="phase === 'loading'" class="works-page__status">
      <div class="works-page__spinner" aria-hidden="true" />
      <p class="text-secondary">
        {{ t('projects.loadingProject') }}
      </p>
    </div>

    <div v-else-if="phase === 'not-found'" class="works-page__status">
      <UiIcon name="alert" :size="28" class="works-page__status-icon" />
      <p class="text-h3">
        {{ t('projects.notFoundTitle') }}
      </p>
      <NuxtLink to="/projects" class="btn btn-secondary">
        {{ t('projects.backToProjects') }}
      </NuxtLink>
    </div>

    <div v-else-if="phase === 'error'" class="works-page__status">
      <UiIcon name="alert" :size="28" class="works-page__status-icon" />
      <p class="text-h3">
        {{ t('projects.loadErrorTitle') }}
      </p>
      <NuxtLink to="/projects" class="btn btn-secondary">
        {{ t('projects.backToProjects') }}
      </NuxtLink>
    </div>

    <template v-else-if="currentStep === 'list'">
      <WorkBuilderHeader
        :project-id="projectId"
        :project-name="buildingDocument.project.name"
        :has-works="hasWorks"
        :is-recalculating="isRecalculating"
        @recalculate="handleRecalculate"
      />

      <div class="works-page__body">
        <p v-if="recalculateError" class="works-page__banner-error">
          {{ t('builder.workBuilder.recalculateError') }}
          <button type="button" @click="handleRecalculate">
            {{ t('common.retry') }}
          </button>
        </p>

        <p v-if="marketplaceSuccessMessage" class="works-page__banner-success">
          <UiIcon name="check" :size="16" />
          {{ t('builder.workBuilder.requestPublishedSuccess') }}
          <NuxtLink v-if="publishedRequestId" :to="`/marketplace/requests/${publishedRequestId}`">
            {{ t('builder.workBuilder.viewRequest') }}
          </NuxtLink>
          <button type="button" :aria-label="t('common.hide')" @click="marketplaceSuccessMessage = false">
            <UiIcon name="close" :size="14" />
          </button>
        </p>

        <div v-if="projectWorksLoading" class="works-page__skeleton-list" aria-busy="true">
          <div v-for="n in 3" :key="n" class="works-page__skeleton" />
        </div>

        <div v-else-if="projectWorksError" class="works-page__state">
          <p class="text-secondary">
            {{ t('builder.workBuilder.loadPlanError') }}
          </p>
          <button type="button" class="btn btn-secondary" @click="loadProjectWorks(projectId)">
            {{ t('common.retry') }}
          </button>
        </div>

        <WorkEmptyState v-else-if="!hasWorks" @add="startAddWork" />

        <template v-else>
          <WorkSummary :works="projectWorks" />

          <div v-for="group in groupedWorks" :key="group.roomId ?? '__project__'" class="works-page__group">
            <p class="text-small text-secondary works-page__group-label">
              {{ group.label }}
            </p>
            <div class="works-page__group-cards">
              <WorkProjectWorkCard
                v-for="work in group.works"
                :key="work.id"
                :title="resolveWorkTitle(work)"
                :icon="resolveWorkIcon(work)"
                :quantity="work.quantity"
                :unit="work.unit"
                :quantity-mode="work.quantityMode"
                :status="work.status"
                :status-updating="statusUpdatingId === work.id"
                :deleting="deletingId === work.id"
                :marketplace-request="workRequestCache[work.id]"
                :publishing="requestActionId === work.id"
                :order="resolveOrderForWork(work)"
                @update-status="(status) => handleStatusChange(work.id, status)"
                @delete="handleDelete(work.id)"
                @menu-opened="handleMenuOpened(work.id)"
                @find-contractor="handleFindContractor(work)"
                @publish-request="handlePublishFromCard(work)"
                @view-marketplace-request="handleViewMarketplaceRequest"
                @view-order="handleViewOrder"
              />
            </div>
          </div>

          <button type="button" class="btn btn-primary works-page__fab" @click="startAddWork">
            <UiIcon name="plus" :size="18" />
            <span class="works-page__fab-label">{{ t('builder.workBuilder.addWork') }}</span>
          </button>
        </template>
      </div>
    </template>

    <template v-else>
      <div class="works-flow">
        <div class="works-flow__header">
          <button type="button" class="works-flow__nav-btn" :aria-label="t('common.back')" @click="handleGoBack">
            <UiIcon name="chevron-left" :size="20" />
          </button>
          <div class="works-flow__titles">
            <p class="works-flow__title">
              {{ t('builder.workBuilder.addWork') }}
            </p>
            <p v-if="scopeLabel" class="text-caption text-muted">
              {{ scopeLabel }}
            </p>
          </div>
          <button type="button" class="works-flow__nav-btn" :aria-label="t('common.close')" @click="handleClose">
            <UiIcon name="close" :size="18" />
          </button>
        </div>

        <div class="works-flow__body">
          <WorkRoomStep v-if="currentStep === 'room'" @select="selectRoom" />

          <WorkCategoryStep
            v-else-if="currentStep === 'category'"
            :categories="categories"
            :loading="categoriesLoading"
            :error="categoriesError?.message ?? null"
            @select="selectCategory"
            @retry="loadCatalog()"
          />

          <WorkTypeStep
            v-else-if="currentStep === 'type'"
            :work-types="workTypes"
            :loading="workTypesLoading"
            :error="workTypesError?.message ?? null"
            :category="selectedCategory"
            :search-query="searchQuery"
            @select="handleSelectWorkType"
            @retry="handleRetryWorkTypes"
            @update:search-query="searchQuery = $event"
          />

          <WorkCalculationStep
            v-else-if="currentStep === 'calculation' && selectedWorkType"
            :work-type="selectedWorkType"
            :building="buildingDocument.building"
            :room-id="selectedRoomId"
            :is-project-level="selectedIsProjectLevel"
            :is-creating="isCreating"
            :create-error="createError?.message ?? null"
            :result="createdWork"
            @confirm="handleConfirmCreate"
            @done="handleDone"
          />
        </div>
      </div>
    </template>

    <UiConfirmDialog
      :open="pendingMarketplaceWork !== null"
      :title="t('dialogs.publishRequest.title')"
      :message="pendingMarketplaceWork ? t('dialogs.publishRequest.message', { title: resolveWorkTitle(pendingMarketplaceWork), quantity: formatQuantity(pendingMarketplaceWork.quantity, pendingMarketplaceWork.unit, t) }) : ''"
      :confirm-text="isCreatingRequest ? t('dialogs.publishRequest.confirming') : t('dialogs.publishRequest.confirm')"
      :confirm-disabled="isCreatingRequest"
      @confirm="confirmPlaceOnMarketplace"
      @cancel="pendingMarketplaceWork = null"
    />
    <p v-if="createRequestError" class="works-page__banner-error works-page__banner-error--floating">
      {{ createRequestError.message }}
    </p>

    <!-- Draft → Publish v1: заявка уже создана (status='draft'), но ещё не
         видна мастерам — второй, отдельный шаг от диалога выше. -->
    <UiConfirmDialog
      :open="draftRequest !== null"
      :title="t('dialogs.draftCreated.title')"
      :message="t('dialogs.draftCreated.message')"
      :confirm-text="isPublishingDraft ? t('dialogs.draftCreated.confirming') : t('dialogs.draftCreated.confirm')"
      :cancel-text="t('dialogs.draftCreated.cancel')"
      :confirm-disabled="isPublishingDraft"
      @confirm="confirmPublishDraft"
      @cancel="dismissDraft"
    />
    <p v-if="publishRequestError" class="works-page__banner-error works-page__banner-error--floating">
      {{ publishRequestError.message }}
    </p>
  </main>
</template>

<style scoped>
.works-page {
  min-height: 100vh;
  background: var(--color-bg);
  box-sizing: border-box;
}

.works-page__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  min-height: 60vh;
  text-align: center;
  padding: var(--space-4);
}

.works-page__status-icon {
  color: var(--color-warning);
}

.works-page__spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  animation: works-page-spin 0.7s linear infinite;
}

@keyframes works-page-spin {
  to { transform: rotate(360deg); }
}

.works-page__body {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-4) var(--space-4) var(--space-16);
}

.works-page__banner-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}

.works-page__banner-error button {
  border: none;
  background: none;
  color: inherit;
  font-weight: 500;
  text-decoration: underline;
  cursor: pointer;
}

.works-page__banner-error--floating {
  margin-top: var(--space-4);
}

.works-page__banner-success {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-success-subtle);
  color: var(--color-success);
  font-size: var(--font-small-size);
}

.works-page__banner-success a {
  color: inherit;
  font-weight: 600;
}

.works-page__banner-success button {
  margin-left: auto;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  display: flex;
}

.works-page__skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.works-page__skeleton {
  height: 64px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: works-page-pulse 1.4s ease-in-out infinite;
}

@keyframes works-page-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.works-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.works-page__group {
  margin-bottom: var(--space-5);
}

.works-page__group-label {
  margin: 0 0 var(--space-2);
}

.works-page__group-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.works-page__fab {
  position: fixed;
  right: var(--space-5);
  bottom: max(var(--space-5), env(safe-area-inset-bottom));
  z-index: 30;
  height: 56px;
  padding: 0 var(--space-5);
  border-radius: 999px;
  box-shadow: 0 6px 20px rgba(255, 106, 0, 0.35);
}

/* <768px: ProjectBottomNav (WorkBuilderHeader.vue) занимает низ экрана — FAB
   и последняя карточка списка не должны прятаться под ней. */
@media (max-width: 767px) {
  .works-page__body {
    padding-bottom: calc(var(--space-16) + 56px);
  }

  .works-page__fab {
    bottom: calc(64px + max(var(--space-2), env(safe-area-inset-bottom)));
  }
}

/* Мобильный FAB — только иконка, не занимать половину экрана текстом. */
.works-page__fab-label {
  display: none;
}

.works-flow {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.works-flow__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 56px;
  padding: var(--space-2) var(--space-4);
  padding-top: max(var(--space-2), env(safe-area-inset-top));
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.works-flow__nav-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: none;
  border-radius: var(--radius-input);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.works-flow__nav-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-subtle);
}

.works-flow__titles {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.works-flow__title {
  margin: 0;
  font-weight: 600;
  color: var(--color-text);
}

.works-flow__body {
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-10);
}

@media (min-width: 768px) {
  .works-page__body {
    padding: var(--space-8) var(--space-6) var(--space-16);
  }

  .works-page__fab-label {
    display: inline;
  }

  .works-flow__header {
    min-height: 64px;
    padding: 0 var(--space-6);
    padding-top: env(safe-area-inset-top);
  }

  .works-flow__body {
    padding: var(--space-10) var(--space-6);
  }
}
</style>
