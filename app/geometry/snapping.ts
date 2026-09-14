// Geometry Engine: snap-to-grid и вспомогательные пространственные функции.
// На первом этапе поддерживается только привязка к сетке в плоскости X/Z.

export const GRID_SIZE = 0.1 // метры (10 см)
export const MIN_ROOM_SIZE = 0.5 // метры

export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
