<script setup lang="ts">
// Маленький архитектурный SVG-превью — либо одной комнаты (roomId задан),
// либо всего здания ("Весь проект", roomId === null). Использует те же
// геометрические примитивы, что и ProjectPreview.vue на Dashboard
// (app/geometry/preview.ts), но это отдельный компонент — Dashboard не
// импортирует и не трогает ничего отсюда, а этот файл не трогает
// ProjectPreview.vue. Никакой новой Geometry Engine — только другой
// потребитель тех же чистых функций.
import type { Building } from '~/types/building'
import { buildBuildingPreview, buildRoomPreview } from '~/geometry/preview'

const props = defineProps<{ building: Building, roomId: string | null }>()

const MARGIN = 0.3

interface Shape {
  hasContent: boolean
  viewBox: string
  roomRects: { x: number, y: number, width: number, height: number }[]
  wallRects: { x: number, y: number, width: number, height: number }[]
  doorRects: { x: number, y: number, width: number, height: number }[]
  windowRects: { x: number, y: number, width: number, height: number }[]
}

const shape = computed<Shape>(() => {
  if (props.roomId === null) {
    const p = buildBuildingPreview(props.building)
    if (!p.hasContent) return { hasContent: false, viewBox: '0 0 1 1', roomRects: [], wallRects: [], doorRects: [], windowRects: [] }
    return {
      hasContent: true,
      viewBox: `${-MARGIN} ${-MARGIN} ${p.viewBoxWidth + MARGIN * 2} ${p.viewBoxHeight + MARGIN * 2}`,
      roomRects: p.roomRects,
      wallRects: p.wallRects,
      doorRects: p.doorRects,
      windowRects: p.windowRects,
    }
  }

  const p = buildRoomPreview(props.building, props.roomId)
  if (!p) return { hasContent: false, viewBox: '0 0 1 1', roomRects: [], wallRects: [], doorRects: [], windowRects: [] }
  return {
    hasContent: true,
    viewBox: `${p.viewBoxX - MARGIN} ${p.viewBoxY - MARGIN} ${p.viewBoxWidth + MARGIN * 2} ${p.viewBoxHeight + MARGIN * 2}`,
    roomRects: [p.roomRect],
    wallRects: p.wallRects,
    doorRects: p.doorRects,
    windowRects: p.windowRects,
  }
})
</script>

<template>
  <div class="room-thumb">
    <svg v-if="shape.hasContent" :viewBox="shape.viewBox" preserveAspectRatio="xMidYMid meet" class="room-thumb__svg" aria-hidden="true">
      <rect v-for="(r, i) in shape.roomRects" :key="`room-${i}`" :x="r.x" :y="r.y" :width="r.width" :height="r.height" class="room-thumb__room" />
      <rect v-for="(r, i) in shape.wallRects" :key="`wall-${i}`" :x="r.x" :y="r.y" :width="r.width" :height="r.height" class="room-thumb__wall" />
      <rect v-for="(r, i) in shape.windowRects" :key="`window-${i}`" :x="r.x" :y="r.y" :width="r.width" :height="r.height" class="room-thumb__window" />
      <rect v-for="(r, i) in shape.doorRects" :key="`door-${i}`" :x="r.x" :y="r.y" :width="r.width" :height="r.height" class="room-thumb__door" />
    </svg>
    <UiIcon v-else name="room" :size="20" class="room-thumb__placeholder" />
  </div>
</template>

<style scoped>
.room-thumb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-subtle);
  border-radius: var(--radius-input);
  overflow: hidden;
}

.room-thumb__svg {
  width: 100%;
  height: 100%;
}

.room-thumb__room { fill: #F2EFE9; }
.room-thumb__wall { fill: var(--color-graphite); }
.room-thumb__door { fill: #EDE3D3; }
.room-thumb__window { fill: #E3EEF1; }

.room-thumb__placeholder {
  color: var(--color-text-muted);
}
</style>
