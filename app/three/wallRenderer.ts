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

// Светлый нейтральный серо-белый интерьерный вид (не CAD-техническая
// серость): наружные стены чуть темнее внутренних перегородок для
// различимости, но обе остаются светлыми, без металлического блеска.
const EXTERIOR_COLOR = 0xdad4c8
const INTERIOR_COLOR = 0xf2efe7
const SELECTED_COLOR = 0xd68a1c
const MIN_FILLER_HEIGHT = 1e-3

function wallUserData(wall: Wall, color: number) {
  return { kind: 'wall', id: wall.id, baseColor: color, selectedColor: SELECTED_COLOR }
}

function boxMesh(
  width: number,
  height: number,
  depth: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  rotationY: number,
  material: THREE.Material,
  wall: Wall,
  color: number,
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(centerX, centerY, centerZ)
  mesh.rotation.y = rotationY
  mesh.userData = wallUserData(wall, color)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

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

  const rotationY = wallRotationY(wall)
  const color = wall.type === 'interior' ? INTERIOR_COLOR : EXTERIOR_COLOR
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 })

  const meshes: THREE.Mesh[] = []

  // Горизонтальные сегменты (слева/справа от проёмов) — стена на всю высоту
  // там, где вообще нет никакого проёма.
  for (const segment of segments) {
    const segmentLength = segment.to - segment.from
    const midpoint = pointAlongWall(wall, (segment.from + segment.to) / 2)
    meshes.push(boxMesh(
      segmentLength,
      wall.height,
      wall.thickness,
      midpoint.x,
      wall.height / 2,
      midpoint.z,
      rotationY,
      material.clone(),
      wall,
      color,
    ))
  }

  // splitWallByOpenings режет стену только ПО ДЛИНЕ — сам проём остаётся
  // сквозной дырой на всю высоту стены (от пола до потолка), а не только на
  // свою реальную высоту. Для двери это почти незаметно (она обычно почти
  // всей высоты), а для окна это выглядит как настоящая дыра в стене:
  // видно насквозь и над, и под рамой. Достраиваем для каждого проёма
  // узкие «простенок» (ниже подоконника) и «перемычку» (выше проёма)
  // сегменты той же ширины, что и сам проём.
  for (const opening of wallOpenings) {
    const openingWidth = opening.dimensions.width
    const sillHeight = opening.position.bottom
    const headerStart = opening.position.bottom + opening.dimensions.height
    const headerHeight = wall.height - headerStart
    const midpoint = pointAlongWall(wall, opening.position.offset + openingWidth / 2)

    if (sillHeight > MIN_FILLER_HEIGHT) {
      meshes.push(boxMesh(
        openingWidth,
        sillHeight,
        wall.thickness,
        midpoint.x,
        sillHeight / 2,
        midpoint.z,
        rotationY,
        material.clone(),
        wall,
        color,
      ))
    }

    if (headerHeight > MIN_FILLER_HEIGHT) {
      meshes.push(boxMesh(
        openingWidth,
        headerHeight,
        wall.thickness,
        midpoint.x,
        headerStart + headerHeight / 2,
        midpoint.z,
        rotationY,
        material.clone(),
        wall,
        color,
      ))
    }
  }

  return meshes
}
