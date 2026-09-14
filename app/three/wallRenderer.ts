// Three.js слой: стена -> набор BoxGeometry. Стена не предполагается строго
// горизонтальной/вертикальной: длина, позиция и поворот вычисляются из
// произвольных start/end через существующие geometry-функции (не дублируем
// вычисления здесь).
//
// Проёмы вырезаются не CSG-операцией, а сегментированием — используем ту же
// splitWallByOpenings, что и 2D Builder, поэтому 2D и 3D физически не могут
// разойтись в том, где именно стена сплошная.

import * as THREE from 'three'
import type { Opening, Wall } from '~/types/building'
import { pointAlongWall, wallLength } from '~/geometry/walls'
import { splitWallByOpenings } from '~/geometry/openings'

const EXTERIOR_COLOR = 0x4b5563
const INTERIOR_COLOR = 0x9aa3af
const SELECTED_COLOR = 0xd68a1c

// Угол поворота вокруг Y, при котором локальная ось X бокса (его «длина»)
// совпадает с направлением start -> end.
export function wallRotationY(wall: Wall): number {
  const dx = wall.end.x - wall.start.x
  const dz = wall.end.z - wall.start.z
  return -Math.atan2(dz, dx)
}

export function buildWallMeshes(wall: Wall, wallOpenings: Opening[]): THREE.Mesh[] {
  const length = wallLength(wall)
  const segments = splitWallByOpenings(length, wallOpenings)
  if (segments.length === 0) return []

  const rotationY = wallRotationY(wall)
  const color = wall.type === 'interior' ? INTERIOR_COLOR : EXTERIOR_COLOR
  const material = new THREE.MeshStandardMaterial({ color })

  return segments.map((segment) => {
    const segmentLength = segment.to - segment.from
    const geometry = new THREE.BoxGeometry(segmentLength, wall.height, wall.thickness)
    const mesh = new THREE.Mesh(geometry, material.clone())

    const midpoint = pointAlongWall(wall, (segment.from + segment.to) / 2)
    mesh.position.set(midpoint.x, wall.height / 2, midpoint.z)
    mesh.rotation.y = rotationY
    mesh.userData = { kind: 'wall', id: wall.id, baseColor: color, selectedColor: SELECTED_COLOR }

    return mesh
  })
}
