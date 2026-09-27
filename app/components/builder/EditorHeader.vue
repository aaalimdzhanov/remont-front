<script setup lang="ts">
// Header страницы /projects/{id}. Desktop (≥768px) — один компактный ряд, как
// и раньше: logo + "← Проекты" + Project Navigation + имя + save status +
// Save + AppProfileMenu (см. предыдущую задачу). Mobile (<768px) — это НЕ
// уменьшенная копия того же ряда, а отдельная композиция (см. задание "Mobile
// Builder НЕ должен быть уменьшенной копией desktop"):
//   1) глобальный ряд — переиспользуем существующий AppHeader.vue (тот же
//      logo+AppProfileMenu, что и на Dashboard) — единственное место, где
//      живёт 👤, никакого второго user-icon рядом с save status;
//   2) компактный project-ряд — "← Проекты" / имя / ТОЛЬКО текст статуса
//      сохранения (без отдельной кнопки "Сохранить" — задание прямо просит
//      убрать дублирующую кнопку на mobile, autosave остаётся единственным
//      механизмом сохранения там);
//   3) ProjectBottomNav — табы План/Работы/Расчёты внизu экрана, а не второй
//      копией вверху (см. ProjectBottomNav.vue).
// Delete проекта сюда не относится — это project management, доступное через
// Dashboard/project card menu. Никакого прямого fetch() здесь — только
// вызовы useBuilding()/useProjectPersistence().
const { document: buildingDocument, renameProject } = useBuilding()
const {
  projectId,
  isDirty,
  saveStatus,
  lastSavedAt,
  error,
  clearError,
  save,
  isSaving,
  location,
  setLocation,
} = useProjectPersistence()

// Project Location v1 — компактный "📍 ..." chip рядом с именем проекта,
// открывающий небольшую inline-панель Город/Район прямо под header'ом (не
// отдельная страница/модалка — Location здесь просто ещё одно свойство уже
// открытого проекта, редактируется тем же способом, что и имя). Использует
// тот же formatLocation()/Location-тип, что и Marketplace (см. utils/
// marketplace.ts) — не второй форматтер.
const { t, locale } = useI18n()

const editingLocation = ref(false)
const draftCity = ref('')
const draftDistrict = ref('')
const locationLabel = computed(() => formatLocation(location.value))

function openLocationEditor() {
  draftCity.value = location.value?.city ?? ''
  draftDistrict.value = location.value?.district ?? ''
  editingLocation.value = true
}

function closeLocationEditor() {
  editingLocation.value = false
}

// setLocation() только обновляет state и планирует autosave (см.
// useProjectPersistence.ts) — save() здесь вызывается явно, чтобы
// "Сохранить"/"Очистить" в этой панели давали немедленный результат, тем же
// save() pipeline, что и основная кнопка "Сохранить" справа, а не second
// autosave.
async function handleSaveLocation() {
  const next = draftCity.value ? { city: draftCity.value, district: draftDistrict.value } : null
  setLocation(next)
  editingLocation.value = false
  await save()
}

async function handleClearLocation() {
  setLocation(null)
  editingLocation.value = false
  await save()
}

const saveLabel = computed(() => {
  switch (saveStatus.value) {
    case 'saving': return t('builder.saveButtonLabel.saving')
    case 'error': return t('builder.saveButtonLabel.error')
    case 'unsaved': return t('builder.saveButtonLabel.unsaved')
    case 'saved': return t('builder.saveButtonLabel.saved')
  }
})

const saveStatusVariant = computed(() => {
  switch (saveStatus.value) {
    case 'saving': return 'neutral'
    case 'error': return 'error'
    case 'unsaved': return 'warning'
    case 'saved': return 'success'
  }
})

function formatDate(iso: string): string {
  try {
    const date = new Date(iso)
    const time = date.toLocaleTimeString(localeTag(locale.value), { hour: '2-digit', minute: '2-digit' })
    return `${formatShortDate(date, locale.value)}, ${time}`
  } catch {
    return iso
  }
}

const saveStatusLabel = computed(() => {
  switch (saveStatus.value) {
    case 'saving': return t('builder.saveStatusLabel.saving')
    case 'error': return t('builder.saveStatusLabel.error')
    case 'unsaved': return t('builder.saveStatusLabel.unsaved')
    case 'saved': return lastSavedAt.value ? t('builder.saveStatusLabel.savedAt', { date: formatDate(lastSavedAt.value) }) : t('builder.saveStatusLabel.saved')
  }
})

const saveDisabled = computed(() => isSaving.value || saveStatus.value === 'saved')

async function handleSave() {
  await save()
}

// Тот же принцип, что и dirty-navigation-protection в
// pages/projects/[id]/index.vue (onBeforeRouteLeave): logout — тоже способ
// "уйти", и потерять несохранённые правки так же легко. AppProfileMenu
// вызывает эту функцию перед реальным logout() и не выходит, если она
// вернула false.
function confirmLogout(): boolean {
  if (!isDirty.value) return true
  return window.confirm(t('builder.confirmLogoutUnsaved'))
}
</script>

<template>
  <!-- MOBILE (<768px): глобальный ряд, общий с Dashboard. -->
  <AppHeader class="editor-header__mobile-global" />

  <!-- DESKTOP (≥768px): существующий компактный ряд без изменений. -->
  <header class="editor-header">
    <div class="editor-header__left">
      <NuxtLink to="/marketplace" class="editor-header__brand">
        <UiBrandLogo variant="compact" />
      </NuxtLink>
      <NuxtLink to="/projects" class="editor-header__back">
        <UiIcon name="chevron-left" :size="16" />
        {{ t('navigation.backToProjects') }}
      </NuxtLink>
      <ProjectNavigation v-if="projectId" :project-id="projectId" />
    </div>

    <input
      class="input editor-header__name"
      :value="buildingDocument.project.name"
      :placeholder="t('builder.projectNamePlaceholder')"
      :aria-label="t('builder.projectNamePlaceholder')"
      @change="renameProject(($event.target as HTMLInputElement).value)"
    >

    <button type="button" class="editor-header__location-chip" @click="openLocationEditor">
      <UiIcon name="pin" :size="14" />
      <span class="editor-header__location-chip-text">{{ locationLabel ?? t('builder.setLocationPlaceholder') }}</span>
    </button>

    <div class="editor-header__actions">
      <span class="status-dot" :class="`status-dot--${saveStatusVariant}`">
        <UiIcon v-if="saveStatus === 'saved'" name="check" :size="14" />
        <UiIcon v-else-if="saveStatus === 'error'" name="alert" :size="14" />
        {{ saveStatusLabel }}
      </span>

      <button type="button" :disabled="saveDisabled" class="btn btn-primary btn-sm" @click="handleSave">
        {{ saveLabel }}
      </button>

      <AppProfileMenu :on-before-logout="confirmLogout" />
    </div>
  </header>

  <!-- MOBILE (<768px): компактный project-ряд — без лого/user icon (те уже
       в глобальном ряду выше) и без кнопки "Сохранить" (только текст
       статуса — autosave делает сохранение сама, см. задание). -->
  <div class="editor-header__mobile-project">
    <NuxtLink to="/projects" class="editor-header__mobile-back" :aria-label="t('builder.backToProjectsAriaLabel')">
      <UiIcon name="chevron-left" :size="16" />
      {{ t('navigation.backToProjects') }}
    </NuxtLink>
    <p class="editor-header__mobile-name">
      {{ buildingDocument.project.name }}
    </p>
    <button type="button" class="editor-header__location-chip editor-header__location-chip--mobile" @click="openLocationEditor">
      <UiIcon name="pin" :size="14" />
      <span class="editor-header__location-chip-text">{{ locationLabel ?? t('builder.setLocationPlaceholder') }}</span>
    </button>
    <span class="status-dot" :class="`status-dot--${saveStatusVariant}`">
      <UiIcon v-if="saveStatus === 'saved'" name="check" :size="14" />
      <UiIcon v-else-if="saveStatus === 'error'" name="alert" :size="14" />
      {{ saveStatusLabel }}
    </span>
  </div>

  <div v-if="editingLocation" class="editor-header__location-panel">
    <ProjectLocationFields v-model:city="draftCity" v-model:district="draftDistrict" />
    <div class="editor-header__location-panel-actions">
      <button type="button" class="btn btn-ghost btn-sm" @click="closeLocationEditor">
        {{ t('common.cancel') }}
      </button>
      <button v-if="location" type="button" class="btn btn-secondary btn-sm" @click="handleClearLocation">
        {{ t('common.clear') }}
      </button>
      <button type="button" class="btn btn-primary btn-sm editor-header__location-panel-save" :disabled="!draftCity" @click="handleSaveLocation">
        {{ t('common.save') }}
      </button>
    </div>
  </div>

  <p v-if="error" class="editor-header__error">
    {{ error.message }}
    <button type="button" @click="clearError">
      <UiIcon name="close" :size="14" />
    </button>
  </p>

  <ProjectBottomNav v-if="projectId" :project-id="projectId" />
</template>

<style scoped>
.editor-header {
  display: none;
}

.editor-header__mobile-project {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.editor-header__mobile-back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  align-self: flex-start;
  margin: calc(-1 * var(--space-1)) 0 0 calc(-1 * var(--space-1));
  padding: var(--space-1);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.editor-header__mobile-name {
  margin: 0;
  font-weight: 600;
  font-size: var(--font-body-lg-size);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-header__left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.editor-header__location-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
  max-width: 220px;
  height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
  cursor: pointer;
}

.editor-header__location-chip:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.editor-header__location-chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-header__location-chip--mobile {
  align-self: flex-start;
  max-width: 100%;
  height: 32px;
}

.editor-header__location-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.editor-header__location-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

@media (min-width: 768px) {
  .editor-header__location-panel {
    padding: var(--space-4);
  }
}

/* Save status + Save + иконка пользователя — компактный кластер, прижатый
   к правому краю (margin-left:auto), чтобы Project Navigation слева и
   project actions справа не боролись за место в середине строки и не
   выталкивали друг друга на отдельную строку. */
.editor-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  margin-left: auto;
}

.editor-header__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.editor-header__back:hover {
  color: var(--color-text);
}

.editor-header__name {
  flex: 1 1 200px;
  min-width: 0;
  height: 36px;
}

.editor-header__error {
  margin: var(--space-2) var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.editor-header__error button {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  display: flex;
}

/* ≥768px: возвращаемся к единственному существующему desktop-ряду — mobile
   global/project-ряды и bottom nav скрыты, ничего не задваивается. */
@media (min-width: 768px) {
  .editor-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: nowrap;
    height: 64px;
    padding: 0 var(--space-4);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .editor-header__mobile-global,
  .editor-header__mobile-project {
    display: none;
  }

  .editor-header__error {
    margin: 0 var(--space-4);
  }
}
</style>
