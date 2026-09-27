<script setup lang="ts">
// Карточка проекта на Dashboard — теперь чисто презентационная. GET /projects
// (список) отдаёт только метаданные (id/name/status/даты), без Building JSON
// (см. projectListItem на backend) — полный проект (нужен для preview/площади/
// комнат и для самого PUT при переименовании) грузит РОДИТЕЛЬ
// (pages/projects/index.vue) параллельно для всех карточек сразу — не через
// useProjectPersistence/useBuilding (которые держат состояние ЕДИНСТВЕННОГО
// открытого в Builder'е проекта), а напрямую через api/projects.ts. Карточка
// сама HTTP не делает вообще — только рендерит то, что получила, и просит
// родителя (emit) выполнить rename/delete/open.
import type { Project, ProjectSummary } from '~/api/types'
import { formatShortDate, localeTag } from '~/utils/i18nFormat'

const props = defineProps<{ project: ProjectSummary, detail: Project | null, loading: boolean }>()
const emit = defineEmits<{ open: [], delete: [], rename: [name: string] }>()

const { t, locale } = useI18n()

// detail.building — это весь BuildingDocument (schema/project/units/building/
// calculated), а не сам Building — .building.building — реальная геометрия,
// .building.calculated — уже посчитанная статистика (Geometry/Calculation
// Engine), ничего здесь заново не считается.
const area = computed(() => props.detail?.building.calculated.areas.floor ?? null)
const roomCount = computed(() => props.detail?.building.building.rooms.length ?? null)

function formatUpdatedAt(iso: string): string {
  let date: Date
  try {
    date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
  } catch {
    return iso
  }
  const now = new Date()
  const tag = localeTag(locale.value)
  const time = date.toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' })
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(date, now)) return t('projects.updatedToday', { time })
  if (isSameDay(date, yesterday)) return t('projects.updatedYesterday', { time })
  return formatShortDate(date, locale.value)
}

// ---- Меню (переименовать/удалить/отмена) ----
const menuOpen = ref(false)
const rootEl = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (menuOpen.value && rootEl.value && !rootEl.value.contains(event.target as Node)) closeMenu()
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

// ---- Переименование ----
const renameOpen = ref(false)

function openRename() {
  closeMenu()
  renameOpen.value = true
}

function confirmRename(newName: string) {
  renameOpen.value = false
  emit('rename', newName)
}

function handleDelete() {
  closeMenu()
  emit('delete')
}
</script>

<template>
  <li ref="rootEl" class="project-card">
    <button type="button" class="project-card__preview" :aria-label="t('projects.openAriaLabel')" @click="emit('open')">
      <div v-if="loading" class="project-card__preview-skeleton" />
      <ProjectsProjectPreview v-else-if="detail" :building="detail.building.building" />
      <div v-else class="project-card__preview-skeleton project-card__preview-skeleton--static" />
    </button>

    <div class="project-card__body">
      <div class="project-card__title-row">
        <button type="button" class="project-card__name" @click="emit('open')">
          {{ project.name }}
        </button>

        <div class="project-card__menu-anchor">
          <button
            type="button"
            class="project-card__menu-btn"
            :aria-label="t('projects.actionsAriaLabel')"
            :aria-expanded="menuOpen"
            @click.stop="toggleMenu"
          >
            <UiIcon name="more" :size="18" />
          </button>

          <div v-if="menuOpen" class="project-card__menu" role="menu">
            <button type="button" class="project-card__menu-item" role="menuitem" @click.stop="openRename">
              <UiIcon name="edit" :size="15" />
              {{ t('projects.rename') }}
            </button>
            <button type="button" class="project-card__menu-item project-card__menu-item--danger" role="menuitem" @click.stop="handleDelete">
              <UiIcon name="trash" :size="15" />
              {{ t('common.delete') }}
            </button>
            <div class="project-card__menu-divider" />
            <button type="button" class="project-card__menu-item" role="menuitem" @click.stop="closeMenu">
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="area !== null && roomCount !== null" class="project-card__meta text-caption text-muted">
        {{ area.toFixed(0) }} {{ t('builder.unit.m2') }} &nbsp;·&nbsp; {{ t('projects.roomsCount', { count: roomCount }, roomCount) }}
      </p>

      <p class="project-card__date text-caption text-muted">
        {{ t('projects.updatedAt', { date: formatUpdatedAt(project.updatedAt) }) }}
      </p>
    </div>

    <ProjectsRenameProjectDialog
      :open="renameOpen"
      :current-name="project.name"
      @confirm="confirmRename"
      @cancel="renameOpen = false"
    />
  </li>
</template>

<style scoped>
.project-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: box-shadow var(--transition-base);
}

.project-card:hover {
  box-shadow: 0 4px 16px rgba(37, 37, 37, 0.09);
}

.project-card__preview {
  /* Не overflow:hidden на всей .project-card — это обрезало бы абсолютно
     позиционированное меню действий (см. .project-card__menu ниже), поэтому
     скругление верхних углов задаём прямо тут, у превью (первый элемент
     карточки, вплотную к её собственным верхним углам).
     Высота фиксированная (не aspect-ratio) — карточка должна быть компактной
     (см. задание PROJECT CARD: "не занимать почти весь экран"), план всё
     равно читаем при таком масштабе благодаря viewBox+preserveAspectRatio
     в ProjectPreview.vue. */
  display: block;
  width: 100%;
  height: 150px;
  padding: 0;
  border: none;
  border-bottom: 1px solid var(--color-border);
  border-top-left-radius: var(--radius-card);
  border-top-right-radius: var(--radius-card);
  overflow: hidden;
  background: var(--color-surface-subtle);
  cursor: pointer;
}

.project-card__preview-skeleton {
  width: 100%;
  height: 100%;
  background: var(--color-surface-subtle);
  animation: project-card-pulse 1.4s ease-in-out infinite;
}

.project-card__preview-skeleton--static {
  animation: none;
}

@keyframes project-card-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.project-card__body {
  padding: var(--space-3) var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.project-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.project-card__name {
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  font-size: var(--font-body-lg-size);
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.project-card__menu-anchor {
  position: relative;
  flex-shrink: 0;
}

.project-card__menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 44px;
  min-height: 44px;
  margin: -6px -6px -6px 0;
  border: none;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-button);
}

.project-card__menu-btn:hover {
  background: var(--color-surface-subtle);
  color: var(--color-text);
}

.project-card__menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  /* Выше FAB (z-index:30 в pages/projects/index.vue) — иначе открытое меню
     карточки у нижнего края экрана перекрывается кнопкой "+", и клик по
     пункту меню вместо этого попадает на FAB. */
  z-index: 40;
  min-width: 180px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-modal);
  padding: var(--space-1);
  display: flex;
  flex-direction: column;
}

.project-card__menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: none;
  background: none;
  border-radius: var(--radius-input);
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  min-height: 44px;
}

.project-card__menu-item:hover {
  background: var(--color-surface-subtle);
}

.project-card__menu-item--danger {
  color: var(--color-error);
}

.project-card__menu-divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--space-1) 0;
}

.project-card__meta,
.project-card__date {
  margin: 0;
}
</style>
