import type { BuildingDocument, Room, RoomType } from '~/types/building'

function createEmptyDocument(): BuildingDocument {
  return {
    schema: { name: 'remont-building', version: '1.0' },
    project: { id: 'project-001', name: 'Ремонт дома', status: 'draft' },
    units: { length: 'm', area: 'm2', volume: 'm3', angle: 'deg' },
    building: {
      id: 'building-001',
      type: 'house',
      dimensions: { width: 0, length: 0 },
      floors: [],
      rooms: [],
      walls: [],
      openings: [],
      stairs: [],
      roof: null,
      elements: [],
    },
    work_requirements: [],
    calculated: {},
  }
}

function nextId(prefix: string, existingIds: string[]): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`)
  let max = 0
  for (const id of existingIds) {
    const match = pattern.exec(id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

/**
 * Building JSON — единственный источник истины приложения.
 * 2D Builder читает и изменяет эту модель; Geometry Engine и Three.js
 * (на будущих этапах) будут строиться поверх неё же, без отдельных копий.
 */
export function useBuilding() {
  const document = useState<BuildingDocument>('building-document', createEmptyDocument)
  const selectedRoomId = useState<string | null>('selected-room-id', () => null)

  const hasBuilding = computed(
    () => document.value.building.dimensions.width > 0 && document.value.building.dimensions.length > 0,
  )

  const selectedRoom = computed<Room | null>(
    () => document.value.building.rooms.find(room => room.id === selectedRoomId.value) ?? null,
  )

  function createBuilding(width: number, length: number) {
    document.value.building.dimensions.width = width
    document.value.building.dimensions.length = length

    if (document.value.building.floors.length === 0) {
      document.value.building.floors.push({
        id: nextId('floor', []),
        number: 1,
        elevation: 0,
        height: 3,
      })
    }
  }

  function addRoom(params: { name: string, type: RoomType, width: number, length: number }) {
    const floor = document.value.building.floors[0]
    if (!floor) return

    const room: Room = {
      id: nextId('room', document.value.building.rooms.map(r => r.id)),
      floor_id: floor.id,
      name: params.name,
      type: params.type,
      geometry: {
        type: 'rectangle',
        width: params.width,
        length: params.length,
        position: { x: 0, z: 0 },
        rotation: 0,
      },
    }

    document.value.building.rooms.push(room)
    selectedRoomId.value = room.id
  }

  function moveRoom(id: string, x: number, z: number) {
    const room = document.value.building.rooms.find(r => r.id === id)
    if (!room || room.geometry.type !== 'rectangle') return
    room.geometry.position.x = x
    room.geometry.position.z = z
  }

  function resizeRoom(id: string, width: number, length: number) {
    const room = document.value.building.rooms.find(r => r.id === id)
    if (!room || room.geometry.type !== 'rectangle') return
    room.geometry.width = width
    room.geometry.length = length
  }

  function renameRoom(id: string, name: string) {
    const room = document.value.building.rooms.find(r => r.id === id)
    if (!room) return
    room.name = name
  }

  function removeRoom(id: string) {
    document.value.building.rooms = document.value.building.rooms.filter(r => r.id !== id)
    if (selectedRoomId.value === id) selectedRoomId.value = null
  }

  function selectRoom(id: string | null) {
    selectedRoomId.value = id
  }

  return {
    document,
    hasBuilding,
    selectedRoomId,
    selectedRoom,
    createBuilding,
    addRoom,
    moveRoom,
    resizeRoom,
    renameRoom,
    removeRoom,
    selectRoom,
  }
}
