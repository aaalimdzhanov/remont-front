<script setup lang="ts">
// Раньше здесь была форма (название/тип/ширина/длина) с фиксированным
// созданием в углу здания. Теперь инструмент только "вооружает" режим
// рисования протяжкой на плане (сама протяжка и preview — в Plan2D.vue,
// создание — через существующий addRoom с позицией). Название/тип и
// остальные свойства редактируются после создания в Properties Panel
// (PropertiesRoom.vue уже это умеет) — дублировать форму здесь не нужно.
const { clearSelection } = useBuilding()
const { roomDrawActive, activateRoomDraw, deactivateRoomDraw } = useEditorView()
const { t } = useI18n()

function toggle() {
  if (roomDrawActive.value) {
    deactivateRoomDraw()
  } else {
    clearSelection()
    activateRoomDraw()
  }
}
</script>

<template>
  <div class="room-tool">
    <button
      type="button"
      class="tool-btn"
      :class="{ 'tool-btn--active': roomDrawActive }"
      data-tool="room"
      :aria-label="t('builder.roomToolAriaLabel')"
      :aria-pressed="roomDrawActive"
      @click="toggle"
    >
      <UiIcon name="room" :size="18" />
      {{ t('builder.room') }}
    </button>

    <div v-if="roomDrawActive" class="room-tool__hint">
      <span class="text-small">
        {{ t('builder.drawRoomHint') }}
      </span>
      <button type="button" class="btn btn-secondary btn-sm" @click="deactivateRoomDraw">
        {{ t('common.cancel') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.room-tool {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.room-tool__hint {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-panel);
  background: var(--color-primary-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}
</style>
