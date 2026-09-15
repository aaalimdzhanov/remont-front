// View-only состояние 2D-канваса: zoom/pan/видимость размеров/позиция курсора
// для status bar. НЕ Building JSON и не Geometry Engine — это чисто
// presentation state редактора (см. секцию 18 задания: "не хранить UI-only
// state внутри Building JSON, если это не требуется"). useState — тот же
// паттерн, что и в useBuilding/useProjectPersistence, никакого нового
// state-менеджера.
const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const ZOOM_STEP = 0.15

export function useEditorView() {
  const zoom = useState<number>('editor-view-zoom', () => 1)
  const panX = useState<number>('editor-view-pan-x', () => 0)
  const panY = useState<number>('editor-view-pan-y', () => 0)
  const showDimensions = useState<boolean>('editor-view-show-dimensions', () => true)
  // Инкрементируется по клику "Fit" — Plan2D наблюдает за токеном и пересчитывает
  // zoom/pan под фактические границы здания (см. секцию 19: "Fit должен
  // использовать реальные bounds, а не случайный viewport").
  const fitToken = useState<number>('editor-view-fit-token', () => 0)
  // Курсорная позиция в метрах Building-координат — для status bar (X/Y).
  const cursorPosition = useState<{ x: number, z: number } | null>('editor-view-cursor', () => null)

  // Режим "рисование помещения протяжкой" (инструмент "Помещение" вооружён,
  // ждём pointerdown на плане). Сам процесс протяжки (start/current точки,
  // preview) — локальное состояние Plan2D.vue, не отсюда: этот флаг только
  // включает/выключает режим, аналогично pendingOpeningType в useBuilding,
  // но это чисто UI-режим канваса, а не часть Building JSON.
  const roomDrawActive = useState<boolean>('editor-view-room-draw-active', () => false)

  function activateRoomDraw() {
    roomDrawActive.value = true
  }

  function deactivateRoomDraw() {
    roomDrawActive.value = false
  }

  function zoomIn() {
    zoom.value = Math.min(MAX_ZOOM, +(zoom.value + ZOOM_STEP).toFixed(2))
  }

  function zoomOut() {
    zoom.value = Math.max(MIN_ZOOM, +(zoom.value - ZOOM_STEP).toFixed(2))
  }

  function setZoom(value: number) {
    zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
  }

  function requestFit() {
    fitToken.value++
  }

  function toggleDimensions() {
    showDimensions.value = !showDimensions.value
  }

  return {
    zoom,
    panX,
    panY,
    showDimensions,
    fitToken,
    cursorPosition,
    roomDrawActive,
    activateRoomDraw,
    deactivateRoomDraw,
    zoomIn,
    zoomOut,
    setZoom,
    requestFit,
    toggleDimensions,
  }
}
