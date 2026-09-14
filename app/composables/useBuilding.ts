import type { BuildingDocument, Opening, OpeningType, Room, RoomRectangleGeometry, RoomType, Wall } from '~/types/building'
import { MIN_ROOM_SIZE, snapToGrid } from '~/geometry/snapping'
import { isRectanglesIntersecting, rectBoundsOfGeometry } from '~/geometry/validation'
import { DEFAULT_FLOOR_HEIGHT, generateWallsFromRooms, wallLength } from '~/geometry/walls'
import { calculateBuildingStatistics } from '~/geometry/calculations'
import {
  clampOpeningHeight,
  clampOpeningPosition,
  clampOpeningWidth,
  clampSillHeight,
  DEFAULT_DOOR_HEIGHT,
  DEFAULT_DOOR_WIDTH,
  DEFAULT_SILL_HEIGHT,
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  doOpeningsOverlap,
  reconcileOpeningsWithWalls,
} from '~/geometry/openings'

function snapRoomSize(value: number): number {
  return Math.max(MIN_ROOM_SIZE, snapToGrid(value))
}

function createEmptyDocument(): BuildingDocument {
  const building: BuildingDocument['building'] = {
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
  }

  return {
    schema: { name: 'remont-building', version: '1.0' },
    project: { id: 'project-001', name: 'Ремонт дома', status: 'draft' },
    units: { length: 'm', area: 'm2', volume: 'm3', angle: 'deg' },
    building,
    work_requirements: [],
    calculated: calculateBuildingStatistics(building),
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
  const selectedWallId = useState<string | null>('selected-wall-id', () => null)
  const selectedOpeningId = useState<string | null>('selected-opening-id', () => null)
  // Режим «выберите стену» после нажатия «+ Дверь» / «+ Окно»: следующий клик
  // по стене создаст проём выбранного типа именно на ней.
  const pendingOpeningType = useState<OpeningType | null>('pending-opening-type', () => null)

  const hasBuilding = computed(
    () => document.value.building.dimensions.width > 0 && document.value.building.dimensions.length > 0,
  )

  const selectedRoom = computed<Room | null>(
    () => document.value.building.rooms.find(room => room.id === selectedRoomId.value) ?? null,
  )

  const selectedWall = computed<Wall | null>(
    () => document.value.building.walls.find(wall => wall.id === selectedWallId.value) ?? null,
  )

  const selectedOpening = computed<Opening | null>(
    () => document.value.building.openings.find(opening => opening.id === selectedOpeningId.value) ?? null,
  )

  // Стены — производная геометрия комнат, а не независимые данные: пересчитываем
  // building.walls целиком при любом изменении состава/позиции/размеров комнат,
  // чтобы исключить рассинхронизацию. Ручного «обновить стены» не существует.
  // Двери/окна ссылаются на wall_id, поэтому после перегенерации стен их тоже
  // нужно согласовать: если стена исчезла — проём удаляется, если изменила
  // длину/высоту — проём поджимается (clamp), но не удаляется.
  function syncWalls() {
    document.value.building.walls = generateWallsFromRooms(
      document.value.building.rooms,
      document.value.building.floors,
    )
    document.value.building.openings = reconcileOpeningsWithWalls(
      document.value.building.openings,
      document.value.building.walls,
    )
    if (selectedWallId.value && !document.value.building.walls.some(wall => wall.id === selectedWallId.value)) {
      selectedWallId.value = null
    }
    if (
      selectedOpeningId.value
      && !document.value.building.openings.some(opening => opening.id === selectedOpeningId.value)
    ) {
      selectedOpeningId.value = null
    }
    syncCalculated()
  }

  // building.calculated — производные площади/статистика (Calculation Engine),
  // не источник истины. Пересчитывается целиком при любом изменении rooms/
  // walls/openings; ручной кнопки «пересчитать» нет. syncWalls() уже вызывает
  // это сама (комнаты меняют и стены, и расчёты); мутаторы openings, которые
  // не трогают стены, вызывают это напрямую.
  function syncCalculated() {
    document.value.calculated = calculateBuildingStatistics(document.value.building)
  }

  // Карта room.id -> набор id пересекающихся с ней комнат.
  // Пересчитывается реактивно при любом изменении позиции/размеров/состава комнат.
  const intersectingRoomIds = computed<Map<string, Set<string>>>(() => {
    const conflicts = new Map<string, Set<string>>()
    const rectRooms = document.value.building.rooms.filter(
      (room): room is Room & { geometry: RoomRectangleGeometry } => room.geometry.type === 'rectangle',
    )

    for (let i = 0; i < rectRooms.length; i++) {
      for (let j = i + 1; j < rectRooms.length; j++) {
        const a = rectRooms[i]
        const b = rectRooms[j]
        if (!a || !b) continue
        if (isRectanglesIntersecting(rectBoundsOfGeometry(a.geometry), rectBoundsOfGeometry(b.geometry))) {
          if (!conflicts.has(a.id)) conflicts.set(a.id, new Set())
          if (!conflicts.has(b.id)) conflicts.set(b.id, new Set())
          conflicts.get(a.id)!.add(b.id)
          conflicts.get(b.id)!.add(a.id)
        }
      }
    }

    return conflicts
  })

  function isRoomIntersecting(id: string): boolean {
    return (intersectingRoomIds.value.get(id)?.size ?? 0) > 0
  }

  function getIntersectingRoomNames(id: string): string[] {
    const conflictIds = intersectingRoomIds.value.get(id)
    if (!conflictIds || conflictIds.size === 0) return []
    return document.value.building.rooms
      .filter(room => conflictIds.has(room.id))
      .map(room => room.name)
  }

  // Карта opening.id -> набор id пересекающихся с ним проёмов (только в
  // пределах одной стены — на разных стенах пересечение геометрически
  // невозможно). Пересчитывается реактивно при любом изменении openings.
  const intersectingOpeningIds = computed<Map<string, Set<string>>>(() => {
    const conflicts = new Map<string, Set<string>>()
    const byWall = new Map<string, Opening[]>()
    for (const opening of document.value.building.openings) {
      const list = byWall.get(opening.wall_id) ?? []
      list.push(opening)
      byWall.set(opening.wall_id, list)
    }

    for (const wallOpenings of byWall.values()) {
      for (let i = 0; i < wallOpenings.length; i++) {
        for (let j = i + 1; j < wallOpenings.length; j++) {
          const a = wallOpenings[i]
          const b = wallOpenings[j]
          if (!a || !b) continue
          if (doOpeningsOverlap(a, b)) {
            if (!conflicts.has(a.id)) conflicts.set(a.id, new Set())
            if (!conflicts.has(b.id)) conflicts.set(b.id, new Set())
            conflicts.get(a.id)!.add(b.id)
            conflicts.get(b.id)!.add(a.id)
          }
        }
      }
    }

    return conflicts
  })

  function isOpeningIntersecting(id: string): boolean {
    return (intersectingOpeningIds.value.get(id)?.size ?? 0) > 0
  }

  function getIntersectingOpeningLabels(id: string): string[] {
    const conflictIds = intersectingOpeningIds.value.get(id)
    if (!conflictIds || conflictIds.size === 0) return []
    return document.value.building.openings
      .filter(opening => conflictIds.has(opening.id))
      .map(opening => (opening.type === 'door' ? 'Дверь' : 'Окно'))
  }

  function createBuilding(width: number, length: number) {
    document.value.building.dimensions.width = width
    document.value.building.dimensions.length = length

    if (document.value.building.floors.length === 0) {
      document.value.building.floors.push({
        id: nextId('floor', []),
        number: 1,
        elevation: 0,
        height: DEFAULT_FLOOR_HEIGHT,
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
        width: snapRoomSize(params.width),
        length: snapRoomSize(params.length),
        position: { x: 0, z: 0 },
        rotation: 0,
      },
    }

    document.value.building.rooms.push(room)
    selectedRoomId.value = room.id
    syncWalls()
  }

  function moveRoom(id: string, x: number, z: number) {
    const room = document.value.building.rooms.find(r => r.id === id)
    if (!room || room.geometry.type !== 'rectangle') return
    room.geometry.position.x = x
    room.geometry.position.z = z
    syncWalls()
  }

  function resizeRoom(id: string, width: number, length: number) {
    const room = document.value.building.rooms.find(r => r.id === id)
    if (!room || room.geometry.type !== 'rectangle') return
    // Отрицательные/нулевые значения не отклоняются, а поджимаются к минимуму
    // и привязываются к шагу сетки — единая точка правды по размеру комнаты.
    room.geometry.width = snapRoomSize(width)
    room.geometry.length = snapRoomSize(length)
    syncWalls()
  }

  function renameRoom(id: string, name: string) {
    const room = document.value.building.rooms.find(r => r.id === id)
    if (!room) return
    room.name = name
  }

  function removeRoom(id: string) {
    document.value.building.rooms = document.value.building.rooms.filter(r => r.id !== id)
    if (selectedRoomId.value === id) selectedRoomId.value = null
    syncWalls()
  }

  function selectRoom(id: string | null) {
    selectedRoomId.value = id
    if (id !== null) {
      selectedWallId.value = null
      selectedOpeningId.value = null
    }
  }

  function selectWall(id: string | null) {
    selectedWallId.value = id
    if (id !== null) {
      selectedRoomId.value = null
      selectedOpeningId.value = null
    }
  }

  function selectOpening(id: string | null) {
    selectedOpeningId.value = id
    if (id !== null) {
      selectedRoomId.value = null
      selectedWallId.value = null
    }
  }

  function clearSelection() {
    selectedRoomId.value = null
    selectedWallId.value = null
    selectedOpeningId.value = null
  }

  // "+ Дверь" / "+ Окно": переводит Plan2D в режим ожидания клика по стене.
  function beginPlacingOpening(type: OpeningType) {
    pendingOpeningType.value = type
    clearSelection()
  }

  function cancelPlacingOpening() {
    pendingOpeningType.value = null
  }

  // Создаёт дверь/окно примерно по центру указанной стены. Проём всегда
  // привязан к конкретной wall_id — "просто на плане" openings не бывает.
  function addOpening(type: OpeningType, wallId: string) {
    const wall = document.value.building.walls.find(w => w.id === wallId)
    if (!wall) return

    const wallLen = wallLength(wall)
    const rawWidth = type === 'door' ? DEFAULT_DOOR_WIDTH : DEFAULT_WINDOW_WIDTH
    const rawHeight = type === 'door' ? DEFAULT_DOOR_HEIGHT : DEFAULT_WINDOW_HEIGHT
    const rawBottom = type === 'door' ? 0 : DEFAULT_SILL_HEIGHT

    const width = clampOpeningWidth(rawWidth, wallLen)
    const height = clampOpeningHeight(rawHeight, wall.height)
    const offset = clampOpeningPosition((wallLen - width) / 2, width, wallLen)
    const bottom = clampSillHeight(rawBottom, height, wall.height)

    const opening: Opening = {
      id: nextId(type, document.value.building.openings.map(o => o.id)),
      type,
      wall_id: wall.id,
      dimensions: { width, height },
      position: { offset, bottom },
    }

    document.value.building.openings.push(opening)
    selectOpening(opening.id)
    syncCalculated()
  }

  // Плавное перемещение вдоль стены (используется во время drag) — только
  // clamp, без привязки к сетке. Финальный snap делает вызывающий код при
  // отпускании мыши, как и для комнат (moveRoom работает так же).
  // syncCalculated() здесь не нужен: позиция вдоль стены не входит ни в одну
  // формулу площади/статистики.
  function moveOpening(id: string, offset: number) {
    const opening = document.value.building.openings.find(o => o.id === id)
    if (!opening) return
    const wall = document.value.building.walls.find(w => w.id === opening.wall_id)
    if (!wall) return
    const wallLen = wallLength(wall)
    const maxOffset = Math.max(0, wallLen - opening.dimensions.width)
    opening.position.offset = Math.min(Math.max(offset, 0), maxOffset)
  }

  function resizeOpening(id: string, width: number, height: number) {
    const opening = document.value.building.openings.find(o => o.id === id)
    if (!opening) return
    const wall = document.value.building.walls.find(w => w.id === opening.wall_id)
    if (!wall) return

    const wallLen = wallLength(wall)
    opening.dimensions.width = clampOpeningWidth(width, wallLen)
    opening.dimensions.height = clampOpeningHeight(height, wall.height)
    // Ширина могла измениться — поджимаем позицию, чтобы проём не вылез за стену.
    opening.position.offset = clampOpeningPosition(opening.position.offset, opening.dimensions.width, wallLen)
    opening.position.bottom = clampSillHeight(opening.position.bottom, opening.dimensions.height, wall.height)
    syncCalculated()
  }

  function setOpeningSillHeight(id: string, bottom: number) {
    const opening = document.value.building.openings.find(o => o.id === id)
    if (!opening) return
    const wall = document.value.building.walls.find(w => w.id === opening.wall_id)
    if (!wall) return
    opening.position.bottom = clampSillHeight(bottom, opening.dimensions.height, wall.height)
  }

  function removeOpening(id: string) {
    document.value.building.openings = document.value.building.openings.filter(o => o.id !== id)
    if (selectedOpeningId.value === id) selectedOpeningId.value = null
    syncCalculated()
  }

  return {
    document,
    hasBuilding,
    selectedRoomId,
    selectedRoom,
    selectedWallId,
    selectedWall,
    selectedOpeningId,
    selectedOpening,
    pendingOpeningType,
    createBuilding,
    addRoom,
    moveRoom,
    resizeRoom,
    renameRoom,
    removeRoom,
    selectRoom,
    selectWall,
    selectOpening,
    clearSelection,
    beginPlacingOpening,
    cancelPlacingOpening,
    addOpening,
    moveOpening,
    resizeOpening,
    setOpeningSillHeight,
    removeOpening,
    isRoomIntersecting,
    getIntersectingRoomNames,
    isOpeningIntersecting,
    getIntersectingOpeningLabels,
  }
}
