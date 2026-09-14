<script setup lang="ts">
import type { Opening, Point2D, Room, Wall } from '~/types/building'
import { clamp, snapToGrid } from '~/geometry/snapping'
import { pointAlongWall, projectPointOntoWall, wallLength } from '~/geometry/walls'
import { splitWallByOpenings } from '~/geometry/openings'

const {
  document: buildingDocument,
  selectedRoomId,
  selectedWallId,
  selectedOpeningId,
  pendingOpeningType,
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
} = useBuilding()

const PX_PER_METER = 60
const MARGIN = 40

const building = computed(() => buildingDocument.value.building)

const svgWidth = computed(() => building.value.dimensions.width * PX_PER_METER + MARGIN * 2)
const svgHeight = computed(() => building.value.dimensions.length * PX_PER_METER + MARGIN * 2)

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
</script>

<template>
  <div class="plan2d">
    <svg
      v-if="svgWidth > 0 && svgHeight > 0"
      ref="svgEl"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      class="plan2d__svg"
      @click="onBackgroundClick"
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
              'plan2d__room-rect--conflict': isRoomIntersecting(room.id),
            }"
            @pointerdown.stop="onRoomPointerDown($event, room)"
            @pointermove.stop="onRoomPointerMove"
            @pointerup.stop="onRoomPointerUp"
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
              'plan2d__wall--pickable': pendingOpeningType,
            }"
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
                  'plan2d__opening--conflict': isOpeningIntersecting(opening.id),
                },
              ]"
              @pointerdown.stop="onOpeningPointerDown($event, wall, opening)"
              @pointermove.stop="onOpeningPointerMove"
              @pointerup.stop="onOpeningPointerUp"
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
  background: #ffffff;
  border: 1px solid #e1e4ea;
  border-radius: 8px;
  padding: 16px;
  min-height: 320px;
}

.plan2d__svg {
  width: 100%;
  max-width: 720px;
  height: auto;
  touch-action: none;
}

.plan2d__building {
  fill: #fafbfc;
  stroke: #2b3440;
  stroke-width: 2;
}

.plan2d__grid line {
  stroke: #edf0f3;
  stroke-width: 1;
}

.plan2d__room-rect {
  fill: #cfe8ff;
  stroke: #2f7fd1;
  stroke-width: 1.5;
  cursor: grab;
}

.plan2d__room-rect:active {
  cursor: grabbing;
}

.plan2d__room-rect--selected {
  fill: #a9d6ff;
  stroke: #1a5fa8;
  stroke-width: 2.5;
}

.plan2d__room-rect--conflict {
  fill: #ffd4d1;
  stroke: #d33a30;
  stroke-width: 2;
  stroke-dasharray: 4 3;
}

.plan2d__room-rect--conflict.plan2d__room-rect--selected {
  fill: #ffc0ba;
  stroke: #b8281f;
  stroke-width: 2.5;
}

.plan2d__wall {
  fill: #4b5563;
  stroke: none;
  cursor: pointer;
}

.plan2d__wall--interior {
  fill: #9aa3af;
}

.plan2d__wall--selected {
  fill: #d68a1c;
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
  fill: #f1e0c6;
  stroke: #b8955c;
}

.plan2d__opening--window {
  fill: #cdeaf7;
  stroke: #4fa9c9;
}

.plan2d__opening--selected {
  stroke-width: 2.5;
  stroke: #d68a1c;
}

.plan2d__opening--conflict {
  fill: #ffd4d1;
  stroke: #d33a30;
  stroke-dasharray: 4 3;
}

.plan2d__door-leaf,
.plan2d__door-arc {
  stroke: #7a5c33;
  stroke-width: 1.5;
  fill: none;
  pointer-events: none;
}

.plan2d__room-label {
  font-size: 13px;
  fill: #1f2430;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  user-select: none;
}

.plan2d__empty {
  color: #8a93a2;
  font-size: 14px;
}
</style>
