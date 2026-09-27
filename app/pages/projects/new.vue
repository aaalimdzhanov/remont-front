<script setup lang="ts">
// Создание проекта — единственный экран, без layout='app' (тот рендерит
// AppHeader с аватаром/меню, что не соответствует референсу "← ishonchliusta").
// Свой header здесь — тот же принцип, что и у pages/projects/[id].vue
// (EditorHeader): страница сама владеет всем своим экраном.
//
// Тип объекта (BuildingType) больше не спрашивается отдельным полем — это
// НЕ new API field и не смена Building schema (createProject уже принимал
// type раньше), просто UI больше не даёт его выбирать: единственное поле
// экрана — название (см. задание, секция NO MULTI-STEP FLOW). Молча
// используется 'house' по умолчанию.
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
useHead({ title: computed(() => t('projects.newTitle')) })

const { createProject, isCreating, error, clearError } = useProjectPersistence()

const name = ref('')
const validationError = ref<string | null>(null)

// Project Location v1 — выбирается ДО submit и уходит в тот же POST
// /api/v1/projects, что и name/building (см. задание, секция CREATE PROJECT
// SEMANTICS: "не local draft -> потом Save -> POST", location либо есть в
// самом создающем запросе, либо её нет вовсе — city пустой означает
// location=null, ничего не выдумываем). ProjectLocationFields сама сбрасывает
// district при смене city.
const locationCity = ref('')
const locationDistrict = ref('')

function handleInput() {
  if (validationError.value) validationError.value = null
  if (error.value) clearError()
}

async function handleCreate() {
  if (isCreating.value) return

  const trimmed = name.value.trim()
  if (!trimmed) {
    validationError.value = t('projects.nameRequired')
    return
  }

  const location = locationCity.value ? { city: locationCity.value, district: locationDistrict.value } : null
  const id = await createProject({ name: trimmed, type: 'house', location })
  if (id) await navigateTo(`/projects/${id}`)
}

function handleBack() {
  navigateTo('/projects')
}
</script>

<template>
  <div class="new-project">
    <header class="new-project__header">
      <button type="button" class="new-project__back" :aria-label="t('projects.backToProjectsAriaLabel')" @click="handleBack">
        <UiIcon name="chevron-left" :size="20" />
      </button>
      <NuxtLink to="/marketplace" class="new-project__brand">
        <UiBrandLogo variant="header" />
      </NuxtLink>
    </header>

    <main class="new-project__content">
      <div class="new-project__intro">
        <h1 class="text-h1">
          {{ t('projects.newTitle') }}
        </h1>
        <p class="text-secondary">
          {{ t('projects.newSubtitle') }}
        </p>
      </div>

      <form class="new-project__form" @submit.prevent="handleCreate">
        <label class="field">
          <span class="field__label">{{ t('projects.nameLabel') }}</span>
          <input
            v-model="name"
            type="text"
            name="projectName"
            autocomplete="off"
            autofocus
            class="input"
            :class="{ 'input--error': validationError }"
            :placeholder="t('projects.namePlaceholder')"
            :disabled="isCreating"
            :aria-invalid="validationError ? 'true' : undefined"
            aria-describedby="new-project-name-error"
            @input="handleInput"
          >
          <span v-if="validationError" id="new-project-name-error" class="field__error">
            {{ validationError }}
          </span>
        </label>

        <div class="new-project__location">
          <span class="field__label">{{ t('projects.locationLabel') }}</span>
          <p class="text-caption text-muted new-project__location-hint">
            {{ t('projects.locationHint') }}
          </p>
          <ProjectLocationFields v-model:city="locationCity" v-model:district="locationDistrict" />
        </div>

        <p v-if="error" class="new-project__api-error">
          {{ error.message }}
          <button type="button" class="new-project__api-error-close" :aria-label="t('common.hideError')" @click="clearError">
            <UiIcon name="close" :size="14" />
          </button>
        </p>

        <div class="new-project__spacer" aria-hidden="true" />

        <button type="submit" class="btn btn-primary new-project__submit" :disabled="isCreating">
          {{ isCreating ? t('projects.creating') : t('projects.new') }}
        </button>
      </form>
    </main>
  </div>
</template>

<style scoped>
.new-project {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.new-project__header {
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

.new-project__back {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-left: calc(-1 * var(--space-2));
  border: none;
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-input);
}

.new-project__back:hover {
  color: var(--color-text);
  background: var(--color-surface-subtle);
}

.new-project__brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.new-project__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4) max(var(--space-6), env(safe-area-inset-bottom));
}

.new-project__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-8);
}

.new-project__form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.new-project__location {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.new-project__location-hint {
  margin: 0 0 var(--space-2);
}

.new-project__spacer {
  flex: 1;
  min-height: var(--space-8);
}

.new-project__submit {
  width: 100%;
  height: 48px;
}

.new-project__api-error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.new-project__api-error-close {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .new-project__header {
    min-height: 64px;
    padding: 0 var(--space-6);
    padding-top: env(safe-area-inset-top);
  }

  .new-project__content {
    padding-top: var(--space-16);
  }

  .new-project__spacer {
    min-height: var(--space-16);
  }
}
</style>
