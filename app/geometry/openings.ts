// Geometry Engine: проёмы (двери/окна) на стенах.
//
// Opening всегда привязан к конкретной стене через wall_id, а его положение
// (position.offset) — локальная координата вдоль стены, отсчитываемая от
// wall.start (а не глобальный x/z). Геометрия самой стены не дублируется.

import type { Opening, Point2D, Wall } from '~/types/building'
import { clamp, snapToGrid } from '~/geometry/snapping'
import { pointAlongWall, projectPointOntoWall, wallLength } from '~/geometry/walls'

export const MIN_OPENING_WIDTH = 0.5
export const MIN_OPENING_HEIGHT = 0.5

export const DEFAULT_DOOR_WIDTH = 0.9
export const DEFAULT_DOOR_HEIGHT = 2.1
export const DEFAULT_WINDOW_WIDTH = 1.5
export const DEFAULT_WINDOW_HEIGHT = 1.4
export const DEFAULT_SILL_HEIGHT = 0.9

const EPSILON = 1e-6

// Ширина проёма: привязана к сетке 0.1 м, не меньше минимума и не больше
// самой стены (проём физически не может быть длиннее стены, на которой он
// расположен).
export function clampOpeningWidth(width: number, wallLen: number): number {
  const snapped = Math.max(MIN_OPENING_WIDTH, snapToGrid(width))
  return Math.min(snapped, Math.max(MIN_OPENING_WIDTH, wallLen))
}

export function clampOpeningHeight(height: number, maxHeight: number): number {
  const snapped = Math.max(MIN_OPENING_HEIGHT, snapToGrid(height))
  return Math.min(snapped, Math.max(MIN_OPENING_HEIGHT, maxHeight))
}

// position — расстояние от начала стены. Допустимый диапазон: [0, wallLen-width].
export function clampOpeningPosition(position: number, width: number, wallLen: number): number {
  const maxPosition = Math.max(0, wallLen - width)
  return clamp(snapToGrid(position), 0, maxPosition)
}

// Высота нижней границы окна от пола: не даёт окну «вылезти» выше стены.
export function clampSillHeight(bottom: number, openingHeight: number, wallHeight: number): number {
  const maxBottom = Math.max(0, wallHeight - openingHeight)
  return clamp(snapToGrid(bottom), 0, maxBottom)
}

export interface Interval {
  from: number
  to: number
}

export function openingInterval(opening: Opening): Interval {
  return { from: opening.position.offset, to: opening.position.offset + opening.dimensions.width }
}

export function isOpeningInsideWall(opening: Opening, wallLen: number): boolean {
  const { from, to } = openingInterval(opening)
  return from >= -EPSILON && to <= wallLen + EPSILON
}

export function doOpeningsOverlap(a: Opening, b: Opening): boolean {
  const ia = openingInterval(a)
  const ib = openingInterval(b)
  return ia.from < ib.to - EPSILON && ia.to > ib.from + EPSILON
}

// Разбивает стену на «сплошные» участки, исключая интервалы проёмов —
// используется для отрисовки: стена не должна визуально продолжаться через
// дверь/окно. Пересекающиеся проёмы объединяются перед вычитанием, чтобы не
// оставить стену-щепку между ними.
export function splitWallByOpenings(wallLen: number, openings: Opening[]): Interval[] {
  if (openings.length === 0) return [{ from: 0, to: wallLen }]

  const intervals = openings.map(openingInterval).sort((a, b) => a.from - b.from)

  const gaps: Interval[] = []
  for (const interval of intervals) {
    const last = gaps[gaps.length - 1]
    if (last && interval.from <= last.to + EPSILON) {
      last.to = Math.max(last.to, interval.to)
    } else {
      gaps.push({ ...interval })
    }
  }

  const segments: Interval[] = []
  let cursor = 0
  for (const gap of gaps) {
    if (gap.from > cursor + EPSILON) {
      segments.push({ from: cursor, to: gap.from })
    }
    cursor = Math.max(cursor, gap.to)
  }
  if (cursor < wallLen - EPSILON) {
    segments.push({ from: cursor, to: wallLen })
  }

  return segments
}

// Ищет среди новых стен ту же физическую линию, что и referenceWall: та же
// ориентация, та же fixed-координата, и point лежит в её пределах. Не ищет
// по id — только по геометрии, поэтому находит стену, даже если её id
// изменился (например, комната-«владелец» общей стены была удалена, и
// владельцем стала другая комната на той же линии).
function findWallCoveringPoint(walls: Wall[], referenceWall: Wall, point: Point2D): Wall | undefined {
  const isVertical = Math.abs(referenceWall.start.x - referenceWall.end.x) < EPSILON

  return walls.find((wall) => {
    const wallIsVertical = Math.abs(wall.start.x - wall.end.x) < EPSILON
    if (wallIsVertical !== isVertical) return false

    const fixedMatches = isVertical
      ? Math.abs(wall.start.x - point.x) < EPSILON
      : Math.abs(wall.start.z - point.z) < EPSILON
    if (!fixedMatches) return false

    const distance = projectPointOntoWall(wall, point)
    return distance >= -EPSILON && distance <= wallLength(wall) + EPSILON
  })
}

interface Candidate {
  wall: Wall
  offset: number
  worldMidpoint: Point2D
}

// Приводит проёмы в соответствие с текущей геометрией стен.
//
// Раньше здесь просто искали стену по wall_id и переиспользовали raw
// position.offset как есть — это ломалось, когда стена с тем же id
// оказывалась другим физическим участком линии (соседняя комната частично
// перекрыла стену, та разделилась, и дизамбигуация id отдала «простой» id
// не тому кусочку) — offset тогда означал бы другую точку на плане, и проём
// прыгал бы/обрезался неверно.
//
// Наивная фикса «всегда искать по старой абсолютной позиции» тоже сломана:
// при обычном перемещении/resize КОМНАТЫ-владельца сама стена просто уезжает
// вместе с ней, и старая абсолютная точка на плане пустует — geometric-поиск
// закономерно ничего не находит, хотя raw offset (локальный, относительно
// wall.start) как раз остаётся верным.
//
// Поэтому считаем ОБА кандидата и берём тот, что физически ближе к тому
// месту, где проём был раньше:
//  A) id совпал -> raw offset как есть (верно при переносе/resize стены
//     ТОЙ ЖЕ комнаты — её wall.start уезжает вместе с проёмом);
//  B) геометрический поиск по старой абсолютной точке среди ВСЕХ новых стен
//     (верно при разбиении стены на сегменты из-за чужой комнаты — start
//     сдвигается не из-за переноса, а из-за смены того, какой кусок один и
//     тот же id).
// Если кандидат один — используем его. Если оба есть — берём более близкий
// к исходной точке. Если ни одного — стена действительно исчезла, удаляем.
export function reconcileOpeningsWithWalls(openings: Opening[], walls: Wall[], oldWalls: Wall[]): Opening[] {
  const wallsById = new Map(walls.map(wall => [wall.id, wall]))
  const oldWallsById = new Map(oldWalls.map(wall => [wall.id, wall]))
  const reconciled: Opening[] = []

  for (const opening of openings) {
    const oldWall = oldWallsById.get(opening.wall_id)
    const oldMidpoint = oldWall
      ? pointAlongWall(oldWall, opening.position.offset + opening.dimensions.width / 2)
      : null

    const candidates: Candidate[] = []

    // Кандидат A: тот же id. Верен, когда стена той же комнаты просто
    // передвинулась/изменила размер целиком — offset здесь остаётся
    // валидным как есть. Клампим offset ПЕРЕД расчётом worldMidpoint, иначе
    // при слишком коротком участке pointAlongWall экстраполирует точку за
    // пределы стены, и сравнение с кандидатом B станет нечестным.
    const sameIdWall = wallsById.get(opening.wall_id)
    if (sameIdWall) {
      const wallLen = wallLength(sameIdWall)
      const width = clampOpeningWidth(opening.dimensions.width, wallLen)
      const offset = clampOpeningPosition(opening.position.offset, width, wallLen)
      candidates.push({
        wall: sameIdWall,
        offset,
        worldMidpoint: pointAlongWall(sameIdWall, offset + width / 2),
      })
    }

    // Кандидат B: геометрический поиск по старой абсолютной точке. Верен,
    // когда стена разделилась на сегменты из-за чужой комнаты — даже если
    // он указывает на ТУ ЖЕ стену, что и кандидат A, его offset может быть
    // совсем другим (и куда более верным), поэтому не отбрасываем его как
    // «дубликат» по одному только id стены — решает сравнение по расстоянию.
    if (oldWall && oldMidpoint) {
      const match = findWallCoveringPoint(walls, oldWall, oldMidpoint)
      if (match) {
        candidates.push({
          wall: match,
          offset: projectPointOntoWall(match, oldMidpoint) - opening.dimensions.width / 2,
          worldMidpoint: oldMidpoint,
        })
      }
    }

    if (candidates.length === 0) continue // физической стены на этом месте больше нет

    const anchor = oldMidpoint ?? candidates[0]!.worldMidpoint
    const best = candidates.reduce((closest, candidate) => {
      const d = Math.hypot(candidate.worldMidpoint.x - anchor.x, candidate.worldMidpoint.z - anchor.z)
      const dClosest = Math.hypot(closest.worldMidpoint.x - anchor.x, closest.worldMidpoint.z - anchor.z)
      return d < dClosest ? candidate : closest
    })

    const wallLen = wallLength(best.wall)
    const width = clampOpeningWidth(opening.dimensions.width, wallLen)
    const height = clampOpeningHeight(opening.dimensions.height, best.wall.height)
    const clampedOffset = clampOpeningPosition(best.offset, width, wallLen)
    const bottom = clampSillHeight(opening.position.bottom, height, best.wall.height)

    reconciled.push({
      ...opening,
      wall_id: best.wall.id,
      dimensions: { width, height },
      position: { offset: clampedOffset, bottom },
    })
  }

  return reconciled
}
