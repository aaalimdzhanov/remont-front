<script setup lang="ts">
// Создание проекта. layout:'app' — тот же общий AppHeader.vue, что и на
// /projects/marketplace/orders/reviews (см. правку "Header consistency"):
// раньше здесь был собственный header (back-button + логотип, без
// AppProfileMenu/навигации), визуально отличавшийся от остального
// authenticated-приложения. "← Проекты" как отдельная кнопка больше не
// нужна — тот же переход уже даёт активная вкладка "Проекты" в AppModeNav
// (route.path.startsWith('/projects'), см. utils/userMode.ts).
//
// Тип объекта (BuildingType) больше не спрашивается отдельным полем — это
// НЕ new API field и не смена Building schema (createProject уже принимал
// type раньше), просто UI больше не даёт его выбирать: единственное поле
// экрана — название (см. задание, секция NO MULTI-STEP FLOW). Молча
// используется 'house' по умолчанию.
definePageMeta({ middleware: 'auth', layout: 'app' })

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
</script>

<template>
  <div class="new-project">
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
  display: flex;
  flex-direction: column;
  /* layout/app.vue: .app-shell__content — flex:1 внутри flex-column
     .app-shell (min-height:100vh) — резолвит реальную (definite) height, от
     которой здесь можно взять 100%, чтобы .new-project__spacer ниже по
     прежнему прижимал submit-кнопку к низу экрана на коротком контенте. */
  min-height: 100%;
}

.new-project__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) max(var(--space-6), env(safe-area-inset-bottom));
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
  .new-project__content {
    padding-top: var(--space-8);
  }

  .new-project__spacer {
    min-height: var(--space-16);
  }
}
</style>
