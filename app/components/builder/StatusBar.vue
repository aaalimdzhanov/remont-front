<script setup lang="ts">
// Один ряд вместо двух отдельных панелей: mockup просит и "status bar"
// (X/Y, объект, площадь, периметр), и zoom-контролы "[-] 100% [+] [Fit]" —
// по факту это одна и та же нижняя строка редактора, дублировать zoom UI
// в двух местах не имеет смысла.
const { selectedObject, selectedRoom } = useBuilding()
const { cursorPosition, zoom, zoomIn, zoomOut, requestFit } = useEditorView()

const objectLabel = computed(() => {
  const object = selectedObject.value
  if (!object) return '—'
  if (object.type === 'room') return selectedRoom.value?.name ?? 'Помещение'
  if (object.type === 'wall') return 'Стена'
  if (object.type === 'door') return 'Дверь'
  return 'Окно'
})

const roomMetrics = computed(() => {
  const room = selectedRoom.value
  if (!room || room.geometry.type !== 'rectangle') return null
  return {
    area: room.geometry.width * room.geometry.length,
    perimeter: 2 * (room.geometry.width + room.geometry.length),
  }
})

const zoomPercent = computed(() => Math.round(zoom.value * 100))
</script>

<template>
  <div class="status-bar">
    <div class="status-bar__group">
      <span class="status-bar__item">
        {{ cursorPosition ? `X: ${cursorPosition.x.toFixed(2)} м, Y: ${cursorPosition.z.toFixed(2)} м` : 'X: —, Y: —' }}
      </span>
      <span class="status-bar__item">Объект: {{ objectLabel }}</span>
      <span v-if="roomMetrics" class="status-bar__item">Площадь: {{ roomMetrics.area.toFixed(1) }} м²</span>
      <span v-if="roomMetrics" class="status-bar__item">Периметр: {{ roomMetrics.perimeter.toFixed(1) }} м</span>
    </div>

    <div class="status-bar__zoom">
      <button type="button" class="btn btn-ghost btn-sm status-bar__zoom-btn" aria-label="Уменьшить масштаб" @click="zoomOut">
        −
      </button>
      <span class="status-bar__zoom-value">{{ zoomPercent }}%</span>
      <button type="button" class="btn btn-ghost btn-sm status-bar__zoom-btn" aria-label="Увеличить масштаб" @click="zoomIn">
        +
      </button>
      <button type="button" class="btn btn-secondary btn-sm" aria-label="Показать всё здание" @click="requestFit">
        Fit
      </button>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  font-size: var(--font-caption-size);
  color: var(--color-text-secondary);
}

.status-bar__group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.status-bar__zoom {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.status-bar__zoom-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: var(--font-body-lg-size);
  line-height: 1;
}

.status-bar__zoom-value {
  min-width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .status-bar__group {
    gap: var(--space-2);
  }
}
</style>
