<script setup lang="ts">
import type { Room } from '~/types/building'
import { clamp, snapToGrid } from '~/geometry/snapping'

const { document: buildingDocument, selectedRoomId, moveRoom, selectRoom } = useBuilding()

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

function onRoomPointerMove(event: PointerEvent) {
  if (!drag.value || drag.value.pointerId !== event.pointerId) return
  const room = building.value.rooms.find(r => r.id === drag.value?.roomId)
  if (!room || room.geometry.type !== 'rectangle') return

  const pos = screenToMeters(event.clientX, event.clientY)
  const rawX = pos.x - drag.value.offsetX
  const rawZ = pos.z - drag.value.offsetZ

  const maxX = Math.max(0, building.value.dimensions.width - room.geometry.width)
  const maxZ = Math.max(0, building.value.dimensions.length - room.geometry.length)

  const nextX = clamp(snapToGrid(rawX), 0, maxX)
  const nextZ = clamp(snapToGrid(rawZ), 0, maxZ)

  moveRoom(room.id, nextX, nextZ)
}

function onRoomPointerUp(event: PointerEvent) {
  if (!drag.value || drag.value.pointerId !== event.pointerId) return
  drag.value = null
}

function onBackgroundClick() {
  selectRoom(null)
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
            :class="{ 'plan2d__room-rect--selected': room.id === selectedRoomId }"
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
