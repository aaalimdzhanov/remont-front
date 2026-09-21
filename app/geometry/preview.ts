// Geometry Engine: превращает уже посчитанную геометрию здания (rooms/walls/
// openings — реальный Building JSON, ничего не выдумывается) в набор
// SVG-примитивов для лёгкого статичного preview на карточке проекта.
//
// Это НЕ вторая Geometry Engine и НЕ копия Plan2D.vue — те же геометрические
// хелперы (pointAlongWall/wallLength/splitWallByOpenings), что использует
// Plan2D.vue, просто применены здесь отдельно, потому что Plan2D.vue —
// файл Builder'а, который в этой задаче трогать нельзя. segmentRect()/
// openingsOnWall() ниже — их собственная небольшая проекция геометрии в
// прямоугольники, идентичная по формуле той, что в Plan2D.vue, но не
// импортируемая оттуда (там она приватная и завязана на конкретный SVG viewBox
// редактора с margin/zoom/pan).

import type { Building, Opening, Point2D } from '~/types/building'
import { pointAlongWall, wallLength } from '~/geometry/walls'
import { splitWallByOpenings } from '~/geometry/openings'

export interface PreviewRect {
  x: number
  y: number
  width: number
  height: number
}

export interface BuildingPreview {
  hasContent: boolean
  viewBoxWidth: number
  viewBoxHeight: number
  roomRects: PreviewRect[]
  wallRects: PreviewRect[]
  doorRects: PreviewRect[]
  windowRects: PreviewRect[]
}

const EMPTY_PREVIEW: BuildingPreview = {
  hasContent: false,
  viewBoxWidth: 0,
  viewBoxHeight: 0,
  roomRects: [],
  wallRects: [],
  doorRects: [],
  windowRects: [],
}

function segmentRect(start: Point2D, end: Point2D, thickness: number): PreviewRect {
  const half = thickness / 2
  const isVertical = Math.abs(start.x - end.x) < 1e-6
  if (isVertical) {
    const zFrom = Math.min(start.z, end.z)
    const zTo = Math.max(start.z, end.z)
    return { x: start.x - half, y: zFrom, width: thickness, height: zTo - zFrom }
  }
  const xFrom = Math.min(start.x, end.x)
  const xTo = Math.max(start.x, end.x)
  return { x: xFrom, y: start.z - half, width: xTo - xFrom, height: thickness }
}

function openingsOnWall(openings: Opening[], wallId: string): Opening[] {
  return openings.filter(opening => opening.wall_id === wallId)
}

// Чистая функция от Building JSON — ничего не мутирует, ничего не хранит.
// hasContent=false для ещё пустого здания (0×0 или ни одной комнаты) —
// вызывающий компонент сам решает, что показать вместо плана (см.
// ProjectPreview.vue: тот же архитектурный empty-sketch, что и в списке
// проектов, а не заглушка-фото).
export function buildBuildingPreview(building: Building): BuildingPreview {
  const { width, length } = building.dimensions
  if (width <= 0 || length <= 0 || building.rooms.length === 0) {
    return EMPTY_PREVIEW
  }

  const roomRects: PreviewRect[] = []
  for (const room of building.rooms) {
    if (room.geometry.type !== 'rectangle') continue
    const { position, width: w, length: l } = room.geometry
    roomRects.push({ x: position.x, y: position.z, width: w, height: l })
  }

  const wallRects: PreviewRect[] = []
  const doorRects: PreviewRect[] = []
  const windowRects: PreviewRect[] = []

  for (const wall of building.walls) {
    const wallOpenings = openingsOnWall(building.openings, wall.id)
    const spans = splitWallByOpenings(wallLength(wall), wallOpenings)
    for (const span of spans) {
      wallRects.push(segmentRect(pointAlongWall(wall, span.from), pointAlongWall(wall, span.to), wall.thickness))
    }
    for (const opening of wallOpenings) {
      const from = pointAlongWall(wall, opening.position.offset)
      const to = pointAlongWall(wall, opening.position.offset + opening.dimensions.width)
      const rect = segmentRect(from, to, wall.thickness)
      ;(opening.type === 'door' ? doorRects : windowRects).push(rect)
    }
  }

  return { hasContent: true, viewBoxWidth: width, viewBoxHeight: length, roomRects, wallRects, doorRects, windowRects }
}

// Отдельный, самостоятельный тип/функция для превью ОДНОЙ комнаты (Work
// Builder — экран выбора помещения/расчёта, см. задание). Сознательно не
// расширяет BuildingPreview/buildBuildingPreview выше — та форма завязана на
// viewBox от (0,0) для всего здания (см. ProjectPreview.vue), тогда как
// комната может находиться где угодно в координатах здания и её собственный
// viewBox должен начинаться от её position, а не от нуля. Трогать
// ProjectPreview.vue/Dashboard эта функция не должна вообще — только новый
// экспорт в этом же файле, использующий те же геометрические хелперы.
export interface RoomPreview {
  viewBoxX: number
  viewBoxY: number
  viewBoxWidth: number
  viewBoxHeight: number
  roomRect: PreviewRect
  wallRects: PreviewRect[]
  doorRects: PreviewRect[]
  windowRects: PreviewRect[]
}

// null — комната не найдена или её геометрия не rectangle (полигональные
// комнаты пока не поддерживаются нигде во фронтенде, см. app/types/building.ts).
export function buildRoomPreview(building: Building, roomId: string): RoomPreview | null {
  const room = building.rooms.find(r => r.id === roomId)
  if (!room || room.geometry.type !== 'rectangle') return null

  const { position, width, length } = room.geometry
  const roomRect: PreviewRect = { x: position.x, y: position.z, width, height: length }

  const wallRects: PreviewRect[] = []
  const doorRects: PreviewRect[] = []
  const windowRects: PreviewRect[] = []

  // Только стены, граничащие с этой комнатой (room_ids) — не всё здание.
  for (const wall of building.walls) {
    if (!wall.room_ids.includes(roomId)) continue
    const wallOpenings = openingsOnWall(building.openings, wall.id)
    const spans = splitWallByOpenings(wallLength(wall), wallOpenings)
    for (const span of spans) {
      wallRects.push(segmentRect(pointAlongWall(wall, span.from), pointAlongWall(wall, span.to), wall.thickness))
    }
    for (const opening of wallOpenings) {
      const from = pointAlongWall(wall, opening.position.offset)
      const to = pointAlongWall(wall, opening.position.offset + opening.dimensions.width)
      const rect = segmentRect(from, to, wall.thickness)
      ;(opening.type === 'door' ? doorRects : windowRects).push(rect)
    }
  }

  return { viewBoxX: position.x, viewBoxY: position.z, viewBoxWidth: width, viewBoxHeight: length, roomRect, wallRects, doorRects, windowRects }
}
