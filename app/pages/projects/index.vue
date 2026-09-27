<script setup lang="ts">
// Mobile-first Projects Dashboard — главный экран ishonchliusta на телефоне
// (см. задание: LOGIN → МОИ ПРОЕКТЫ → PROJECT → BUILDER). Ни 2D Builder, ни
// Three.js Viewer сюда не подключаются.
//
// Полный Building JSON на проект (нужен для preview/площади/комнат карточки
// и для PUT при переименовании) грузится ЗДЕСЬ, параллельно для всех
// проектов сразу — не через useProjectPersistence/useBuilding (те держат
// состояние ЕДИНСТВЕННОГО открытого в Builder'е проекта; дёргать loadProject()
// на каждую карточку затёрло бы это глобальное состояние), а напрямую через
// api/projects.ts. Так же на этом уровне живёт сортировка — "по площади"
// требует площадь ВСЕХ карточек, которая иначе была бы известна только
// внутри каждой карточки по отдельности.
import { getProject, updateProject } from '~/api/projects'
import type { Project } from '~/api/types'
import type { SortOption } from '~/components/projects/SortSheet.vue'

definePageMeta({ middleware: 'auth', layout: 'app' })

const { t, locale } = useI18n()
useHead({ title: computed(() => t('projects.title')) })

const { projects, isLoadingProjects, error, refreshProjects, removeProject } = useProjectPersistence()

// ---- Параллельная подгрузка полного Building JSON на каждый проект ----
const projectDetails = reactive<Record<string, Project | undefined>>({})
const loadingDetailIds = reactive<Set<string>>(new Set())

async function loadDetail(id: string) {
  loadingDetailIds.add(id)
  try {
    projectDetails[id] = await getProject(id)
  } catch {
    // Не блокируем список целиком — эта карточка просто останется без
    // preview/метрик, имя/дата из summary всё равно показываются.
  } finally {
    loadingDetailIds.delete(id)
  }
}

watch(projects, (list) => {
  for (const p of list) {
    if (!(p.id in projectDetails) && !loadingDetailIds.has(p.id)) void loadDetail(p.id)
  }
}, { immediate: true })

onMounted(() => {
  void refreshProjects()
})

function handleNew() {
  navigateTo('/projects/new')
}

function handleOpen(id: string) {
  navigateTo(`/projects/${id}`)
}

const pendingDelete = ref<{ id: string, name: string } | null>(null)

function handleDelete(id: string, name: string) {
  pendingDelete.value = { id, name }
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  await removeProject(id)
  delete projectDetails[id]
  pendingDelete.value = null
}

// Переименование — PUT требует весь BuildingDocument, который уже загружен
// в projectDetails; обновляем и его, и name/updatedAt в summary-списке
// (иначе поиск/сортировка по имени показывали бы старое имя до следующего
// refreshProjects()).
async function handleRename(id: string, name: string) {
  const detail = projectDetails[id]
  if (!detail) return
  try {
    // location: detail.location — PUT здесь full-replace на backend (см.
    // Project Location v1: application/project/service.go Update() doc
    // comment), поэтому переименование карточки обязано прислать текущий
    // location обратно, иначе молча стёрло бы его.
    const result = await updateProject(id, { name, status: detail.status, building: detail.building, location: detail.location })
    projectDetails[id] = result
    const summary = projects.value.find(p => p.id === id)
    if (summary) {
      summary.name = result.name
      summary.updatedAt = result.updatedAt
    }
  } catch {
    // Тихий отказ: нет центрального error-баннера для точечного действия
    // в одной карточке — пользователь просто попробует ещё раз.
  }
}

// ---- Поиск (по name) + сортировка (по реальным полям/производным) ----
// Поиск полностью на фронтенде: список и так уже целиком в памяти после
// refreshProjects(), backend не поддерживает server-side поиск, а плодить
// новый API endpoint ради небольшого личного списка проектов ни к чему.
const searchQuery = ref('')
const sortBy = ref<SortOption>('updatedAt')
const sortSheetOpen = ref(false)
const pendingSort = ref<SortOption>('updatedAt')

function openSortSheet() {
  pendingSort.value = sortBy.value
  sortSheetOpen.value = true
}

function applySort() {
  sortBy.value = pendingSort.value
  sortSheetOpen.value = false
}

function sortLabel(option: SortOption): string {
  return t(`projects.sort.${option}`)
}

// area — уже посчитанная Geometry/Calculation Engine статистика
// (building.calculated.areas.floor), не выдумывается здесь; для ещё не
// загруженных карточек считается 0 — сортировка сама уточнится по мере
// подгрузки деталей (projectDetails реактивен).
const sortedProjects = computed(() => {
  const list = [...projects.value]
  switch (sortBy.value) {
    case 'createdAt':
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name, locale.value))
    case 'area':
      return list.sort((a, b) => {
        const areaA = projectDetails[a.id]?.building.calculated.areas.floor ?? 0
        const areaB = projectDetails[b.id]?.building.calculated.areas.floor ?? 0
        return areaB - areaA
      })
    case 'updatedAt':
    default:
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }
})

const filteredProjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return sortedProjects.value
  return sortedProjects.value.filter(project => project.name.toLowerCase().includes(query))
})

const hasProjects = computed(() => projects.value.length > 0)
const hasSearchResults = computed(() => filteredProjects.value.length > 0)
</script>

<template>
  <main class="dash">
    <div class="dash__header">
      <div class="dash__intro">
        <h1 class="text-h1">
          {{ t('projects.title') }}
        </h1>
        <p class="text-secondary dash__subtitle">
          {{ t('projects.subtitle') }}
        </p>
      </div>

      <button type="button" class="btn btn-primary dash__new-btn" @click="handleNew">
        <UiIcon name="plus" :size="16" />
        {{ t('projects.new') }}
      </button>
    </div>

    <div class="dash__toolbar">
      <label class="dash__search">
        <UiIcon name="search" :size="18" class="dash__search-icon" />
        <input
          v-model="searchQuery"
          type="search"
          class="dash__search-input"
          :placeholder="t('projects.searchPlaceholder')"
          :aria-label="t('projects.searchAriaLabel')"
        >
      </label>

      <button type="button" class="dash__sort-btn" :aria-label="t('projects.sortAriaLabel')" @click="openSortSheet">
        <UiIcon name="sort" :size="18" />
      </button>
    </div>

    <p v-if="hasProjects" class="dash__sort-label text-caption text-muted">
      {{ t('projects.count', { count: filteredProjects.length }, filteredProjects.length) }} · {{ sortLabel(sortBy) }}
    </p>

    <div v-if="isLoadingProjects" class="dash__grid" aria-busy="true" :aria-label="t('projects.loadingAriaLabel')">
      <div v-for="n in 3" :key="n" class="skeleton-card">
        <div class="skeleton-card__preview" />
        <div class="skeleton-card__line skeleton-card__line--wide" />
        <div class="skeleton-card__line skeleton-card__line--narrow" />
      </div>
    </div>

    <div v-else-if="error" class="dash__state card">
      <UiIcon name="alert" :size="28" class="dash__state-icon" />
      <p class="text-h3">
        {{ t('projects.loadError') }}
      </p>
      <button type="button" class="btn btn-secondary" @click="refreshProjects">
        {{ t('common.retry') }}
      </button>
    </div>

    <div v-else-if="!hasProjects" class="dash__state dash__state--empty">
      <svg class="dash__empty-sketch" viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="112" height="82" rx="2" stroke="var(--color-border-strong)" stroke-width="1.5" />
        <path d="M4 34h112M46 34v52M4 60h42M78 4v82M78 22h38" stroke="var(--color-border-strong)" stroke-width="1.5" />
        <path d="M20 20l6-8 6 8" stroke="var(--color-border-strong)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <p class="text-h3">
        {{ t('projects.emptyTitle') }}
      </p>
      <p class="text-secondary">
        {{ t('projects.emptyText') }}
      </p>
      <button type="button" class="btn btn-primary" @click="handleNew">
        <UiIcon name="plus" :size="16" />
        {{ t('projects.new') }}
      </button>
    </div>

    <div v-else-if="!hasSearchResults" class="dash__state">
      <p class="text-h3">
        {{ t('projects.noResultsTitle') }}
      </p>
      <p class="text-secondary">
        {{ t('projects.noResultsText', { query: searchQuery }) }}
      </p>
      <button type="button" class="btn btn-secondary" @click="searchQuery = ''">
        {{ t('projects.clearSearch') }}
      </button>
    </div>

    <ProjectsProjectList
      v-else
      :projects="filteredProjects"
      :details="projectDetails"
      :loading-ids="loadingDetailIds"
      @open="handleOpen"
      @delete="handleDelete"
      @rename="handleRename"
    />

    <button
      type="button"
      class="dash__fab"
      :aria-label="t('projects.new')"
      @click="handleNew"
    >
      <UiIcon name="plus" :size="22" />
    </button>

    <UiConfirmDialog
      :open="pendingDelete !== null"
      :title="t('dialogs.deleteProject.title')"
      :message="t('dialogs.deleteProject.message', { name: pendingDelete?.name ?? '' })"
      :confirm-text="t('common.delete')"
      danger
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />

    <ProjectsSortSheet
      :open="sortSheetOpen"
      v-model="pendingSort"
      @apply="applySort"
      @cancel="sortSheetOpen = false"
    />
  </main>
</template>

<style scoped>
.dash {
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
  position: relative;
}

.dash__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.dash__subtitle {
  margin-top: var(--space-1);
}

.dash__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.dash__search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-input);
  background: var(--color-surface);
}

.dash__search-icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.dash__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  color: var(--color-text);
}

.dash__search-input::placeholder {
  color: var(--color-text-muted);
}

.dash__sort-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-input);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.dash__sort-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.dash__sort-label {
  margin: 0 0 var(--space-4);
}

/* Mobile: единственный способ создать проект — FAB (см. задание, секция
   NAVIGATION). Инлайн-кнопка появляется только с tablet/desktop, где есть
   место в toolbar рядом с поиском и FAB был бы избыточен. */
.dash__new-btn {
  display: none;
  flex-shrink: 0;
}

.dash__fab {
  position: fixed;
  right: var(--space-5);
  bottom: max(var(--space-5), env(safe-area-inset-bottom));
  z-index: 30;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(255, 106, 0, 0.35);
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.dash__fab:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

.dash__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

.skeleton-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-card__preview {
  height: 150px;
  border-radius: var(--radius-input);
  background: var(--color-surface-subtle);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

.skeleton-card__line {
  height: 12px;
  border-radius: 4px;
  background: var(--color-surface-subtle);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

.skeleton-card__line--wide { width: 70%; }
.skeleton-card__line--narrow { width: 40%; }

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.dash__state {
  padding: var(--space-12) var(--space-6);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.dash__state-icon {
  color: var(--color-warning);
  margin-bottom: var(--space-2);
}

.dash__state--empty {
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card-lg);
  background: var(--color-surface-subtle);
}

.dash__empty-sketch {
  width: 120px;
  height: auto;
  margin-bottom: var(--space-4);
}

.dash__state .btn {
  margin-top: var(--space-3);
}

@media (min-width: 768px) {
  .dash {
    padding: var(--space-8) var(--space-6) var(--space-16);
  }

  .dash__new-btn {
    display: inline-flex;
  }

  .dash__fab {
    display: none;
  }

  .dash__search {
    max-width: 420px;
  }
}
</style>
