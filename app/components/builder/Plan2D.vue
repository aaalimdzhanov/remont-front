<script setup lang="ts">
import type { Opening, Point2D, Room, Wall } from '~/types/building'
import { clamp, MIN_ROOM_SIZE, snapToGrid } from '~/geometry/snapping'
import { pointAlongWall, projectPointOntoWall, wallLength } from '~/geometry/walls'
import { splitWallByOpenings } from '~/geometry/openings'

const {
  document: buildingDocument,
  selectedRoomId,
  selectedWallId,
  selectedOpeningId,
  selectedRoom,
  selectedWall,
  selectedOpening,
  pendingOpeningType,
  addRoom,
  moveRoom,
  selectRoom,
  selectWall,
  selectOpening,
  clearSelection,
  cancelPlacingOpening,
  addOpening,
  moveOpening,
  isRoomIntersecting,
  isOpeningIntersecting,
  wouldRectIntersectRooms,
} = useBuilding()
const { zoom, panX, panY, showDimensions, fitToken, cursorPosition, roomDrawActive, deactivateRoomDraw } = useEditorView()

const PX_PER_METER = 60
const MARGIN = 40

const building = computed(() => buildingDocument.value.building)

const svgWidth = computed(() => building.value.dimensions.width * PX_PER_METER + MARGIN * 2)
const svgHeight = computed(() => building.value.dimensions.length * PX_PER_METER + MARGIN * 2)

// Zoom/pan через сам viewBox, а не через <g transform> — getScreenCTM()
// (screenToMeters ниже) уже учитывает текущий viewBox сам, поэтому вся
// геометрия/drag-математика ниже не меняется ни на строчку от того, что
// вьюпорт теперь может быть увеличен или сдвинут.
const viewBoxWidth = computed(() => svgWidth.value / zoom.value)
const viewBoxHeight = computed(() => svgHeight.value / zoom.value)
const viewBox = computed(() => `${panX.value} ${panY.value} ${viewBoxWidth.value} ${viewBoxHeight.value}`)

// Fit должен показывать РЕАЛЬНЫЕ границы здания, а не произвольный дефолт:
// (0,0,svgWidth,svgHeight) и есть эти границы (building rect всегда занимает
// ровно [MARGIN, MARGIN+ширина/длина в px] независимо от текущего размера
// здания), поэтому Fit — это просто сброс zoom/pan к начальным значениям.
watch(fitToken, () => {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
})

function toPx(meters: number) {
  return meters * PX_PER_METER
}

const gridLinesX = computed(() => {
  const lines: number[] = []
  for (let x = 0; x <= building.value.dimensions.width + 1e-6; x += 0.5) lines.push(x)
  return lines
})

const gridLinesZ = computed(() => {
  const lines: number[] = []
  for (let z = 0; z <= building.value.dimensions.length + 1e-6; z += 0.5) lines.push(z)
  return lines
})

const svgEl = ref<SVGSVGElement | null>(null)

interface DragState {
  roomId: string
  pointerId: number
  offsetX: number
  offsetZ: number
}

const drag = ref<DragState | null>(null)

// Hover — чисто визуальная подсветка, отдельная от selected (см. секцию 6-7
// задания): наводка не меняет выделение и не трогает Building JSON.
const hoveredRoomId = ref<string | null>(null)
const hoveredWallId = ref<string | null>(null)
const hoveredOpeningId = ref<string | null>(null)

function screenToMeters(clientX: number, clientY: number) {
  const svg = svgEl.value
  if (!svg) return { x: 0, z: 0 }
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, z: 0 }
  const local = point.matrixTransform(ctm.inverse())
  return {
    x: (local.x - MARGIN) / PX_PER_METER,
    z: (local.y - MARGIN) / PX_PER_METER,
  }
}

function onRoomPointerDown(event: PointerEvent, room: Room) {
  if (room.geometry.type !== 'rectangle') return
  selectRoom(room.id)
  const pos = screenToMeters(event.clientX, event.clientY)
  drag.value = {
    roomId: room.id,
    pointerId: event.pointerId,
    offsetX: pos.x - room.geometry.position.x,
    offsetZ: pos.z - room.geometry.position.z,
  }
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
}

// Во время перетаскивания комната двигается плавно (без привязки к сетке),
// привязка к шагу 0.1 м применяется только при отпускании кнопки мыши.
function onRoomPointerMove(event: PointerEvent) {
  if (!drag.value || drag.value.pointerId !== event.pointerId) return
  const room = building.value.rooms.find(r => r.id === drag.value?.roomId)
  if (!room || room.geometry.type !== 'rectangle') return

  const pos = screenToMeters(event.clientX, event.clientY)
  cursorPosition.value = pos
  const rawX = pos.x - drag.value.offsetX
  const rawZ = pos.z - drag.value.offsetZ

  const maxX = Math.max(0, building.value.dimensions.width - room.geometry.width)
  const maxZ = Math.max(0, building.value.dimensions.length - room.geometry.length)

  const nextX = clamp(rawX, 0, maxX)
  const nextZ = clamp(rawZ, 0, maxZ)

  moveRoom(room.id, nextX, nextZ)
}

function onRoomPointerUp(event: PointerEvent) {
  if (!drag.value || drag.value.pointerId !== event.pointerId) return
  const room = building.value.rooms.find(r => r.id === drag.value?.roomId)
  if (room && room.geometry.type === 'rectangle') {
    const maxX = Math.max(0, building.value.dimensions.width - room.geometry.width)
    const maxZ = Math.max(0, building.value.dimensions.length - room.geometry.length)
    const snappedX = clamp(snapToGrid(room.geometry.position.x), 0, maxX)
    const snappedZ = clamp(snapToGrid(room.geometry.position.z), 0, maxZ)
    moveRoom(room.id, snappedX, snappedZ)
  }
  drag.value = null
}

function onBackgroundClick() {
  clearSelection()
  cancelPlacingOpening()
}

// ---- Room Creation UX: рисование помещения протяжкой ----
// Временное UI-состояние (не Building JSON, не Geometry Engine): только
// стартовая и текущая точка драга в метрах. Preview/размеры/valid-проверка —
// чистые производные от них ниже. Само создание идёт через существующий
// addRoom() с позицией (см. useBuilding) — переиспользует snap/clamp/
// syncWalls/touch, здесь не дублируется ничего из этого.
interface RoomDrawState {
  pointerId: number
  start: Point2D
  current: Point2D
}

const roomDraw = ref<RoomDrawState | null>(null)

// Если режим рисования выключили извне (Escape, кнопка "Отмена", клик по
// "Выделить", успешное создание) — сбрасываем незавершённую протяжку тут же,
// preview исчезает независимо от того, что именно вызвало выключение.
watch(roomDrawActive, (active) => {
  if (!active) roomDraw.value = null
})

function clampToBuilding(point: { x: number, z: number }): Point2D {
  return {
    x: clamp(point.x, 0, building.value.dimensions.width),
    z: clamp(point.z, 0, building.value.dimensions.length),
  }
}

// Прямоугольник из двух произвольных углов (протяжка в любом из 4 направлений
// — вправо/вниз, влево/вверх и т.д.) — min/abs делают направление неважным.
function rawDrawRect(start: Point2D, current: Point2D) {
  return {
    x: Math.min(start.x, current.x),
    z: Math.min(start.z, current.z),
    width: Math.abs(current.x - start.x),
    length: Math.abs(current.z - start.z),
  }
}

interface RoomDrawPreview {
  x: number
  z: number
  width: number
  length: number
  snappedWidth: number
  snappedLength: number
  invalid: boolean
}

// Сам прямоугольник рисуется по сырым (неснэпнутым) координатам — так же,
// как обычное перетаскивание комнаты (onRoomPointerMove) двигается плавно, а
// привязка к сетке применяется только к итоговым числам/при создании. Метки
// размеров при этом уже показывают snap-значение, чтобы пользователь видел,
// что именно будет создано.
const roomDrawPreview = computed<RoomDrawPreview | null>(() => {
  if (!roomDraw.value) return null
  const raw = rawDrawRect(roomDraw.value.start, roomDraw.value.current)
  const snappedWidth = snapToGrid(raw.width)
  const snappedLength = snapToGrid(raw.length)
  const tooSmall = snappedWidth < MIN_ROOM_SIZE || snappedLength < MIN_ROOM_SIZE
  const intersects = !tooSmall && wouldRectIntersectRooms({
    x: snapToGrid(raw.x),
    z: snapToGrid(raw.z),
    width: snappedWidth,
    length: snappedLength,
  })
  return {
    x: raw.x,
    z: raw.z,
    width: raw.width,
    length: raw.length,
    snappedWidth,
    snappedLength,
    invalid: tooSmall || intersects,
  }
})

function onBackgroundDrawStart(event: PointerEvent) {
  const point = clampToBuilding(screenToMeters(event.clientX, event.clientY))
  roomDraw.value = { pointerId: event.pointerId, start: point, current: point }
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
}

function onBackgroundDrawMove(event: PointerEvent) {
  if (!roomDraw.value || roomDraw.value.pointerId !== event.pointerId) return
  roomDraw.value.current = clampToBuilding(screenToMeters(event.clientX, event.clientY))
}

// Отпускание мыши: если размер ниже минимума ИЛИ пересекает существующую
// комнату — ничего не создаём (тихо, без alert), preview просто исчезает.
// Иначе создаём через addRoom (снова снэпаем — на случай, если preview успел
// показать сырые числа) и автоматически выбираем + возвращаемся в Select,
// чтобы сразу можно было двигать/менять свойства (см. секцию 10 задания).
function onBackgroundDrawEnd(event: PointerEvent) {
  if (!roomDraw.value || roomDraw.value.pointerId !== event.pointerId) return
  const preview = roomDrawPreview.value
  roomDraw.value = null
  if (!preview || preview.invalid) return

  addRoom({
    name: 'Комната',
    type: 'other',
    width: preview.snappedWidth,
    length: preview.snappedLength,
    position: { x: snapToGrid(preview.x), z: snapToGrid(preview.z) },
  })
  deactivateRoomDraw()
}

interface PanState {
  pointerId: number
  startClientX: number
  startClientY: number
  startPanX: number
  startPanY: number
  moved: boolean
}

const pan = ref<PanState | null>(null)

// Пустой фон канваса одновременно и панится (drag), и кликается (снять
// выделение) — различаем по фактическому смещению курсора между down/up,
// а не по отдельному режиму/модификатору клавиши.
function onBackgroundPointerDown(event: PointerEvent) {
  // В режиме "Помещение" фон не панится, а рисует — pan и рисование
  // взаимоисключающие, поэтому здесь простое ветвление, а не два независимых
  // pointer-capture (см. секцию 12 задания: не повторить прошлый баг с
  // setPointerCapture, перехватывающим клики других элементов, — тут это не
  // грозит, т.к. это тот же самый background-обработчик, что и раньше).
  if (roomDrawActive.value) {
    onBackgroundDrawStart(event)
    return
  }
  pan.value = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPanX: panX.value,
    startPanY: panY.value,
    moved: false,
  }
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
}

function onBackgroundPointerMove(event: PointerEvent) {
  cursorPosition.value = screenToMeters(event.clientX, event.clientY)
  if (roomDraw.value && roomDraw.value.pointerId === event.pointerId) {
    onBackgroundDrawMove(event)
    return
  }
  if (!pan.value || pan.value.pointerId !== event.pointerId) return
  const svg = svgEl.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const dxClient = event.clientX - pan.value.startClientX
  const dyClient = event.clientY - pan.value.startClientY
  if (Math.abs(dxClient) > 3 || Math.abs(dyClient) > 3) pan.value.moved = true

  panX.value = pan.value.startPanX - dxClient * (viewBoxWidth.value / rect.width)
  panY.value = pan.value.startPanY - dyClient * (viewBoxHeight.value / rect.height)
}

function onBackgroundPointerUp(event: PointerEvent) {
  if (roomDraw.value && roomDraw.value.pointerId === event.pointerId) {
    onBackgroundDrawEnd(event)
    return
  }
  if (!pan.value || pan.value.pointerId !== event.pointerId) return
  if (!pan.value.moved) onBackgroundClick()
  pan.value = null
}

// Зум колесом мыши, с точкой под курсором неподвижной (стандартное поведение
// графических редакторов) — без этого зум "прыгает" к центру канваса.
function onWheel(event: WheelEvent) {
  const svg = svgEl.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const fracX = (event.clientX - rect.left) / rect.width
  const fracY = (event.clientY - rect.top) / rect.height
  const anchorX = panX.value + fracX * viewBoxWidth.value
  const anchorY = panY.value + fracY * viewBoxHeight.value

  const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15
  zoom.value = Math.min(4, Math.max(0.25, zoom.value * factor))

  const newVw = svgWidth.value / zoom.value
  const newVh = svgHeight.value / zoom.value
  panX.value = anchorX - fracX * newVw
  panY.value = anchorY - fracY * newVh
}

// Клик по стене: в режиме «+ Дверь»/«+ Окно» создаёт проём прямо на ней,
// иначе — обычное выделение стены.
function onWallClick(wall: Wall) {
  if (pendingOpeningType.value) {
    addOpening(pendingOpeningType.value, wall.id)
    cancelPlacingOpening()
  } else {
    selectWall(wall.id)
  }
}

// Стены всегда осепараллельны (горизонтальны или вертикальны), т.к. строятся
// по границам прямоугольных комнат — рисуем их как SVG-прямоугольники нужной
// толщины, отцентрированные на геометрической линии стены.
function isVerticalWall(wall: Wall) {
  return Math.abs(wall.start.x - wall.end.x) < 1e-6
}

function svgX(x: number) {
  return MARGIN + toPx(x)
}

function svgZ(z: number) {
  return MARGIN + toPx(z)
}

// Обобщённая версия отрисовки прямоугольной «полосы» произвольного участка
// осепараллельной линии — используется и для сплошных участков стены, и для
// проёмов (у них те же start/end/thickness, просто другой диапазон).
function segmentRect(start: Point2D, end: Point2D, thickness: number) {
  const halfThickness = thickness / 2
  const isVertical = Math.abs(start.x - end.x) < 1e-6
  if (isVertical) {
    const zFrom = Math.min(start.z, end.z)
    const zTo = Math.max(start.z, end.z)
    return {
      x: svgX(start.x - halfThickness),
      y: svgZ(zFrom),
      width: toPx(thickness),
      height: toPx(zTo - zFrom),
    }
  }

  const xFrom = Math.min(start.x, end.x)
  const xTo = Math.max(start.x, end.x)
  return {
    x: svgX(xFrom),
    y: svgZ(start.z - halfThickness),
    width: toPx(xTo - xFrom),
    height: toPx(thickness),
  }
}

function openingsOnWall(wallId: string): Opening[] {
  return building.value.openings.filter(opening => opening.wall_id === wallId)
}

// Стена не должна визуально продолжаться через дверь/окно: делим её на
// сплошные участки вокруг проёмов и рисуем каждый отдельным прямоугольником.
function wallSolidSegments(wall: Wall) {
  const spans = splitWallByOpenings(wallLength(wall), openingsOnWall(wall.id))
  return spans.map(span => segmentRect(pointAlongWall(wall, span.from), pointAlongWall(wall, span.to), wall.thickness))
}

function openingRect(wall: Wall, opening: Opening) {
  const from = pointAlongWall(wall, opening.position.offset)
  const to = pointAlongWall(wall, opening.position.offset + opening.dimensions.width)
  return segmentRect(from, to, wall.thickness)
}

// Простой символ открывания двери: полотно (линия от петли) + четверть
// окружности до противоположного косяка. Сторона раскрытия фиксирована
// (не зависит от того, где комната) — так проще и этого достаточно.
function doorSwingGeometry(wall: Wall, opening: Opening) {
  const isVertical = isVerticalWall(wall)
  const hinge = pointAlongWall(wall, opening.position.offset)
  const farJamb = pointAlongWall(wall, opening.position.offset + opening.dimensions.width)
  const dirX = isVertical ? 0 : 1
  const dirZ = isVertical ? 1 : 0
  const perpX = -dirZ
  const perpZ = dirX
  const leafEnd: Point2D = {
    x: hinge.x + perpX * opening.dimensions.width,
    z: hinge.z + perpZ * opening.dimensions.width,
  }
  return { hinge, farJamb, leafEnd }
}

function doorLeafLine(wall: Wall, opening: Opening) {
  const { hinge, leafEnd } = doorSwingGeometry(wall, opening)
  return { x1: svgX(hinge.x), y1: svgZ(hinge.z), x2: svgX(leafEnd.x), y2: svgZ(leafEnd.z) }
}

function doorArcPath(wall: Wall, opening: Opening) {
  const { leafEnd, farJamb } = doorSwingGeometry(wall, opening)
  const radius = toPx(opening.dimensions.width)
  const start = `${svgX(leafEnd.x)},${svgZ(leafEnd.z)}`
  const end = `${svgX(farJamb.x)},${svgZ(farJamb.z)}`
  return `M ${start} A ${radius},${radius} 0 0 1 ${end}`
}

interface OpeningDragState {
  openingId: string
  wallId: string
  pointerId: number
  grabOffset: number
}

const openingDrag = ref<OpeningDragState | null>(null)

function onOpeningPointerDown(event: PointerEvent, wall: Wall, opening: Opening) {
  selectOpening(opening.id)
  const pos = screenToMeters(event.clientX, event.clientY)
  const projection = projectPointOntoWall(wall, pos)
  openingDrag.value = {
    openingId: opening.id,
    wallId: wall.id,
    pointerId: event.pointerId,
    grabOffset: projection - opening.position.offset,
  }
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
}

// Проём двигается только вдоль своей стены: пиксель мыши проецируется на
// линию стены, а не берётся как свободные x/z (в отличие от перетаскивания
// комнаты). Плавно во время перетаскивания, snap — при отпускании.
function onOpeningPointerMove(event: PointerEvent) {
  if (!openingDrag.value || openingDrag.value.pointerId !== event.pointerId) return
  const wall = building.value.walls.find(w => w.id === openingDrag.value?.wallId)
  if (!wall) return
  const pos = screenToMeters(event.clientX, event.clientY)
  cursorPosition.value = pos
  const projection = projectPointOntoWall(wall, pos)
  moveOpening(openingDrag.value.openingId, projection - openingDrag.value.grabOffset)
}

function onOpeningPointerUp(event: PointerEvent) {
  if (!openingDrag.value || openingDrag.value.pointerId !== event.pointerId) return
  const opening = building.value.openings.find(o => o.id === openingDrag.value?.openingId)
  if (opening) {
    moveOpening(opening.id, snapToGrid(opening.position.offset))
  }
  openingDrag.value = null
}

// ---- Размерные линии (dimension annotations) ----
// Переиспользуют те же geometry-хелперы (pointAlongWall/wallLength), что и
// остальной план — отдельного "geometry-движка для UI" здесь нет, только
// отрисовка уже посчитанных Geometry Engine величин.
interface DimensionSpec {
  x1: number
  y1: number
  x2: number
  y2: number
  tick1: { x1: number, y1: number, x2: number, y2: number }
  tick2: { x1: number, y1: number, x2: number, y2: number }
  labelX: number
  labelY: number
  text: string
}

// offsetPx смещает размерную линию перпендикулярно отрезку p1→p2 — годится
// только для осепараллельных отрезков, но здесь других и не бывает (все
// комнаты/стены прямоугольные).
function buildDimension(p1: Point2D, p2: Point2D, offsetPx: number, text: string): DimensionSpec {
  const isVertical = Math.abs(p1.x - p2.x) < 1e-6
  const x1 = svgX(p1.x) + (isVertical ? offsetPx : 0)
  const y1 = svgZ(p1.z) + (isVertical ? 0 : offsetPx)
  const x2 = svgX(p2.x) + (isVertical ? offsetPx : 0)
  const y2 = svgZ(p2.z) + (isVertical ? 0 : offsetPx)
  const tick = 5
  return {
    x1,
    y1,
    x2,
    y2,
    tick1: isVertical ? { x1: x1 - tick, y1, x2: x1 + tick, y2: y1 } : { x1, y1: y1 - tick, x2: x1, y2: y1 + tick },
    tick2: isVertical ? { x1: x2 - tick, y1: y2, x2: x2 + tick, y2 } : { x1: x2, y1: y2 - tick, x2, y2: y2 + tick },
    labelX: (x1 + x2) / 2,
    labelY: (y1 + y2) / 2,
    text,
  }
}

const buildingDimensionSpecs = computed<DimensionSpec[]>(() => {
  const w = building.value.dimensions.width
  const l = building.value.dimensions.length
  return [
    buildDimension({ x: 0, z: l }, { x: w, z: l }, 22, `${w.toFixed(2)} м`),
    buildDimension({ x: w, z: 0 }, { x: w, z: l }, 22, `${l.toFixed(2)} м`),
  ]
})

const roomDimensionSpecs = computed<DimensionSpec[]>(() => {
  const room = selectedRoom.value
  if (!room || room.geometry.type !== 'rectangle') return []
  const { position, width: w, length: l } = room.geometry
  return [
    buildDimension({ x: position.x, z: position.z }, { x: position.x + w, z: position.z }, -14, `${w.toFixed(2)} м`),
    buildDimension({ x: position.x, z: position.z }, { x: position.x, z: position.z + l }, -14, `${l.toFixed(2)} м`),
  ]
})

const wallDimensionSpec = computed<DimensionSpec | null>(() => {
  const wall = selectedWall.value
  if (!wall) return null
  return buildDimension(wall.start, wall.end, 16, `${wallLength(wall).toFixed(2)} м`)
})

const openingDimensionSpec = computed<DimensionSpec | null>(() => {
  const opening = selectedOpening.value
  if (!opening) return null
  const wall = building.value.walls.find(w => w.id === opening.wall_id)
  if (!wall) return null
  const from = pointAlongWall(wall, opening.position.offset)
  const to = pointAlongWall(wall, opening.position.offset + opening.dimensions.width)
  const widthMm = Math.round(opening.dimensions.width * 1000)
  const offsetMm = Math.round(opening.position.offset * 1000)
  return buildDimension(from, to, 16, `${widthMm} мм (отступ ${offsetMm} мм)`)
})

// Размеры во время рисования помещения — тот же buildDimension()/offset -14,
// что и у уже выделенной комнаты (roomDimensionSpecs) выше, просто источник
// геометрии другой (сырой preview-прямоугольник, а не Building JSON). Никакой
// отдельной системы расчёта размеров не заводится (см. секцию 4 задания).
const roomDrawDimensionSpecs = computed<DimensionSpec[]>(() => {
  const preview = roomDrawPreview.value
  if (!preview) return []
  const { x, z, width: w, length: l, snappedWidth, snappedLength } = preview
  return [
    buildDimension({ x, z }, { x: x + w, z }, -14, `${snappedWidth.toFixed(2)} м`),
    buildDimension({ x, z }, { x, z: z + l }, -14, `${snappedLength.toFixed(2)} м`),
  ]
})
</script>

<template>
  <div class="plan2d">
    <svg
      v-if="svgWidth > 0 && svgHeight > 0"
      ref="svgEl"
      :viewBox="viewBox"
      class="plan2d__svg"
      :class="{ 'plan2d__svg--drawing': roomDrawActive }"
      @pointerdown="onBackgroundPointerDown"
      @pointermove="onBackgroundPointerMove"
      @pointerup="onBackgroundPointerUp"
      @wheel.prevent="onWheel"
    >
      <rect
        :x="MARGIN"
        :y="MARGIN"
        :width="toPx(building.dimensions.width)"
        :height="toPx(building.dimensions.length)"
        class="plan2d__building"
      />

      <g class="plan2d__grid">
        <line
          v-for="x in gridLinesX"
          :key="`gx-${x}`"
          :x1="MARGIN + toPx(x)"
          :y1="MARGIN"
          :x2="MARGIN + toPx(x)"
          :y2="MARGIN + toPx(building.dimensions.length)"
        />
        <line
          v-for="z in gridLinesZ"
          :key="`gz-${z}`"
          :x1="MARGIN"
          :y1="MARGIN + toPx(z)"
          :x2="MARGIN + toPx(building.dimensions.width)"
          :y2="MARGIN + toPx(z)"
        />
      </g>

      <g
        v-for="room in building.rooms"
        :key="room.id"
        class="plan2d__room"
      >
        <template v-if="room.geometry.type === 'rectangle'">
          <rect
            :x="MARGIN + toPx(room.geometry.position.x)"
            :y="MARGIN + toPx(room.geometry.position.z)"
            :width="toPx(room.geometry.width)"
            :height="toPx(room.geometry.length)"
            class="plan2d__room-rect"
            :class="{
              'plan2d__room-rect--selected': room.id === selectedRoomId,
              'plan2d__room-rect--hover': room.id === hoveredRoomId && room.id !== selectedRoomId,
              'plan2d__room-rect--conflict': isRoomIntersecting(room.id),
            }"
            @pointerdown.stop="onRoomPointerDown($event, room)"
            @pointermove.stop="onRoomPointerMove"
            @pointerup.stop="onRoomPointerUp"
            @pointerenter="hoveredRoomId = room.id"
            @pointerleave="hoveredRoomId = null"
            @click.stop="selectRoom(room.id)"
          />
          <text
            :x="MARGIN + toPx(room.geometry.position.x) + toPx(room.geometry.width) / 2"
            :y="MARGIN + toPx(room.geometry.position.z) + toPx(room.geometry.length) / 2"
            class="plan2d__room-label"
          >
            {{ room.name }}
          </text>
        </template>
      </g>

      <g class="plan2d__walls">
        <template v-for="wall in building.walls" :key="wall.id">
          <rect
            v-for="(segment, index) in wallSolidSegments(wall)"
            :key="`${wall.id}-${index}`"
            :data-wall-id="wall.id"
            :x="segment.x"
            :y="segment.y"
            :width="segment.width"
            :height="segment.height"
            class="plan2d__wall"
            :class="{
              'plan2d__wall--interior': wall.type === 'interior',
              'plan2d__wall--selected': wall.id === selectedWallId,
              'plan2d__wall--hover': wall.id === hoveredWallId && wall.id !== selectedWallId,
              'plan2d__wall--pickable': pendingOpeningType,
            }"
            @pointerenter="hoveredWallId = wall.id"
            @pointerleave="hoveredWallId = null"
            @pointerdown.stop
            @pointerup.stop
            @click.stop="onWallClick(wall)"
          />
        </template>
      </g>

      <g class="plan2d__openings">
        <template v-for="wall in building.walls" :key="`openings-of-${wall.id}`">
          <g
            v-for="opening in openingsOnWall(wall.id)"
            :key="opening.id"
            class="plan2d__opening-group"
          >
            <rect
              :data-opening-id="opening.id"
              :x="openingRect(wall, opening).x"
              :y="openingRect(wall, opening).y"
              :width="openingRect(wall, opening).width"
              :height="openingRect(wall, opening).height"
              class="plan2d__opening"
              :class="[
                opening.type === 'door' ? 'plan2d__opening--door' : 'plan2d__opening--window',
                {
                  'plan2d__opening--selected': opening.id === selectedOpeningId,
                  'plan2d__opening--hover': opening.id === hoveredOpeningId && opening.id !== selectedOpeningId,
                  'plan2d__opening--conflict': isOpeningIntersecting(opening.id),
                },
              ]"
              @pointerdown.stop="onOpeningPointerDown($event, wall, opening)"
              @pointermove.stop="onOpeningPointerMove"
              @pointerup.stop="onOpeningPointerUp"
              @pointerenter="hoveredOpeningId = opening.id"
              @pointerleave="hoveredOpeningId = null"
              @click.stop="selectOpening(opening.id)"
            />
            <template v-if="opening.type === 'door'">
              <line
                :x1="doorLeafLine(wall, opening).x1"
                :y1="doorLeafLine(wall, opening).y1"
                :x2="doorLeafLine(wall, opening).x2"
                :y2="doorLeafLine(wall, opening).y2"
                class="plan2d__door-leaf"
              />
              <path :d="doorArcPath(wall, opening)" class="plan2d__door-arc" />
            </template>
          </g>
        </template>
      </g>

      <!-- Preview рисуемого помещения — временное UI-состояние, в Building
           JSON никогда не попадает (см. секцию 3/17 задания). Размеры под
           курсором показываются всегда, вне зависимости от переключателя
           "Размеры" (showDimensions) — это активная обратная связь во время
           рисования, а не опциональная аннотация плана. -->
      <g v-if="roomDrawPreview" class="plan2d__room-draw">
        <rect
          :x="svgX(roomDrawPreview.x)"
          :y="svgZ(roomDrawPreview.z)"
          :width="toPx(roomDrawPreview.width)"
          :height="toPx(roomDrawPreview.length)"
          class="plan2d__room-draw-rect"
          :class="{ 'plan2d__room-draw-rect--invalid': roomDrawPreview.invalid }"
        />
        <text
          :x="svgX(roomDrawPreview.x) + toPx(roomDrawPreview.width) / 2"
          :y="svgZ(roomDrawPreview.z) + toPx(roomDrawPreview.length) / 2"
          class="plan2d__room-draw-label"
          :class="{ 'plan2d__room-draw-label--invalid': roomDrawPreview.invalid }"
        >
          {{ roomDrawPreview.snappedWidth.toFixed(2) }} × {{ roomDrawPreview.snappedLength.toFixed(2) }} м
        </text>

        <g v-for="(d, i) in roomDrawDimensionSpecs" :key="`rdd-${i}`" class="plan2d__dimension plan2d__dimension--accent" :class="{ 'plan2d__dimension--invalid': roomDrawPreview.invalid }">
          <line :x1="d.x1" :y1="d.y1" :x2="d.x2" :y2="d.y2" />
          <line :x1="d.tick1.x1" :y1="d.tick1.y1" :x2="d.tick1.x2" :y2="d.tick1.y2" />
          <line :x1="d.tick2.x1" :y1="d.tick2.y1" :x2="d.tick2.x2" :y2="d.tick2.y2" />
          <text :x="d.labelX" :y="d.labelY - 4">{{ d.text }}</text>
        </g>
      </g>

      <g v-if="showDimensions" class="plan2d__dimensions">
        <g v-for="(d, i) in buildingDimensionSpecs" :key="`bd-${i}`" class="plan2d__dimension">
          <line :x1="d.x1" :y1="d.y1" :x2="d.x2" :y2="d.y2" />
          <line :x1="d.tick1.x1" :y1="d.tick1.y1" :x2="d.tick1.x2" :y2="d.tick1.y2" />
          <line :x1="d.tick2.x1" :y1="d.tick2.y1" :x2="d.tick2.x2" :y2="d.tick2.y2" />
          <text :x="d.labelX" :y="d.labelY - 4">{{ d.text }}</text>
        </g>

        <g v-for="(d, i) in roomDimensionSpecs" :key="`rd-${i}`" class="plan2d__dimension plan2d__dimension--accent">
          <line :x1="d.x1" :y1="d.y1" :x2="d.x2" :y2="d.y2" />
          <line :x1="d.tick1.x1" :y1="d.tick1.y1" :x2="d.tick1.x2" :y2="d.tick1.y2" />
          <line :x1="d.tick2.x1" :y1="d.tick2.y1" :x2="d.tick2.x2" :y2="d.tick2.y2" />
          <text :x="d.labelX" :y="d.labelY - 4">{{ d.text }}</text>
        </g>

        <g v-if="wallDimensionSpec" class="plan2d__dimension plan2d__dimension--accent">
          <line :x1="wallDimensionSpec.x1" :y1="wallDimensionSpec.y1" :x2="wallDimensionSpec.x2" :y2="wallDimensionSpec.y2" />
          <line :x1="wallDimensionSpec.tick1.x1" :y1="wallDimensionSpec.tick1.y1" :x2="wallDimensionSpec.tick1.x2" :y2="wallDimensionSpec.tick1.y2" />
          <line :x1="wallDimensionSpec.tick2.x1" :y1="wallDimensionSpec.tick2.y1" :x2="wallDimensionSpec.tick2.x2" :y2="wallDimensionSpec.tick2.y2" />
          <text :x="wallDimensionSpec.labelX" :y="wallDimensionSpec.labelY - 4">{{ wallDimensionSpec.text }}</text>
        </g>

        <g v-if="openingDimensionSpec" class="plan2d__dimension plan2d__dimension--accent">
          <line :x1="openingDimensionSpec.x1" :y1="openingDimensionSpec.y1" :x2="openingDimensionSpec.x2" :y2="openingDimensionSpec.y2" />
          <line :x1="openingDimensionSpec.tick1.x1" :y1="openingDimensionSpec.tick1.y1" :x2="openingDimensionSpec.tick1.x2" :y2="openingDimensionSpec.tick1.y2" />
          <line :x1="openingDimensionSpec.tick2.x1" :y1="openingDimensionSpec.tick2.y1" :x2="openingDimensionSpec.tick2.x2" :y2="openingDimensionSpec.tick2.y2" />
          <text :x="openingDimensionSpec.labelX" :y="openingDimensionSpec.labelY - 4">{{ openingDimensionSpec.text }}</text>
        </g>
      </g>
    </svg>

    <p v-else class="plan2d__empty">
      Здание ещё не создано
    </p>
  </div>
</template>

<style scoped>
.plan2d {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  padding: var(--space-4);
  min-height: 320px;
}

.plan2d__svg {
  width: 100%;
  max-width: 720px;
  height: auto;
  touch-action: none;
}

.plan2d__building {
  fill: #FAFAF8;
  stroke: #343434;
  stroke-width: 2;
}

.plan2d__grid line {
  /* Сетка не должна конкурировать со стенами — максимально тихая. */
  stroke: #ECE9E3;
  stroke-width: 1;
}

.plan2d__room-rect {
  fill: #F2EFE9;
  stroke: var(--color-border-strong);
  stroke-width: 1.5;
  cursor: grab;
}

.plan2d__room-rect:active {
  cursor: grabbing;
}

.plan2d__room-rect--hover {
  stroke: var(--color-border-strong);
  stroke-width: 2;
}

.plan2d__room-rect--selected {
  fill: var(--color-primary-subtle);
  stroke: var(--color-primary);
  stroke-width: 2.5;
}

.plan2d__room-rect--conflict {
  fill: var(--color-error-subtle);
  stroke: var(--color-error);
  stroke-width: 2;
  stroke-dasharray: 4 3;
}

.plan2d__room-rect--conflict.plan2d__room-rect--selected {
  fill: var(--color-error-subtle);
  stroke: var(--color-error);
  stroke-width: 2.5;
}

.plan2d__svg--drawing {
  cursor: crosshair;
}

.plan2d__room-draw-rect {
  /* Preview рисуемого помещения: очень светлая заливка + тонкая пунктирная
     accent-граница — визуально легче обычной стены/выделенной комнаты,
     чтобы не выглядеть как уже существующий объект (см. секцию 3 задания). */
  fill: var(--color-primary-subtle);
  fill-opacity: 0.5;
  stroke: var(--color-primary);
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
  pointer-events: none;
}

.plan2d__room-draw-rect--invalid {
  fill: var(--color-error-subtle);
  fill-opacity: 0.5;
  stroke: var(--color-error);
}

.plan2d__room-draw-label {
  font-size: 12px;
  font-weight: 500;
  fill: var(--color-primary-hover);
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  user-select: none;
}

.plan2d__room-draw-label--invalid {
  fill: var(--color-error);
}

.plan2d__dimension--invalid line {
  stroke: var(--color-error);
}

.plan2d__dimension--invalid text {
  fill: var(--color-error);
}

.plan2d__wall {
  fill: #343434;
  stroke: none;
  cursor: pointer;
}

.plan2d__wall--interior {
  fill: #8A8681;
}

.plan2d__wall--hover {
  fill: var(--color-primary-hover);
}

.plan2d__wall--selected {
  fill: var(--color-primary);
}

.plan2d__wall--pickable {
  cursor: crosshair;
}

.plan2d__opening {
  cursor: grab;
  stroke-width: 1;
}

.plan2d__opening:active {
  cursor: grabbing;
}

.plan2d__opening--door {
  fill: #EDE3D3;
  stroke: #B08D5E;
}

.plan2d__opening--window {
  fill: #E3EEF1;
  stroke: #8CB0BC;
}

.plan2d__opening--hover {
  stroke-width: 2;
}

.plan2d__opening--selected {
  stroke-width: 2.5;
  stroke: var(--color-primary);
}

.plan2d__opening--conflict {
  fill: var(--color-error-subtle);
  stroke: var(--color-error);
  stroke-dasharray: 4 3;
}

.plan2d__door-leaf,
.plan2d__door-arc {
  stroke: #8C6F45;
  stroke-width: 1.5;
  fill: none;
  pointer-events: none;
}

.plan2d__room-label {
  font-size: 13px;
  fill: var(--color-text);
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  user-select: none;
}

.plan2d__empty {
  color: var(--color-text-muted);
  font-size: var(--font-body-size);
}

.plan2d__dimension line {
  stroke: var(--color-text-muted);
  stroke-width: 1;
  pointer-events: none;
}

.plan2d__dimension text {
  font-size: 11px;
  fill: var(--color-text-secondary);
  text-anchor: middle;
  pointer-events: none;
  user-select: none;
}

.plan2d__dimension--accent line {
  stroke: var(--color-primary);
}

.plan2d__dimension--accent text {
  fill: var(--color-primary-hover);
  font-weight: 500;
}
</style>
