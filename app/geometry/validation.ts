// Geometry Engine: пространственные проверки корректности модели.
// На первом этапе — только пересечение прямоугольных комнат в плане X/Z.

import type { RoomRectangleGeometry } from '~/types/building'

export interface RectBounds {
  x: number
  z: number
  width: number
  length: number
}

export function rectBoundsOfGeometry(geometry: RoomRectangleGeometry): RectBounds {
  return {
    x: geometry.position.x,
    z: geometry.position.z,
    width: geometry.width,
    length: geometry.length,
  }
}

// Прямоугольники, соприкасающиеся гранью (общая стена), пересечением не считаются.
export function isRectanglesIntersecting(a: RectBounds, b: RectBounds): boolean {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.z < b.z + b.length
    && a.z + a.length > b.z
  )
}
