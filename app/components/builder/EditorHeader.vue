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
} = useProjectPersistence()

const saveLabel = computed(() => {
  switch (saveStatus.value) {
    case 'saving': return 'Сохранение…'
    case 'error': return 'Повторить сохранение'
    case 'unsaved': return 'Сохранить'
    case 'saved': return 'Сохранено'
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
    return new Date(iso).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

const saveStatusLabel = computed(() => {
  switch (saveStatus.value) {
    case 'saving': return 'Сохранение…'
    case 'error': return 'Не удалось сохранить'
    case 'unsaved': return 'Несохранённые изменения'
    case 'saved': return lastSavedAt.value ? `Сохранено · ${formatDate(lastSavedAt.value)}` : 'Сохранено'
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
  return window.confirm('Есть несохранённые изменения. Выйти без сохранения?')
}
</script>

<template>
  <!-- MOBILE (<768px): глобальный ряд, общий с Dashboard. -->
  <AppHeader class="editor-header__mobile-global" />

  <!-- DESKTOP (≥768px): существующий компактный ряд без изменений. -->
  <header class="editor-header">
    <div class="editor-header__left">
      <NuxtLink to="/projects" class="editor-header__brand">
        <UiBrandLogo variant="compact" />
      </NuxtLink>
      <NuxtLink to="/projects" class="editor-header__back">
        <UiIcon name="chevron-left" :size="16" />
        Проекты
      </NuxtLink>
      <ProjectNavigation v-if="projectId" :project-id="projectId" />
    </div>

    <input
      class="input editor-header__name"
      :value="buildingDocument.project.name"
      placeholder="Название проекта"
      aria-label="Название проекта"
      @change="renameProject(($event.target as HTMLInputElement).value)"
    >

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
    <NuxtLink to="/projects" class="editor-header__mobile-back" aria-label="Назад к проектам">
      <UiIcon name="chevron-left" :size="16" />
      Проекты
    </NuxtLink>
    <p class="editor-header__mobile-name">
      {{ buildingDocument.project.name }}
    </p>
    <span class="status-dot" :class="`status-dot--${saveStatusVariant}`">
      <UiIcon v-if="saveStatus === 'saved'" name="check" :size="14" />
      <UiIcon v-else-if="saveStatus === 'error'" name="alert" :size="14" />
      {{ saveStatusLabel }}
    </span>
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
