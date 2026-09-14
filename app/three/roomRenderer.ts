// Three.js слой: комната -> пол. Вся геометрия (позиция/размер) берётся
// напрямую из Building JSON, здесь только перевод в THREE-примитив.
// Координаты: Building x/z -> Three.js X/Z, Y = вертикаль (пол на Y=0).

import * as THREE from 'three'
import type { Room } from '~/types/building'

const FLOOR_THICKNESS = 0.05
const FLOOR_COLOR = 0xcfe8ff
const FLOOR_SELECTED_COLOR = 0xa9d6ff

export function buildRoomFloorMesh(room: Room): THREE.Mesh | null {
  if (room.geometry.type !== 'rectangle') return null

  const { width, length, position } = room.geometry
  const geometry = new THREE.BoxGeometry(width, FLOOR_THICKNESS, length)
  const material = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR })
  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.set(position.x + width / 2, -FLOOR_THICKNESS / 2, position.z + length / 2)
  mesh.userData = { kind: 'room', id: room.id, baseColor: FLOOR_COLOR, selectedColor: FLOOR_SELECTED_COLOR }

  return mesh
}
