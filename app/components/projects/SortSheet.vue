<script setup lang="ts">
// Bottom sheet сортировки Dashboard. Все 4 критерия — реальные поля/производные:
// updated_at, created_at, name — с backend напрямую; area — уже посчитанная
// Geometry/Calculation Engine статистика (building.calculated.areas.floor),
// не выдумана здесь. Визуальная оболочка та же, что у существующих модалок
// (UiConfirmDialog/RenameProjectDialog) — overlay + панель, только прижата к
// нижнему краю с "ручкой" сверху, как в мобильном mockup задания.
export type SortOption = 'updatedAt' | 'createdAt' | 'name' | 'area'

defineProps<{ open: boolean, modelValue: SortOption }>()
const emit = defineEmits<{ 'update:modelValue': [SortOption], apply: [], cancel: [] }>()

const { t } = useI18n()

// Те же 4 опции и i18n-ключи, что и sortLabel() на pages/projects/index.vue
// (namespace projects.sort.*) — единственный источник текста для сортировки,
// не дублируется отдельным набором строк здесь.
const optionValues: SortOption[] = ['updatedAt', 'createdAt', 'name', 'area']
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sort-sheet__overlay" @click.self="emit('cancel')">
      <div class="sort-sheet__panel" role="dialog" aria-modal="true" :aria-label="t('projects.sortSheetTitle')">
        <div class="sort-sheet__handle" aria-hidden="true" />
        <h3 class="sort-sheet__title">
          {{ t('projects.sortSheetTitle') }}
        </h3>

        <label v-for="value in optionValues" :key="value" class="sort-sheet__option">
          <input
            type="radio"
            name="project-sort"
            :value="value"
            :checked="modelValue === value"
            @change="emit('update:modelValue', value)"
          >
          <span>{{ t(`projects.sort.${value}`) }}</span>
        </label>

        <button type="button" class="btn btn-primary sort-sheet__apply" @click="emit('apply')">
          {{ t('common.apply') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sort-sheet__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.sort-sheet__panel {
  width: 100%;
  max-width: 480px;
  background: var(--color-surface);
  border-top-left-radius: var(--radius-modal);
  border-top-right-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  padding: var(--space-3) var(--space-6) var(--space-6);
  padding-bottom: max(var(--space-6), env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sort-sheet__handle {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  margin-bottom: var(--space-3);
}

.sort-sheet__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-2);
}

.sort-sheet__option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-1);
  font-size: var(--font-body-size);
  color: var(--color-text);
  cursor: pointer;
  min-height: 44px;
}

.sort-sheet__option input {
  width: 20px;
  height: 20px;
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.sort-sheet__apply {
  margin-top: var(--space-4);
  width: 100%;
}

/* Desktop/tablet — тот же bottom sheet, только центрирован и не прижат
   к краям экрана: задание просит именно bottom sheet поведение, менять его
   на dropdown только из-за ширины экрана не нужно. */
@media (min-width: 768px) {
  .sort-sheet__overlay {
    align-items: center;
  }

  .sort-sheet__panel {
    border-radius: var(--radius-modal);
    padding-bottom: var(--space-6);
  }
}
</style>
