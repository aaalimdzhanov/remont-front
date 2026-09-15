<script setup lang="ts">
const { pendingOpeningType, beginPlacingOpening, cancelPlacingOpening } = useBuilding()
</script>

<template>
  <div class="opening-tool">
    <template v-if="!pendingOpeningType">
      <button type="button" class="tool-btn" @click="beginPlacingOpening('door')">
        <UiIcon name="door" :size="18" />
        Дверь
      </button>
      <button type="button" class="tool-btn" @click="beginPlacingOpening('window')">
        <UiIcon name="window" :size="18" />
        Окно
      </button>
    </template>

    <div v-else class="opening-tool__hint">
      <span class="text-small">
        Кликните по стене, чтобы добавить {{ pendingOpeningType === 'door' ? 'дверь' : 'окно' }}
      </span>
      <button type="button" class="btn btn-secondary btn-sm" @click="cancelPlacingOpening">
        Отмена
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
