<script setup lang="ts">
// Guest Work Builder — /projects/draft/works. Публичный route, та же "дыра"
// в auth-защите /projects/**, что и /projects/draft (см. doc comment там) —
// сделана осознанно, по тем же причинам: выбор работ + расчёт объёмов
// становится публичным, persistence (Save) остаётся authenticated (см.
// WorkSaveButton.vue). Структура страницы — тот же шаблон, что
// /projects/[id]/works.vue, кроме persistence-слоя:
//  - Building — читается напрямую из useBuilding() (нет backend-проекта,
//    нет loadProject());
//  - шаговый flow (room → category → type → calculation) — тот же
//    useWorkBuilder(), НЕ изменённый;
//  - сам список работ + add/delete/recalculate — useGuestWorkBuilder()
//    (локальный state + POST /api/v1/work-calculations), НЕ ProjectWork API;
//  - никакого Marketplace/Orders — у guest-работы нет project_work_id,
//    "Найти мастера" не имеет смысла до сохранения проекта.
import type { GuestWorkItem } from '~/composables/useGuestWorkBuilder'
import { calculateRoomArea } from '~/geometry/calculations'

const route = useRoute()
const { t } = useI18n()

const { document: buildingDocument, loadDocument } = useBuilding()
const { isAuthenticated, isInitialized, initialize } = useAuth()
const {
  currentStep,
  categories, categoriesLoading, categoriesError, categoriesById,
  workTypes, workTypesLoading, workTypesError,
  workTypeCatalog, loadWorkTypeCatalog,
  selectedRoomId, selectedIsProjectLevel, selectedCategoryId, selectedWorkType,
  searchQuery,
  loadCatalog,
  startAddWork, selectRoom, selectCategory, selectWorkType, goBack, resetFlow,
  cleanup: cleanupWorkBuilder,
} = useWorkBuilder()
const guestWB = useGuestWorkBuilder()
const {
  items: guestWorks,
  isCreating, createError,
  isRecalculating, recalculateError,
  deletingId,
  addWork: guestAddWork,
  removeWork: guestRemoveWork,
  recalculateAll: guestRecalculateAll,
  cleanup: cleanupGuestWorkBuilder,
} = guestWB

useHead({ title: computed(() => t('builder.workBuilder.pageTitle', { name: t('builder.workBuilder.draftLabel') })) })

type Phase = 'resuming' | 'ready'
const phase = ref<Phase>('ready')

const isResumingAfterLogin = computed(() => route.query.save === '1')

async function finishPendingSave() {
  phase.value = 'resuming'
  const { projectId, failedCount } = await guestWB.saveSessionAfterAuth(buildingDocument.value)
  if (projectId) {
    clearDraftStorage()
    // saveIssues — см. useGuestWorkBuilder.saveSessionAfterAuth doc comment
    // (секция AUTH TRANSITION): Project+Building сохранены в любом случае,
    // но если часть guest-работ не прикрепилась как ProjectWork, страница
    // /projects/{id}/works обязана явно показать это пользователю, а не
    // промолчать.
    await navigateTo(failedCount > 0
      ? { path: `/projects/${projectId}/works`, query: { saveIssues: String(failedCount) } }
      : `/projects/${projectId}/works`)
    return
  }
  // createProjectFromDraft сам не удался — ничего не создано, guest state
  // (Building в памяти + guestWorks) не тронут, остаёмся здесь с ошибкой
  // (см. WorkSaveButton.vue createError).
  phase.value = 'ready'
}

const hasWorks = computed(() => guestWorks.value.length > 0)
const roomsExist = computed(() => buildingDocument.value.building.rooms.length > 0)

// Убрали промежуточный landing screen ("План работ" + benefits + ручная "+
// Добавить работу") — см. задание "ИЗМЕНИТЬ UX ВХОДА В GUEST WORK BUILDER":
// пользователь уже явно нажал "+ Добавить работы" на Builder, второй клик не
// нужен. Если работ ещё нет и комната есть — сразу открываем WorkRoomStep
// (см. ниже и watch(currentStep,...) — тот же вызов срабатывает и при
// возврате на 'list' после отмены flow, пока список всё ещё пуст, чтобы
// пустой "list" экран не показывался вовсе, когда его нечем заполнить).
// Если комнат нет вообще — показываем единственное исключение (см. задание,
// секция EMPTY PROJECT / NO ROOMS): "Сначала добавьте помещение" + CTA
// обратно в Plan, а не WorkRoomStep с бессмысленным "Весь проект" на пустом
// здании.
function maybeAutoStart() {
  if (shouldAutoStartWorkFlow(hasWorks.value, roomsExist.value)) startAddWork()
}

watch(currentStep, (step) => {
  if (step === 'list') maybeAutoStart()
})

onMounted(async () => {
  if (!isInitialized.value) await initialize()

  guestWB.hydrateFromStorage()

  if (isResumingAfterLogin.value && isAuthenticated.value) {
    const stored = loadDraftFromStorage()
    if (stored) loadDocument(stored)
    await finishPendingSave()
    return
  }

  void loadCatalog()
  void loadWorkTypeCatalog()
  maybeAutoStart()
})

onBeforeUnmount(() => {
  cleanupWorkBuilder()
  cleanupGuestWorkBuilder()
})
const selectedCategory = computed(() => categories.value.find(c => c.id === selectedCategoryId.value) ?? null)

const scopeLabel = computed(() => {
  if (currentStep.value === 'room') return ''
  if (selectedIsProjectLevel.value) return t('builder.workBuilder.wholeProject')
  const room = buildingDocument.value.building.rooms.find(r => r.id === selectedRoomId.value)
  return room ? t('builder.workBuilder.roomAreaLabel', { name: room.name, area: calculateRoomArea(room).toFixed(1) }) : ''
})

interface WorkGroup { roomId: string | null, label: string, works: GuestWorkItem[] }
const groupedWorks = computed<WorkGroup[]>(() => {
  const groups = new Map<string, WorkGroup>()
  for (const work of guestWorks.value) {
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
  return Array.from(groups.values()).sort((a, b) => (a.roomId === null ? 1 : 0) - (b.roomId === null ? 1 : 0))
})

function resolveWorkTitle(work: GuestWorkItem): string {
  return workTypeCatalog.value[work.workTypeId]?.name ?? t('builder.workBuilder.fallbackWorkTitle')
}

function resolveWorkIcon(work: GuestWorkItem) {
  const wt = workTypeCatalog.value[work.workTypeId]
  if (!wt) return 'room' as const
  const category = categoriesById.value[wt.categoryId]
  return workTypeIcon(wt.slug, category?.slug ?? '')
}

const createdResult = ref<{ quantity: number, unit: GuestWorkItem['unit'] } | null>(null)

function handleSelectWorkType(id: string) {
  createdResult.value = null
  selectWorkType(id)
}

function handleRetryWorkTypes() {
  if (selectedCategoryId.value) selectCategory(selectedCategoryId.value)
}

async function handleConfirmCreate(quantity?: number) {
  if (!selectedWorkType.value) return
  const result = await guestAddWork(
    buildingDocument.value,
    selectedWorkType.value,
    selectedIsProjectLevel.value ? null : selectedRoomId.value,
    quantity,
  )
  if (result) createdResult.value = result
}

function handleDone() {
  createdResult.value = null
  resetFlow()
}

// Пока работ ещё нет, 'list' фактически недостижим (см. watch(currentStep,
// maybeAutoStart) выше) — goBack()/resetFlow() туда "мимо" просто бы тут же
// отправили обратно на 'room' тем же watcher'ом, визуально выглядя как "кнопка
// ничего не делает". Поэтому в этом случае Back/Close ведут туда же, куда и
// задание прямо требует для самого первого шага (см. секция ПОВЕДЕНИЕ BACK):
// обратно в Plan, а не в пустой 'list'.
function handleGoBack() {
  createdResult.value = null
  if (!hasWorks.value && currentStep.value === 'room') {
    navigateTo('/projects/draft')
    return
  }
  goBack()
}

function handleClose() {
  createdResult.value = null
  if (!hasWorks.value) {
    navigateTo('/projects/draft')
    return
  }
  resetFlow()
}

async function handleRecalculate() {
  await guestRecalculateAll(buildingDocument.value)
}

function handleDelete(workId: string) {
  guestRemoveWork(workId)
}
</script>

<template>
  <main class="works-page">
    <div v-if="phase === 'resuming'" class="works-page__status">
      <div class="works-page__spinner" aria-hidden="true" />
      <p class="text-secondary">
        {{ t('builder.draftSaving') }}
      </p>
    </div>

    <template v-else-if="currentStep === 'list'">
      <WorkBuilderHeader
        project-id="draft"
        :project-name="t('builder.workBuilder.draftLabel')"
        back-href="/projects/draft"
        :back-aria-label="t('builder.workBuilder.backToPlanAriaLabel')"
        :has-works="hasWorks"
        :is-recalculating="isRecalculating"
        @recalculate="handleRecalculate"
      />

      <div class="works-page__body">
        <p v-if="recalculateError" class="works-page__banner-error">
          {{ recalculateError.message }}
          <button type="button" @click="handleRecalculate">
            {{ t('common.retry') }}
          </button>
        </p>

        <!-- !hasWorks && roomsExist — переходное состояние: maybeAutoStart()
             (см. script) уже переключает currentStep на 'room' синхронно при
             заходе, так что этот промежуток ничего не отображает (не старый
             landing screen). -->
        <div v-if="!hasWorks && !roomsExist" class="works-page__state">
          <UiIcon name="room" :size="28" class="works-page__state-icon" />
          <p class="text-h3">
            {{ t('builder.workBuilder.noRoomsBlockingTitle') }}
          </p>
          <p class="text-secondary">
            {{ t('builder.workBuilder.noRoomsBlockingDescription') }}
          </p>
          <NuxtLink to="/projects/draft" class="btn btn-primary">
            {{ t('builder.workBuilder.goToPlan') }}
          </NuxtLink>
        </div>

        <template v-else-if="hasWorks">
          <WorkSummary mode="guest" :works="guestWorks" />

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
                :status-updating="false"
                :deleting="deletingId === work.id"
                @delete="handleDelete(work.id)"
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
            :result="createdResult"
            @confirm="handleConfirmCreate"
            @done="handleDone"
          />
        </div>
      </div>
    </template>
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

.works-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.works-page__state-icon {
  color: var(--color-text-muted);
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

@media (max-width: 767px) {
  .works-page__body {
    padding-bottom: calc(var(--space-16) + 56px);
  }

  .works-page__fab {
    bottom: calc(64px + max(var(--space-2), env(safe-area-inset-bottom)));
  }
}

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
