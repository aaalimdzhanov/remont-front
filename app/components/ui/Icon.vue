<script setup lang="ts">
// Единая line-icon система вместо стороннего пакета: маленький фиксированный
// набор путей, один stroke-стиль (2px, currentColor) везде. Если понадобится
// новая иконка — добавить один path сюда, а не подключать библиотеку.
type IconName =
  | 'select' | 'wall' | 'door' | 'window' | 'room' | 'dimension'
  | 'grid-2d' | 'cube-3d' | 'chevron-left' | 'close' | 'trash'
  | 'logout' | 'plus' | 'check' | 'alert' | 'more'

const props = withDefaults(defineProps<{ name: IconName, size?: number }>(), {
  size: 18,
})

const paths: Record<IconName, string> = {
  select: 'M4 3l6 15 2-6 6-2-14-7z',
  wall: 'M3 6h18M3 12h18M3 18h18',
  door: 'M5 3v18M5 3h9a5 5 0 0 1 5 5v10M13 12h.01',
  window: 'M4 4h16v16H4z M12 4v16 M4 12h16',
  room: 'M4 4h16v16H4z',
  dimension: 'M4 18l4-4M4 18h5M4 18v-5 M20 6l-4 4M20 6h-5M20 6v5 M9 15l6-6',
  'grid-2d': 'M4 4h16v16H4z M4 10h16 M4 16h16 M10 4v16 M16 4v16',
  'cube-3d': 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z M12 3v9 M12 12l8-4.5 M12 12l-8-4.5',
  'chevron-left': 'M14 5l-7 7 7 7',
  close: 'M5 5l14 14M19 5L5 19',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7',
  logout: 'M9 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h4M15 16l4-4-4-4M19 12H8',
  plus: 'M12 4v16M4 12h16',
  check: 'M4 12l5 5L20 6',
  alert: 'M12 3l9 16H3l9-16z M12 10v4 M12 17h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="icon"
  >
    <path :d="paths[props.name]" />
  </svg>
</template>

<style scoped>
.icon {
  flex-shrink: 0;
  display: block;
}
</style>
