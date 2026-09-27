<script setup lang="ts">
// Один ряд вместо двух отдельных панелей: mockup просит и "status bar"
// (X/Y, объект, площадь, периметр), и zoom-контролы "[-] 100% [+] [Fit]" —
// по факту это одна и та же нижняя строка редактора, дублировать zoom UI
// в двух местах не имеет смысла.
const { selectedObject, selectedRoom } = useBuilding()
const { cursorPosition, zoom, zoomIn, zoomOut, requestFit } = useEditorView()
const { t } = useI18n()

const objectLabel = computed(() => {
  const object = selectedObject.value
  if (!object) return '—'
  if (object.type === 'room') return selectedRoom.value?.name ?? t('builder.room')
  if (object.type === 'wall') return t('builder.wall')
  if (object.type === 'door') return t('builder.door')
  return t('builder.window')
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
        {{ cursorPosition ? t('builder.cursorPosition', { x: cursorPosition.x.toFixed(2), y: cursorPosition.z.toFixed(2) }) : t('builder.cursorPositionEmpty') }}
      </span>
      <span class="status-bar__item">{{ t('builder.objectLabel', { object: objectLabel }) }}</span>
      <span v-if="roomMetrics" class="status-bar__item">{{ t('builder.areaStatus', { area: roomMetrics.area.toFixed(1) }) }}</span>
      <span v-if="roomMetrics" class="status-bar__item">{{ t('builder.perimeterStatus', { perimeter: roomMetrics.perimeter.toFixed(1) }) }}</span>
    </div>

    <div class="status-bar__zoom">
      <button type="button" class="btn btn-ghost btn-sm status-bar__zoom-btn" :aria-label="t('builder.zoomOutAriaLabel')" @click="zoomOut">
        −
      </button>
      <span class="status-bar__zoom-value">{{ zoomPercent }}%</span>
      <button type="button" class="btn btn-ghost btn-sm status-bar__zoom-btn" :aria-label="t('builder.zoomInAriaLabel')" @click="zoomIn">
        +
      </button>
      <button type="button" class="btn btn-secondary btn-sm" :aria-label="t('builder.fitAriaLabel')" @click="requestFit">
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

/* <768px: X/Y/объект/zoom% — desktop-ориентированная детализация, лишняя на
   маленьком экране (см. mobile UX reference — там вместо этой строки только
   один floating "Fit"-контрол прямо на канвасе, см. Plan2D.vue). Сам functionality
   (zoom in/out/Fit) никуда не делся — просто не показан этой строкой на mobile. */
@media (max-width: 767px) {
  .status-bar {
    display: none;
  }
}
</style>
