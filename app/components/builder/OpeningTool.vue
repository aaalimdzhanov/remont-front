<script setup lang="ts">
const { pendingOpeningType, beginPlacingOpening, cancelPlacingOpening } = useBuilding()
const { t } = useI18n()
</script>

<template>
  <div class="opening-tool">
    <template v-if="!pendingOpeningType">
      <button type="button" class="tool-btn" data-tool="door" @click="beginPlacingOpening('door')">
        <UiIcon name="door" :size="18" />
        {{ t('builder.door') }}
      </button>
      <button type="button" class="tool-btn" data-tool="window" @click="beginPlacingOpening('window')">
        <UiIcon name="window" :size="18" />
        {{ t('builder.window') }}
      </button>
    </template>

    <div v-else class="opening-tool__hint">
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
