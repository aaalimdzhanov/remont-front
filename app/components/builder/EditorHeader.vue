<script setup lang="ts">
// Header страницы /projects/{id}: имя проекта + save status + Save + Delete +
// ссылка назад к списку + auth (телефон/logout). Никакого прямого fetch()
// здесь — только вызовы useBuilding()/useProjectPersistence()/useAuth().
// Confirm при уходе с несохранёнными изменениями обрабатывается в
// pages/projects/[id].vue через onBeforeRouteLeave (единая точка для клика
// по ссылке, browser back и программной навигации) — здесь для "← Проекты"
// достаточно обычного NuxtLink.
const { document: buildingDocument, renameProject } = useBuilding()
const {
  projectId,
  isDirty,
  saveStatus,
  lastSavedAt,
  error,
  clearError,
  save,
  removeProject,
  isSaving,
  isDeleting,
} = useProjectPersistence()
const { user, logout } = useAuth()

const maskedUserPhone = computed(() => (user.value ? maskPhone(user.value.phone) : ''))

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

const showDeleteConfirm = ref(false)
const deleteMessage = computed(() =>
  isDirty.value
    ? `Проект «${buildingDocument.value.project.name}» содержит несохранённые изменения. Удалить без сохранения?`
    : `Проект «${buildingDocument.value.project.name}» будет удалён безвозвратно.`,
)

async function confirmDelete() {
  const id = projectId.value
  showDeleteConfirm.value = false
  if (!id) return
  const ok = await removeProject(id)
  if (ok) await navigateTo('/projects')
}

// Переиспользуем тот же принцип, что и dirty-navigation-protection в
// pages/projects/[id].vue (onBeforeRouteLeave), а не отдельную систему:
// logout — тоже способ "уйти", и потерять несохранённые правки так же легко.
async function handleLogout() {
  if (isDirty.value && !window.confirm('Есть несохранённые изменения. Выйти без сохранения?')) return
  await logout()
  await navigateTo('/auth/login')
}
</script>

<template>
  <header class="editor-header">
    <div class="editor-header__left">
      <NuxtLink to="/projects" class="brand-wordmark editor-header__brand">
        REMONT
      </NuxtLink>
      <NuxtLink to="/projects" class="editor-header__back">
        <UiIcon name="chevron-left" :size="16" />
        Проекты
      </NuxtLink>
    </div>

    <input
      class="input editor-header__name"
      :value="buildingDocument.project.name"
      placeholder="Название проекта"
      aria-label="Название проекта"
      @change="renameProject(($event.target as HTMLInputElement).value)"
    >

    <span class="status-dot" :class="`status-dot--${saveStatusVariant}`">
      <UiIcon v-if="saveStatus === 'saved'" name="check" :size="14" />
      <UiIcon v-else-if="saveStatus === 'error'" name="alert" :size="14" />
      {{ saveStatusLabel }}
    </span>

    <button type="button" :disabled="saveDisabled" class="btn btn-primary btn-sm" @click="handleSave">
      {{ saveLabel }}
    </button>

    <button type="button" :disabled="isDeleting" class="btn btn-ghost btn-icon" aria-label="Удалить проект" @click="showDeleteConfirm = true">
      <UiIcon name="trash" :size="16" />
    </button>

    <span v-if="maskedUserPhone" class="editor-header__phone text-caption text-muted">
      {{ maskedUserPhone }}
    </span>
    <button type="button" class="btn btn-ghost btn-sm" @click="handleLogout">
      Выйти
    </button>

    <p v-if="error" class="editor-header__error">
      {{ error.message }}
      <button type="button" @click="clearError">
        <UiIcon name="close" :size="14" />
      </button>
    </p>

    <UiConfirmDialog
      :open="showDeleteConfirm"
      title="Удалить проект?"
      :message="deleteMessage"
      confirm-text="Удалить"
      danger
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </header>
</template>

<style scoped>
.editor-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  height: 64px;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.editor-header__left {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  flex-shrink: 0;
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

.editor-header__phone {
  white-space: nowrap;
}

.editor-header__error {
  flex-basis: 100%;
  margin: 0;
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

@media (max-width: 900px) {
  .editor-header__phone {
    display: none;
  }
}

@media (max-width: 640px) {
  .editor-header {
    height: auto;
    padding: var(--space-2) var(--space-3);
  }

  .editor-header__name {
    order: 3;
    flex-basis: 100%;
  }

  .status-dot {
    order: 4;
  }
}
</style>
