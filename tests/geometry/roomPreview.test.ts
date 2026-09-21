import { describe, expect, it } from 'vitest'
import { buildRoomPreview } from '~/geometry/preview'
import type { Building } from '~/types/building'

// Комната 3×2 в позиции (1,1), с одной дверью на южной стене и одной
// комнатой-соседом (второй room), чтобы проверить, что buildRoomPreview
// берёт ТОЛЬКО стены/проёмы, граничащие именно с целевой комнатой (по
// room_ids), а не всё здание — иначе Work Builder показывал бы чужую
// геометрию на превью.
function buildTestBuilding(): Building {
  return {
    id: 'b1',
    type: 'house',
    dimensions: { width: 10, length: 10 },
    floors: [{ id: 'f1', number: 0, elevation: 0, height: 3 }],
    rooms: [
      { id: 'room-1', floor_id: 'f1', name: 'Санузел', type: 'bathroom', geometry: { type: 'rectangle', width: 3, length: 2, position: { x: 1, z: 1 }, rotation: 0 } },
      { id: 'room-2', floor_id: 'f1', name: 'Другая комната', type: 'other', geometry: { type: 'rectangle', width: 3, length: 2, position: { x: 5, z: 1 }, rotation: 0 } },
    ],
    walls: [
      // Южная стена room-1, с дверью.
      { id: 'wall-south-1', floor_id: 'f1', type: 'interior', start: { x: 1, z: 1 }, end: { x: 4, z: 1 }, height: 3, thickness: 0.2, room_ids: ['room-1'] },
      // Стена, не относящаяся к room-1 вообще (принадлежит только room-2).
      { id: 'wall-room-2', floor_id: 'f1', type: 'interior', start: { x: 5, z: 1 }, end: { x: 8, z: 1 }, height: 3, thickness: 0.2, room_ids: ['room-2'] },
    ],
    openings: [
      { id: 'door-1', type: 'door', wall_id: 'wall-south-1', dimensions: { width: 0.9, height: 2.0 }, position: { offset: 0.5, bottom: 0 } },
    ],
    stairs: [],
    roof: null,
    elements: [],
  }
}

describe('buildRoomPreview', () => {
  it('returns the room rect at its own position/size, offset for the viewBox accordingly', () => {
    const building = buildTestBuilding()
    const preview = buildRoomPreview(building, 'room-1')
    expect(preview).not.toBeNull()
    expect(preview!.roomRect).toEqual({ x: 1, y: 1, width: 3, height: 2 })
    expect(preview!.viewBoxX).toBe(1)
    expect(preview!.viewBoxY).toBe(1)
    expect(preview!.viewBoxWidth).toBe(3)
    expect(preview!.viewBoxHeight).toBe(2)
  })

  it('only includes walls/openings that belong to the requested room, not the whole building', () => {
    const building = buildTestBuilding()
    const preview = buildRoomPreview(building, 'room-1')!
    expect(preview.wallRects.length).toBeGreaterThan(0)
    expect(preview.doorRects).toHaveLength(1)
    // wall-room-2 не должна попасть в превью room-1 вообще.
    const preview2 = buildRoomPreview(building, 'room-2')!
    expect(preview2.doorRects).toHaveLength(0)
  })

  it('returns null when the room id does not exist', () => {
    const building = buildTestBuilding()
    expect(buildRoomPreview(building, 'does-not-exist')).toBeNull()
  })

  it('returns null for a polygon room (rectangle-only support, same as the rest of the frontend)', () => {
    const building = buildTestBuilding()
    building.rooms[0]!.geometry = { type: 'polygon', points: [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 1, z: 1 }] }
    expect(buildRoomPreview(building, 'room-1')).toBeNull()
  })
})
