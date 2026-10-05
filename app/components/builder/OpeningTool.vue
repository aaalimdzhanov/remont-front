<script setup lang="ts">
// Было: Дверь/Окно рендерились ТОЛЬКО когда pendingOpeningType пуст
// (v-if="!pendingOpeningType"), а при выборе инструмента весь блок кнопок
// заменялся на hint — toolbar визуально "терял" Дверь/Окно, оставляя только
// Выделить/Помещение (см. задание "BUG 1 — ПРОПАДАЮТ ИНСТРУМЕНТЫ"). Это и
// противоречило RoomTool.vue (его кнопка "Помещение" уже всегда видна, hint
// рисуется rядом — та же схема, что здесь нужна), и самому mobile CSS в
// Builder.vue (.builder__tools :deep(.opening-tool__hint) уже задан как
// position:fixed bottom-overlay, то есть вёрстка заранее рассчитана на то,
// что кнопки остаются на месте, а hint просто всплывает поверх).
//
// Теперь обе кнопки рендерятся ВСЕГДА, с tool-btn--active на активном типе
// (тот же класс/стиль, что у Select/Помещение) — pendingOpeningType влияет
// только на hint/курсор/обработку клика по стене (Plan2D.vue, не тронут),
// не на наличие кнопок.
const { pendingOpeningType, beginPlacingOpening, cancelPlacingOpening } = useBuilding()
const { t } = useI18n()

// Повторный клик по уже активному инструменту — отмена (симметрично
// RoomTool.vue toggle()); клик по другому типу — beginPlacingOpening() сам
// переключает pendingOpeningType без промежуточной отмены.
function toggleDoor() {
  if (pendingOpeningType.value === 'door') cancelPlacingOpening()
  else beginPlacingOpening('door')
}

function toggleWindow() {
  if (pendingOpeningType.value === 'window') cancelPlacingOpening()
  else beginPlacingOpening('window')
}
</script>

<template>
  <div class="opening-tool">
    <button
      type="button"
      class="tool-btn"
      :class="{ 'tool-btn--active': pendingOpeningType === 'door' }"
      data-tool="door"
      :aria-label="t('builder.door')"
      :aria-pressed="pendingOpeningType === 'door'"
      @click="toggleDoor"
    >
      <UiIcon name="door" :size="18" />
      {{ t('builder.door') }}
    </button>
    <button
      type="button"
      class="tool-btn"
      :class="{ 'tool-btn--active': pendingOpeningType === 'window' }"
      data-tool="window"
      :aria-label="t('builder.window')"
      :aria-pressed="pendingOpeningType === 'window'"
      @click="toggleWindow"
    >
      <UiIcon name="window" :size="18" />
      {{ t('builder.window') }}
    </button>

    <div v-if="pendingOpeningType" class="opening-tool__hint">
      <span class="text-small">
        {{ pendingOpeningType === 'door' ? t('builder.clickWallToAddDoor') : t('builder.clickWallToAddWindow') }}
      </span>
      <button type="button" class="btn btn-secondary btn-sm" @click="cancelPlacingOpening">
        {{ t('common.cancel') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.opening-tool {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.opening-tool__hint {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-panel);
  background: var(--color-warning-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}
</style>
