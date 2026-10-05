<script setup lang="ts">
// Единая line-icon система вместо стороннего пакета: маленький фиксированный
// набор путей, один stroke-стиль (2px, currentColor) везде. Если понадобится
// новая иконка — добавить один path сюда, а не подключать библиотеку.
type IconName =
  | 'select' | 'wall' | 'door' | 'window' | 'room' | 'dimension'
  | 'grid-2d' | 'cube-3d' | 'chevron-left' | 'close' | 'trash'
  | 'logout' | 'plus' | 'check' | 'alert' | 'more'
  | 'search' | 'edit' | 'user' | 'sort'
  | 'layers' | 'ceiling' | 'bolt' | 'faucet' | 'hammer' | 'roller' | 'grid' | 'refresh'
  | 'folder' | 'list' | 'fit' | 'store' | 'coins' | 'home' | 'star' | 'pin'
  | 'camera' | 'grip' | 'globe'

// filled — только для 'star' (рейтинг, см. RatingStars.vue): все остальные
// иконки в проекте всегда stroke-only (fill:none), это не меняется —
// filled лишь переопределяет fill для ОДНОГО конкретного экземпляра, не
// трогая остальные использования той же иконки (readonly/interactive
// звёзды в одном ряду одновременно показывают и filled, и не-filled).
const props = withDefaults(defineProps<{ name: IconName, size?: number, filled?: boolean }>(), {
  size: 18,
  filled: false,
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
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M21 21l-4.35-4.35',
  edit: 'M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L5 17v3z M13.5 6.5l4 4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20c0-4 3.5-6 8-6s8 2 8 6',
  sort: 'M4 6h16M7 12h10M10 18h4',
  layers: 'M12 3l9 5-9 5-9-5 9-5z M3 13l9 5 9-5',
  ceiling: 'M3 6h18 M7 6v4 M12 6v4 M17 6v4',
  bolt: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
  faucet: 'M12 3c4 4.5 7 8.2 7 11.5A7 7 0 1 1 5 14.5C5 11.2 8 7.5 12 3z',
  hammer: 'M17 3l4 4-3 3-4-4z M14.2 8.8L4 19l1 1 10.2-10.2',
  roller: 'M4 4h12v5H4z M13 6h3.5a1.5 1.5 0 0 1 1.5 1.5V9h-2 M9 9v5 M6 14h6v4H6z',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  refresh: 'M4 12a8 8 0 0 1 14-5.3L20 9 M20 12a8 8 0 0 1-14 5.3L4 15 M20 4v5h-5 M4 20v-5h5',
  folder: 'M4 6a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6z',
  list: 'M4 6h16 M4 12h16 M4 18h10',
  fit: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5',
  store: 'M4 10l1-5h14l1 5 M4 10a2 2 0 0 0 4 0 M8 10a2 2 0 0 0 4 0 M12 10a2 2 0 0 0 4 0 M16 10a2 2 0 0 0 4 0 M5 10v9h14v-9',
  coins: 'M9 8a5 3 0 1 0 0-.01 M4 8v4a5 3 0 0 0 10 0 M9 12v4a5 3 0 0 0 10 0v-4',
  home: 'M4 11l8-7 8 7 M6 9.5V20h12V9.5 M10 20v-6h4v6',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z',
  pin: 'M12 21s7-6.5 7-11.5A7 7 0 1 0 5 9.5C5 14.5 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  camera: 'M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.7 4 5.6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-5.6-4-9s1.5-6.3 4-9z',
}
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
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
