<script setup lang="ts">
// "Сохранить проект" CTA для Guest Work Builder (/projects/draft/works) — та
// же схема, что BuilderSaveButton.vue на /projects/draft, только: (1) после
// авторизации нужно создать не только Project, но и все guest-работы как
// ProjectWork (см. useGuestWorkBuilder.saveSessionAfterAuth), и (2) конечная
// страница — сохранённый Work Builder проекта (/projects/{id}/works), а не
// план (/projects/{id}) — пользователь должен вернуться именно туда, где
// продолжал работу (см. задание, секция GUEST SAVE: "НЕ отправлять просто на
// dashboard").
//
// Рендерится только когда у текущего документа ещё нет backend-проекта
// (projectId === null) — тот же guard, что у BuilderSaveButton, на случай
// повторного использования в будущем.
const { document: buildingDocument } = useBuilding()
const { isAuthenticated } = useAuth()
const { projectId } = useProjectPersistence()
const guestWorkBuilder = useGuestWorkBuilder()
const { isCreating, createError } = guestWorkBuilder
const { t } = useI18n()

async function handleSave() {
  if (isAuthenticated.value) {
    const { projectId: id, failedCount } = await guestWorkBuilder.saveSessionAfterAuth(buildingDocument.value)
    if (id) {
      clearDraftStorage()
      // см. useGuestWorkBuilder.saveSessionAfterAuth doc comment (AUTH
      // TRANSITION) — не молчать о частично не сохранённых работах.
      await navigateTo(failedCount > 0
        ? { path: `/projects/${id}/works`, query: { saveIssues: String(failedCount) } }
        : `/projects/${id}/works`)
    }
    return
  }

  saveDraftToStorage(buildingDocument.value)
  await navigateTo({ path: '/auth/login', query: { redirect: '/projects/draft/works?save=1' } })
}

function clearError() {
  createError.value = null
}
</script>

<template>
  <div v-if="projectId === null" class="builder-save">
    <span v-if="!isAuthenticated" class="builder-save__hint">
      {{ t('builder.draftLoginHint') }}
    </span>

    <button type="button" class="btn btn-primary btn-sm builder-save__btn" :disabled="isCreating" @click="handleSave">
      <template v-if="isCreating">{{ t('builder.draftSaving') }}</template>
      <template v-else>
        <span class="builder-save__label-full">{{ t('builder.draftSaveButton') }}</span>
        <span class="builder-save__label-short">{{ t('builder.draftSaveButtonShort') }}</span>
      </template>
    </button>

    <p v-if="createError" class="builder-save__error">
      {{ createError.message }}
      <button type="button" @click="clearError">
        <UiIcon name="close" :size="14" />
      </button>
    </p>
  </div>
</template>

<style scoped>
.builder-save {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.builder-save__hint {
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.builder-save__btn {
  flex-shrink: 0;
}

.builder-save__label-short {
  display: inline;
}

.builder-save__label-full {
  display: none;
}

@media (min-width: 420px) {
  .builder-save__label-short {
    display: none;
  }

  .builder-save__label-full {
    display: inline;
  }
}

@media (max-width: 639px) {
  .builder-save__hint {
    display: none;
  }
}

.builder-save__error {
  position: absolute;
  top: 100%;
  right: 0;
  margin: var(--space-2) 0 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
  z-index: 5;
}

.builder-save__error button {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
}
</style>
