<script setup lang="ts">
// Preview плана на карточке проекта — реальный план из Building JSON
// (rooms/walls/openings уже посчитаны в useBuilding/Geometry Engine), НЕ
// фото-заглушка. buildBuildingPreview() — чистая функция, Vue computed сам
// кеширует результат (пересчёт только если меняется ссылка на building —
// а PropertiesPanel/этот компонент грузят building один раз при монтировании
// карточки, см. ProjectCard.vue), поэтому лишнего пересчёта нет.
import type { Building } from '~/types/building'
import { buildBuildingPreview } from '~/geometry/preview'

const props = defineProps<{ building: Building }>()

const preview = computed(() => buildBuildingPreview(props.building))

// Небольшой отступ от края viewBox, чтобы план не упирался прямо в границы
// карточки — то же самое, что MARGIN в Plan2D.vue, только в метрах, не в px
// (масштаб задаёт сам viewBox/preserveAspectRatio, а не PX_PER_METER).
const MARGIN = 0.4
const viewBox = computed(() => {
  const p = preview.value
  if (!p.hasContent) return '0 0 1 1'
  return `${-MARGIN} ${-MARGIN} ${p.viewBoxWidth + MARGIN * 2} ${p.viewBoxHeight + MARGIN * 2}`
})
</script>

<template>
  <div class="project-preview">
    <svg
      v-if="preview.hasContent"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      class="project-preview__svg"
      aria-hidden="true"
    >
      <rect
        v-for="(r, i) in preview.roomRects"
        :key="`room-${i}`"
        :x="r.x" :y="r.y" :width="r.width" :height="r.height"
        class="project-preview__room"
      />
      <rect
        v-for="(r, i) in preview.wallRects"
        :key="`wall-${i}`"
        :x="r.x" :y="r.y" :width="r.width" :height="r.height"
        class="project-preview__wall"
      />
      <rect
        v-for="(r, i) in preview.windowRects"
        :key="`window-${i}`"
        :x="r.x" :y="r.y" :width="r.width" :height="r.height"
        class="project-preview__window"
      />
      <rect
        v-for="(r, i) in preview.doorRects"
        :key="`door-${i}`"
        :x="r.x" :y="r.y" :width="r.width" :height="r.height"
        class="project-preview__door"
      />
    </svg>

    <!-- Проект ещё без плана (0 комнат/размеров) — тот же architectural
         empty-sketch, что и на пустом Dashboard, а не stock-фото. -->
    <svg v-else class="project-preview__empty-sketch" viewBox="0 0 120 90" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="112" height="82" rx="2" stroke="var(--color-border-strong)" stroke-width="1.5" />
      <path d="M4 34h112M46 34v52M4 60h42M78 4v82M78 22h38" stroke="var(--color-border-strong)" stroke-width="1.5" />
    </svg>
  </div>
</template>

<style scoped>
.project-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-subtle);
}

.project-preview__svg {
  width: 100%;
  height: 100%;
}

/* Те же цвета, что и настоящий 2D-план (Plan2D.vue) — карточка должна
   визуально обещать ровно то, что откроется в Builder, не какой-то другой
   стиль. */
.project-preview__room {
  fill: #F2EFE9;
}

.project-preview__wall {
  fill: var(--color-graphite);
}

.project-preview__door {
  fill: #EDE3D3;
}

.project-preview__window {
  fill: #E3EEF1;
}

.project-preview__empty-sketch {
  width: 44%;
  height: auto;
}
</style>
