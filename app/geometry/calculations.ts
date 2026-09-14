// Geometry/Calculation Engine: площади и статистика здания.
//
// Всё здесь — чистые функции от rooms/walls/openings (существующей
// геометрии), ничего не хранят сами. building.calculated — их результат,
// а не источник истины: пересчитывается целиком при каждом изменении модели
// (см. useBuilding.ts), вручную не редактируется и не обновляется кнопкой.

import type { Building, BuildingCalculated, Opening, Room, RoomRectangleGeometry, Wall } from '~/types/building'
import { isRectanglesIntersecting, rectBoundsOfGeometry } from '~/geometry/validation'
import { DEFAULT_FLOOR_HEIGHT, wallLength } from '~/geometry/walls'

export function calculateRoomArea(room: Room): number {
  if (room.geometry.type !== 'rectangle') return 0
  return room.geometry.width * room.geometry.length
}

export function calculateFloorArea(rooms: Room[]): number {
  return rooms.reduce((sum, room) => sum + calculateRoomArea(room), 0)
}

// На этом этапе площадь потолка равна площади пола (плоские перекрытия,
// без учёта наклонных крыш/мансард).
export function calculateCeilingArea(rooms: Room[]): number {
  return calculateFloorArea(rooms)
}

// Стена уже уникальна геометрически (building.walls не дублирует общие
// стены между комнатами), поэтому простая сумма по массиву не считает
// внутреннюю стену дважды.
export function calculateWallArea(walls: Wall[]): number {
  return walls.reduce((sum, wall) => {
    const height = wall.height > 0 ? wall.height : DEFAULT_FLOOR_HEIGHT
    return sum + wallLength(wall) * height
  }, 0)
}

// Площадь набора проёмов (вызывающий код сам фильтрует по type, чтобы
// получить doorArea/windowArea по отдельности). Некорректная геометрия
// (width/height <= 0) не должна ронять расчёт — просто не учитывается.
export function calculateOpeningArea(openings: Opening[]): number {
  return openings.reduce((sum, opening) => {
    const { width, height } = opening.dimensions
    if (width <= 0 || height <= 0) return sum
    return sum + width * height
  }, 0)
}

// Чистая площадь стен = площадь стен минус площадь всех проёмов.
// Никогда не уходит в минус даже при некорректных исходных данных.
export function calculateNetWallArea(walls: Wall[], openings: Opening[]): number {
  return Math.max(0, calculateWallArea(walls) - calculateOpeningArea(openings))
}

function roomsOverlap(rooms: Room[]): boolean {
  const rectRooms = rooms.filter(
    (room): room is Room & { geometry: RoomRectangleGeometry } => room.geometry.type === 'rectangle',
  )
  for (let i = 0; i < rectRooms.length; i++) {
    for (let j = i + 1; j < rectRooms.length; j++) {
      const a = rectRooms[i]
      const b = rectRooms[j]
      if (!a || !b) continue
      if (isRectanglesIntersecting(rectBoundsOfGeometry(a.geometry), rectBoundsOfGeometry(b.geometry))) return true
    }
  }
  return false
}

// Главная точка входа: собирает building.calculated целиком из текущей
// геометрии. rooms/walls/openings остаются единственным источником истины —
// эта функция ничего не мутирует, только читает и агрегирует.
export function calculateBuildingStatistics(building: Building): BuildingCalculated {
  const { rooms, walls, openings } = building
  const doors = openings.filter(opening => opening.type === 'door')
  const windows = openings.filter(opening => opening.type === 'window')

  const floor = calculateFloorArea(rooms)
  const ceiling = calculateCeilingArea(rooms)
  const wallGross = calculateWallArea(walls)
  const doorArea = calculateOpeningArea(doors)
  const windowArea = calculateOpeningArea(windows)
  const openingArea = doorArea + windowArea
  const wallNet = Math.max(0, wallGross - openingArea)

  const warnings: string[] = []
  if (roomsOverlap(rooms)) warnings.push('Rooms overlap')
  if (openingArea > wallGross) warnings.push('Opening area exceeds wall area')
  if (walls.some(wall => wall.height <= 0)) warnings.push('Invalid wall height')
  if (openings.some(opening => opening.dimensions.width <= 0 || opening.dimensions.height <= 0)) {
    warnings.push('Invalid opening geometry')
  }

  return {
    areas: { floor, ceiling, wallGross, wallNet },
    openings: { doors: doorArea, windows: windowArea, total: openingArea },
    statistics: {
      roomCount: rooms.length,
      wallCount: walls.length,
      doorCount: doors.length,
      windowCount: windows.length,
    },
    warnings,
  }
}
