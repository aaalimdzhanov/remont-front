// Geometry Engine: построение геометрии стен из прямоугольных комнат.
//
// Стены — производная величина, а не независимые данные: building.walls
// полностью пересчитывается из building.rooms при каждом изменении комнат
// (см. useBuilding.ts), поэтому рассинхронизация невозможна по конструкции.

import type { Floor, Point2D, Room, RoomRectangleGeometry, Wall, WallType } from '~/types/building'
import { GRID_SIZE, snapToGrid } from '~/geometry/snapping'

export const DEFAULT_WALL_THICKNESS = 0.2
export const DEFAULT_FLOOR_HEIGHT = 3
const EPSILON = 1e-6

export function clampWallThickness(value: number): number {
  return Math.max(GRID_SIZE, snapToGrid(value))
}

export function wallLength(wall: Pick<Wall, 'start' | 'end'>): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z)
}

// Точка на линии стены на расстоянии distance (м) от wall.start.
export function pointAlongWall(wall: Pick<Wall, 'start' | 'end'>, distance: number): Point2D {
  const length = wallLength(wall)
  if (length <= EPSILON) return { ...wall.start }
  const t = distance / length
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    z: wall.start.z + (wall.end.z - wall.start.z) * t,
  }
}

// Обратная операция: проекция произвольной точки плана на линию стены,
// выраженная как расстояние от wall.start. Используется при перетаскивании
// проёма — стена всегда осепараллельна, поэтому проекция сводится к одной
// координате.
export function projectPointOntoWall(wall: Pick<Wall, 'start' | 'end'>, point: Point2D): number {
  const isVertical = Math.abs(wall.start.x - wall.end.x) < EPSILON
  return isVertical ? point.z - wall.start.z : point.x - wall.start.x
}

type RectRoom = Room & { geometry: RoomRectangleGeometry }
type Orientation = 'horizontal' | 'vertical'

interface WallEdge {
  roomId: string
  orientation: Orientation
  fixed: number // x для вертикального ребра, z для горизонтального
  from: number // начало участка вдоль другой оси
  to: number // конец участка вдоль другой оси
}

// 4 сырых граничных ребра одной комнаты, ещё без учёта соседей.
export function roomToWallEdges(room: RectRoom): WallEdge[] {
  const { position, width, length } = room.geometry
  const left = position.x
  const right = position.x + width
  const top = position.z
  const bottom = position.z + length

  return [
    { roomId: room.id, orientation: 'vertical', fixed: left, from: top, to: bottom },
    { roomId: room.id, orientation: 'vertical', fixed: right, from: top, to: bottom },
    { roomId: room.id, orientation: 'horizontal', fixed: top, from: left, to: right },
    { roomId: room.id, orientation: 'horizontal', fixed: bottom, from: left, to: right },
  ]
}

interface MergedSegment {
  orientation: Orientation
  fixed: number
  from: number
  to: number
  roomIds: string[]
}

function sameRoomSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

// Раскладывает коллинеарные рёбра (лежащие на одной линии) на подотрезки и
// определяет для каждого, какому набору комнат он принадлежит: подотрезок,
// покрытый одной комнатой, — внешняя стена; двумя и более — общая (внутренняя).
// Сравнение координат идёт с epsilon, а не через строгое равенство: после
// сложения/вычитания «привязанных к сетке» чисел возможна погрешность float.
function overlayCollinearEdges(edges: WallEdge[]): MergedSegment[] {
  const first = edges[0]
  if (!first) return []

  const breakpoints = new Set<number>()
  for (const edge of edges) {
    breakpoints.add(edge.from)
    breakpoints.add(edge.to)
  }
  const sorted = Array.from(breakpoints).sort((a, b) => a - b)

  const raw: MergedSegment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i]
    const to = sorted[i + 1]
    if (from === undefined || to === undefined) continue
    if (to - from <= EPSILON) continue

    const mid = (from + to) / 2
    const coveringRoomIds = edges
      .filter(edge => edge.from <= mid + EPSILON && edge.to >= mid - EPSILON)
      .map(edge => edge.roomId)

    if (coveringRoomIds.length === 0) continue

    raw.push({
      orientation: first.orientation,
      fixed: first.fixed,
      from,
      to,
      roomIds: Array.from(new Set(coveringRoomIds)).sort(),
    })
  }

  // Склеиваем соседние подотрезки с одинаковым набором комнат в одну стену.
  const merged: MergedSegment[] = []
  for (const segment of raw) {
    const last = merged[merged.length - 1]
    if (last && Math.abs(last.to - segment.from) <= EPSILON && sameRoomSet(last.roomIds, segment.roomIds)) {
      last.to = segment.to
    } else {
      merged.push({ ...segment })
    }
  }

  return merged
}

// Стабильный id стены: зависит от набора владеющих комнат, ориентации и
// относительного порядка среди стен с тем же набором+ориентацией (какая из
// сторон «левая»/«правая» и т.п.) — а НЕ от абсолютных координат. Благодаря
// этому перемещение/resize комнаты не меняет id её стен, и двери/окна,
// привязанные к wall_id, не «отвязываются» на каждый пиксель перетаскивания.
function assignStableWallIds(segments: MergedSegment[]): string[] {
  const groups = new Map<string, number[]>()
  segments.forEach((segment, index) => {
    const key = `${segment.roomIds.join('_')}:${segment.orientation}`
    const list = groups.get(key) ?? []
    list.push(index)
    groups.set(key, list)
  })

  const ids = new Array<string>(segments.length)
  for (const [key, indices] of groups) {
    const sorted = [...indices].sort((a, b) => segments[a]!.fixed - segments[b]!.fixed)
    sorted.forEach((segmentIndex, order) => {
      ids[segmentIndex] = `wall-${key.replace(':', '-')}-${order}`
    })
  }

  return ids
}

function segmentToWall(segment: MergedSegment, floorId: string, height: number, id: string): Wall {
  const type: WallType = segment.roomIds.length >= 2 ? 'interior' : 'exterior'
  const start: Point2D = segment.orientation === 'vertical'
    ? { x: segment.fixed, z: segment.from }
    : { x: segment.from, z: segment.fixed }
  const end: Point2D = segment.orientation === 'vertical'
    ? { x: segment.fixed, z: segment.to }
    : { x: segment.to, z: segment.fixed }

  return {
    id,
    floor_id: floorId,
    type,
    start,
    end,
    height,
    thickness: clampWallThickness(DEFAULT_WALL_THICKNESS),
    room_ids: segment.roomIds,
  }
}

interface FloorSegment {
  floorId: string
  height: number
  segment: MergedSegment
}

// Полная перегенерация стен здания из текущих комнат. Комнаты пересекающиеся
// геометрически не «чинятся» — стены строятся по их границам предсказуемо,
// как есть.
export function generateWallsFromRooms(rooms: Room[], floors: Floor[]): Wall[] {
  const floorsById = new Map(floors.map(floor => [floor.id, floor]))
  const roomsByFloor = new Map<string, RectRoom[]>()

  for (const room of rooms) {
    if (room.geometry.type !== 'rectangle') continue
    const list = roomsByFloor.get(room.floor_id) ?? []
    list.push(room as RectRoom)
    roomsByFloor.set(room.floor_id, list)
  }

  const floorSegments: FloorSegment[] = []

  for (const [floorId, floorRooms] of roomsByFloor) {
    const height = floorsById.get(floorId)?.height ?? DEFAULT_FLOOR_HEIGHT
    const edges = floorRooms.flatMap(roomToWallEdges)

    const groups = new Map<string, WallEdge[]>()
    for (const edge of edges) {
      const key = `${edge.orientation}:${edge.fixed.toFixed(4)}`
      const list = groups.get(key) ?? []
      list.push(edge)
      groups.set(key, list)
    }

    for (const groupEdges of groups.values()) {
      for (const segment of overlayCollinearEdges(groupEdges)) {
        floorSegments.push({ floorId, height, segment })
      }
    }
  }

  const ids = assignStableWallIds(floorSegments.map(fs => fs.segment))
  return floorSegments.map((fs, index) => segmentToWall(fs.segment, fs.floorId, fs.height, ids[index]!))
}
