// Three.js слой: дверь/окно -> простые 3D-объекты внутри уже вырезанного
// (через wallRenderer + splitWallByOpenings) проёма. wall_id используется
// только чтобы найти саму стену — дверь/окно всегда строятся относительно
// её геометрии (pointAlongWall/wallRotationY), а не собственных координат.
//
// Обе функции возвращают THREE.Group с локальными осями: X — вдоль стены
// (направление wall.start -> wall.end), Y — вверх, Z — поперёк стены
// (перпендикулярно, «вглубь» помещения). Группа целиком позиционируется/
// поворачивается один раз, дети описываются в этих локальных координатах.

import * as THREE from 'three'
import type { DoorSwing, Opening, Wall } from '~/types/building'
import { pointAlongWall } from '~/geometry/walls'
import { wallRotationY } from '~/three/wallRenderer'

const DOOR_COLOR = 0xb8955c
const DOOR_JAMB_COLOR = 0x6b5b4a
const WINDOW_FRAME_COLOR = 0x8a93a2
const WINDOW_GLASS_COLOR = 0xa8d8ea
const SELECTED_COLOR = 0xd68a1c
const SWING_ARC_COLOR = 0x8a93a2

function openingMidpoint(wall: Wall, opening: Opening) {
  return pointAlongWall(wall, opening.position.offset + opening.dimensions.width / 2)
}

function selectableUserData(kind: 'door' | 'window', id: string, baseColor: number) {
  return { kind, id, baseColor, selectedColor: SELECTED_COLOR }
}

// Простая дуга открывания на полу — не анимация, а статичный маркер
// направления (как в 2D). Радиус берём равным ширине полотна двери.
function buildSwingArc(width: number, swing: DoorSwing | undefined): THREE.Line {
  const direction = swing?.direction ?? 'left'
  const radius = width * 0.92
  const hingeX = direction === 'left' ? -width / 2 : width / 2
  const sign = direction === 'left' ? 1 : -1

  const segments = 24
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * (Math.PI / 2)
    const x = hingeX + sign * radius * Math.cos(angle)
    const z = radius * Math.sin(angle)
    points.push(new THREE.Vector3(x, 0, z))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ color: SWING_ARC_COLOR, transparent: true, opacity: 0.6 })
  return new THREE.Line(geometry, material)
}

// Дверь: полотно + простая коробка (косяк с трёх сторон) + дуга открывания
// на полу. position.bottom для двери всегда 0, поэтому вся геометрия растёт
// от пола (локальный Y=0) до height.
export function buildDoorMeshes(wall: Wall, opening: Opening): THREE.Object3D[] {
  const { width, height } = opening.dimensions
  const midpoint = openingMidpoint(wall, opening)
  const rotationY = wallRotationY(wall)

  const group = new THREE.Group()
  group.position.set(midpoint.x, 0, midpoint.z)
  group.rotation.y = rotationY

  const jambBar = Math.min(0.06, width * 0.12, height * 0.06)

  const leafGeometry = new THREE.BoxGeometry(width * 0.92, height - jambBar, Math.max(0.04, wall.thickness * 0.5))
  const leafMaterial = new THREE.MeshStandardMaterial({ color: DOOR_COLOR, roughness: 0.6, metalness: 0.05 })
  const leaf = new THREE.Mesh(leafGeometry, leafMaterial)
  leaf.position.set(0, (height - jambBar) / 2, 0)
  leaf.userData = selectableUserData('door', opening.id, DOOR_COLOR)
  leaf.castShadow = true
  leaf.receiveShadow = true
  group.add(leaf)

  const jambMaterial = new THREE.MeshStandardMaterial({ color: DOOR_JAMB_COLOR, roughness: 0.8, metalness: 0 })

  const topJambGeometry = new THREE.BoxGeometry(width, jambBar, wall.thickness)
  const topJamb = new THREE.Mesh(topJambGeometry, jambMaterial.clone())
  topJamb.position.set(0, height - jambBar / 2, 0)
  topJamb.userData = selectableUserData('door', opening.id, DOOR_JAMB_COLOR)
  topJamb.castShadow = true
  topJamb.receiveShadow = true
  group.add(topJamb)

  const sideJambGeometry = new THREE.BoxGeometry(jambBar, height, wall.thickness)
  for (const side of [-1, 1]) {
    const sideJamb = new THREE.Mesh(sideJambGeometry, jambMaterial.clone())
    sideJamb.position.set(side * (width / 2 - jambBar / 2), height / 2, 0)
    sideJamb.userData = selectableUserData('door', opening.id, DOOR_JAMB_COLOR)
    sideJamb.castShadow = true
    sideJamb.receiveShadow = true
    group.add(sideJamb)
  }

  const arc = buildSwingArc(width, opening.swing)
  arc.position.y = 0.005 // чуть выше пола, чтобы не мерцать с ним (z-fighting)
  group.add(arc)

  return [group]
}

// Окно — полая рама (четыре бруска по периметру проёма, а не сплошной
// короб) со стеклом внутри «дыры»: раньше сплошная рама той же толщины,
// что и стена, полностью перекрывала стекло по глубине — снаружи было
// не видно ничего, кроме серого блока. Теперь стекло реально видно.
export function buildWindowMeshes(wall: Wall, opening: Opening): THREE.Object3D[] {
  const { width, height } = opening.dimensions
  const midpoint = openingMidpoint(wall, opening)
  const rotationY = wallRotationY(wall)
  const centerY = opening.position.bottom + height / 2

  const group = new THREE.Group()
  group.position.set(midpoint.x, centerY, midpoint.z)
  group.rotation.y = rotationY

  const frameBar = Math.min(0.06, width * 0.15, height * 0.15)
  const frameMaterial = new THREE.MeshStandardMaterial({ color: WINDOW_FRAME_COLOR, roughness: 0.7, metalness: 0.1 })

  const horizontalGeometry = new THREE.BoxGeometry(width, frameBar, wall.thickness)
  for (const side of [-1, 1]) {
    const bar = new THREE.Mesh(horizontalGeometry, frameMaterial.clone())
    bar.position.set(0, side * (height / 2 - frameBar / 2), 0)
    bar.userData = selectableUserData('window', opening.id, WINDOW_FRAME_COLOR)
    bar.castShadow = true
    bar.receiveShadow = true
    group.add(bar)
  }

  const verticalGeometry = new THREE.BoxGeometry(frameBar, height - 2 * frameBar, wall.thickness)
  for (const side of [-1, 1]) {
    const bar = new THREE.Mesh(verticalGeometry, frameMaterial.clone())
    bar.position.set(side * (width / 2 - frameBar / 2), 0, 0)
    bar.userData = selectableUserData('window', opening.id, WINDOW_FRAME_COLOR)
    bar.castShadow = true
    bar.receiveShadow = true
    group.add(bar)
  }

  const glassGeometry = new THREE.BoxGeometry(
    Math.max(0.05, width - 2 * frameBar),
    Math.max(0.05, height - 2 * frameBar),
    Math.max(0.02, wall.thickness * 0.25),
  )
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: WINDOW_GLASS_COLOR,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0,
  })
  const glass = new THREE.Mesh(glassGeometry, glassMaterial)
  glass.userData = selectableUserData('window', opening.id, WINDOW_GLASS_COLOR)
  // Тень от полупрозрачного стекла в shadow map выглядит как от сплошного
  // объекта (карта теней не учитывает opacity) — специально не отбрасываем.
  glass.castShadow = false
  group.add(glass)

  return [group]
}
