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
import type { Building, Opening } from '~/types/building'
import { DEFAULT_FLOOR_HEIGHT } from '~/geometry/walls'
import { buildRoomFloorMesh } from '~/three/roomRenderer'
import { buildWallMeshes } from '~/three/wallRenderer'
import { buildDoorMeshes, buildWindowMeshes } from '~/three/openingRenderer'

export function buildBuildingGroup(building: Building): THREE.Group {
  const group = new THREE.Group()
  group.name = 'building'

  for (const room of building.rooms) {
    const floor = buildRoomFloorMesh(room)
    if (floor) group.add(floor)
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

// Bounding box здания в мировых координатах Three.js — источник и для
// размера сетки, и для автоподгонки камеры. Берём габариты здания и высоту
// первого этажа (или дефолтную) — этого достаточно для одноэтажной модели.
export function computeBuildingBoundingBox(building: Building): THREE.Box3 {
  const height = building.floors[0]?.height ?? DEFAULT_FLOOR_HEIGHT
  const width = Math.max(building.dimensions.width, 1)
  const depth = Math.max(building.dimensions.length, 1)
  return new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(width, height, depth))
}
