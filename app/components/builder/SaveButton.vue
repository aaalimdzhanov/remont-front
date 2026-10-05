<script setup lang="ts">
// Глобальная "Сохранить проект" CTA. Смонтирована в DraftHeader.vue (не
// Builder.vue — см. задание "НАВИГАЦИЯ И СОХРАНЕНИЕ В GUEST BUILDER":
// кнопка должна быть "постоянной частью Builder header", т.е. верхней
// навигации, а не canvas-toolbar), поэтому видна всегда независимо от
// selected room/wall/door/window/active tool/pending opening/2D/3D/Размеры —
// это свойство DraftHeader.vue как общего page-level header, а не
// какой-либо логики внутри этого компонента.
//
// Рендерится ТОЛЬКО когда у текущего документа ещё НЕТ backend-проекта
// (projectId === null) — то есть практически только на публичном
// /projects/draft. На /projects/{id} (уже сохранённый проект) сохранение
// уже есть в EditorHeader.vue (autosave + кнопка "Сохранить", PUT по
// существующему id) — этот компонент там не используется вообще
// (DraftHeader.vue монтируется только на /projects/draft), но guard
// оставлен как защита на случай повторного использования в будущем.
//
// Поведение:
//  - авторизован → создаёт реальный проект прямо сейчас
//    (createProjectFromDraft) и открывает его;
//  - не авторизован → сохраняет черновик локально и ведёт на существующий
//    /auth/login (?redirect=/projects/draft?save=1 — та же схема, что
//    MarketplaceAuthGate, см. utils/authRedirect.ts); draft.vue сам
//    доделывает сохранение автоматически, как только пользователь вернётся
//    уже авторизованным — без повторного клика и без повторного рисования
//    плана (см. doc comment в draft.vue onMounted).
const { document: buildingDocument } = useBuilding()
const { isAuthenticated } = useAuth()
const { projectId, isCreating, error, clearError, createProjectFromDraft } = useProjectPersistence()
const { t } = useI18n()

async function handleSave() {
  if (isAuthenticated.value) {
    const id = await createProjectFromDraft(buildingDocument.value)
    if (id) {
      clearDraftStorage()
      await navigateTo(`/projects/${id}`)
    }
    return
  }

  saveDraftToStorage(buildingDocument.value)
  await navigateTo({ path: '/auth/login', query: { redirect: '/projects/draft?save=1' } })
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
        <!-- "Сохранить проект" на desktop, "Сохранить" на узком mobile — см.
             задание: "если не помещается — Сохранить". Оба span'а в DOM
             всегда, переключает чистый CSS (media query ниже). -->
        <span class="builder-save__label-full">{{ t('builder.draftSaveButton') }}</span>
        <span class="builder-save__label-short">{{ t('builder.draftSaveButtonShort') }}</span>
      </template>
    </button>

    <p v-if="error" class="builder-save__error">
      {{ error.message }}
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

/* ≥420px — "Сохранить проект" целиком помещается без переноса/обрезки даже
   на самой узкой QA-ширине (375px — короткая подпись). */
@media (min-width: 420px) {
  .builder-save__label-short {
    display: none;
  }

  .builder-save__label-full {
    display: inline;
  }
}

/* <640px — тот же breakpoint, на котором .builder__canvas-toolbar сам
   переходит на flex-wrap (см. Builder.vue): строка и так плотная (2D/3D +
   Размеры + Save), подсказку прячем, саму кнопку — никогда (поведение
   "Сохранить" уже самообъясняется кликом на /auth/login). */
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
