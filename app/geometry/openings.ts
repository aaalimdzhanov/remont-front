// Geometry Engine: проёмы (двери/окна) на стенах.
//
// Opening всегда привязан к конкретной стене через wall_id, а его положение
// (position.offset) — локальная координата вдоль стены, отсчитываемая от
// wall.start (а не глобальный x/z). Геометрия самой стены не дублируется.

import type { Opening, Wall } from '~/types/building'
import { clamp, snapToGrid } from '~/geometry/snapping'
import { wallLength } from '~/geometry/walls'

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

// Приводит проёмы в соответствие с текущей геометрией стен: если стена, на
// которой был проём, исчезла — проём безопасно удаляется (не остаётся
// «висячих» wall_id); если стена осталась, но изменила длину/высоту — проём
// поджимается (clamp), а не удаляется. Вызывается после каждой перегенерации
// building.walls.
export function reconcileOpeningsWithWalls(openings: Opening[], walls: Wall[]): Opening[] {
  const wallsById = new Map(walls.map(wall => [wall.id, wall]))
  const reconciled: Opening[] = []

  for (const opening of openings) {
    const wall = wallsById.get(opening.wall_id)
    if (!wall) continue

    const wallLen = wallLength(wall)
    const width = clampOpeningWidth(opening.dimensions.width, wallLen)
    const height = clampOpeningHeight(opening.dimensions.height, wall.height)
    const offset = clampOpeningPosition(opening.position.offset, width, wallLen)
    const bottom = clampSillHeight(opening.position.bottom, height, wall.height)

    reconciled.push({
      ...opening,
      dimensions: { width, height },
      position: { offset, bottom },
    })
  }

  return reconciled
}
