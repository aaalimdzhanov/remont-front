// Three.js слой: дверь/окно -> простые 3D-объекты внутри уже вырезанного
// (через wallRenderer + splitWallByOpenings) проёма. wall_id используется
// только чтобы найти саму стену — дверь/окно всегда строятся относительно
// её геометрии (pointAlongWall/wallRotationY), а не собственных координат.

import * as THREE from 'three'
import type { Opening, Wall } from '~/types/building'
import { pointAlongWall } from '~/geometry/walls'
import { wallRotationY } from '~/three/wallRenderer'

const DOOR_COLOR = 0xb8955c
const WINDOW_FRAME_COLOR = 0x8a93a2
const WINDOW_GLASS_COLOR = 0xa8d8ea
const SELECTED_COLOR = 0xd68a1c

function openingMidpoint(wall: Wall, opening: Opening) {
  return pointAlongWall(wall, opening.position.offset + opening.dimensions.width / 2)
}

// Дверное полотно — один короткий бокс, занимающий проём от пола до верха
// двери (position.bottom для двери всегда 0).
export function buildDoorMeshes(wall: Wall, opening: Opening): THREE.Object3D[] {
  const { width, height } = opening.dimensions
  const midpoint = openingMidpoint(wall, opening)
  const rotationY = wallRotationY(wall)

  const geometry = new THREE.BoxGeometry(width * 0.92, height, Math.max(0.04, wall.thickness * 0.5))
  const material = new THREE.MeshStandardMaterial({ color: DOOR_COLOR })
  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.set(midpoint.x, height / 2, midpoint.z)
  mesh.rotation.y = rotationY
  mesh.userData = { kind: 'door', id: opening.id, baseColor: DOOR_COLOR, selectedColor: SELECTED_COLOR }

  return [mesh]
}

// Окно — простая рама (короб на всю толщину стены) со стеклом (тонкая
// полупрозрачная панель) поверх, на реальной высоте от пола (position.bottom).
export function buildWindowMeshes(wall: Wall, opening: Opening): THREE.Object3D[] {
  const { width, height } = opening.dimensions
  const midpoint = openingMidpoint(wall, opening)
  const rotationY = wallRotationY(wall)
  const centerY = opening.position.bottom + height / 2

  const group = new THREE.Group()
  group.position.set(midpoint.x, centerY, midpoint.z)
  group.rotation.y = rotationY

  const frameGeometry = new THREE.BoxGeometry(width, height, wall.thickness)
  const frameMaterial = new THREE.MeshStandardMaterial({ color: WINDOW_FRAME_COLOR })
  const frame = new THREE.Mesh(frameGeometry, frameMaterial)
  frame.userData = { kind: 'window', id: opening.id, baseColor: WINDOW_FRAME_COLOR, selectedColor: SELECTED_COLOR }
  group.add(frame)

  const glassGeometry = new THREE.BoxGeometry(
    Math.max(0.05, width - 0.1),
    Math.max(0.05, height - 0.1),
    Math.max(0.02, wall.thickness * 0.25),
  )
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: WINDOW_GLASS_COLOR,
    transparent: true,
    opacity: 0.45,
  })
  const glass = new THREE.Mesh(glassGeometry, glassMaterial)
  glass.userData = { kind: 'window', id: opening.id, baseColor: WINDOW_GLASS_COLOR, selectedColor: SELECTED_COLOR }
  group.add(glass)

  return [group]
}
