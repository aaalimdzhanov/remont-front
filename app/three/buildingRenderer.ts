// Three.js слой: Building JSON (building.rooms/walls/openings) -> THREE.Group.
// Единственная точка сборки 3D-модели: Viewer3D.vue не знает о комнатах,
// стенах и проёмах напрямую — только вызывает buildBuildingGroup() заново
// при каждом изменении Building JSON и подменяет содержимое группы.
//
// Первая версия намеренно простая: полная пересборка группы при любом
// изменении, а не точечное обновление отдельных mesh. Для текущего масштаба
// прототипа (десятки объектов) это дешевле, чем diff/патчинг, и не создаёт
// вторую систему хранения геометрии — вся истина остаётся в Building JSON.

import * as THREE from 'three'
import type { Building, Opening, Room } from '~/types/building'
import { DEFAULT_FLOOR_HEIGHT } from '~/geometry/walls'
import { buildRoomCeilingMesh, buildRoomFloorMesh } from '~/three/roomRenderer'
import { buildWallMeshes } from '~/three/wallRenderer'
import { buildDoorMeshes, buildWindowMeshes } from '~/three/openingRenderer'

export interface BuildBuildingGroupOptions {
  showCeiling: boolean
}

// Реальная высота этажа комнаты — та же величина, которой walls.ts уже
// пользуется при генерации стен (building.floors по room.floor_id, иначе
// DEFAULT_FLOOR_HEIGHT). Потолок держится на этой высоте, а не на отдельном
// собственном размере.
function roomFloorHeight(building: Building, room: Room): number {
  return building.floors.find(floor => floor.id === room.floor_id)?.height ?? DEFAULT_FLOOR_HEIGHT
}

export function buildBuildingGroup(building: Building, options: BuildBuildingGroupOptions): THREE.Group {
  const group = new THREE.Group()
  group.name = 'building'

  for (const room of building.rooms) {
    const floor = buildRoomFloorMesh(room)
    if (floor) group.add(floor)

    if (options.showCeiling) {
      const ceiling = buildRoomCeilingMesh(room, roomFloorHeight(building, room))
      if (ceiling) group.add(ceiling)
    }
  }

  const openingsByWall = new Map<string, Opening[]>()
  for (const opening of building.openings) {
    const list = openingsByWall.get(opening.wall_id) ?? []
    list.push(opening)
    openingsByWall.set(opening.wall_id, list)
  }

  for (const wall of building.walls) {
    const wallOpenings = openingsByWall.get(wall.id) ?? []
    for (const mesh of buildWallMeshes(wall, wallOpenings)) group.add(mesh)

    for (const opening of wallOpenings) {
      const objects = opening.type === 'door' ? buildDoorMeshes(wall, opening) : buildWindowMeshes(wall, opening)
      for (const object of objects) group.add(object)
    }
  }

  return group
}

// Освобождает GPU-ресурсы (geometry/material) всего поддерева — вызывается
// и при пересборке группы (перед заменой), и при unmount всей сцены.
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) material.dispose()
    }
  })
}

// Bounding box для автоподгонки камеры — источник для fitCameraToBuilding.
// Строим его из ФАКТИЧЕСКИХ комнат, а не из заявленного (при создании
// здания) периметра building.dimensions: комнаты почти никогда не заполняют
// весь этот периметр (обычно он намного больше и почти пуст), и подгонка по
// всему периметру уводила камеру далеко и под пологим углом — ровно
// настолько, что луч клика в центр небольшой комнаты в углу здания начинал
// проходить сквозь соседнюю стену раньше, чем достигал пола (подтверждено
// автотестом выбора объектов в 3D). Периметр используется только как
// запасной вариант, когда комнат ещё нет вообще (пустая сцена).
export function computeBuildingBoundingBox(building: Building): THREE.Box3 {
  const height = building.floors[0]?.height ?? DEFAULT_FLOOR_HEIGHT

  const box = new THREE.Box3()
  for (const room of building.rooms) {
    if (room.geometry.type !== 'rectangle') continue
    const { position, width, length } = room.geometry
    box.expandByPoint(new THREE.Vector3(position.x, 0, position.z))
    box.expandByPoint(new THREE.Vector3(position.x + width, height, position.z + length))
  }
  if (!box.isEmpty()) return box

  const width = Math.max(building.dimensions.width, 1)
  const depth = Math.max(building.dimensions.length, 1)
  return new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(width, height, depth))
}
