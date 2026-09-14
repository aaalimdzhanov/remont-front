// Three.js слой: комната -> пол/потолок. Вся геометрия (позиция/размер)
// берётся напрямую из Building JSON, здесь только перевод в THREE-примитив.
// Координаты: Building x/z -> Three.js X/Z, Y = вертикаль (пол на Y=0).

import * as THREE from 'three'
import type { Room } from '~/types/building'

const FLOOR_THICKNESS = 0.05
const FLOOR_COLOR = 0xe4ded1
const FLOOR_SELECTED_COLOR = 0xc9dcae

const CEILING_THICKNESS = 0.05
const CEILING_COLOR = 0xf7f6f2

export function buildRoomFloorMesh(room: Room): THREE.Mesh | null {
  if (room.geometry.type !== 'rectangle') return null

  const { width, length, position } = room.geometry
  const geometry = new THREE.BoxGeometry(width, FLOOR_THICKNESS, length)
  const material = new THREE.MeshStandardMaterial({
    color: FLOOR_COLOR,
    roughness: 0.9,
    metalness: 0,
  })
  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.set(position.x + width / 2, -FLOOR_THICKNESS / 2, position.z + length / 2)
  mesh.userData = { kind: 'room', id: room.id, baseColor: FLOOR_COLOR, selectedColor: FLOOR_SELECTED_COLOR }
  mesh.receiveShadow = true

  return mesh
}

// Потолок — чисто визуальный режим просмотра (включается/выключается
// переключателем в Viewer3D.vue), в Building JSON не отражается и не
// участвует в selection — та же прямоугольная геометрия комнаты, только на
// высоте этажа вместо Y=0.
export function buildRoomCeilingMesh(room: Room, floorHeight: number): THREE.Mesh | null {
  if (room.geometry.type !== 'rectangle') return null

  const { width, length, position } = room.geometry
  const geometry = new THREE.BoxGeometry(width, CEILING_THICKNESS, length)
  const material = new THREE.MeshStandardMaterial({
    color: CEILING_COLOR,
    roughness: 0.95,
    metalness: 0,
  })
  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.set(position.x + width / 2, floorHeight + CEILING_THICKNESS / 2, position.z + length / 2)
  mesh.receiveShadow = true

  return mesh
}
