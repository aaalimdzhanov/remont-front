// Three.js слой: OrbitControls (вращение/зум/пан камеры мышью).

import type * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function createOrbitControls(camera: THREE.Camera, domElement: HTMLElement): OrbitControls {
  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.maxPolarAngle = Math.PI * 0.49 // не даём камере уйти под пол
  // Разумные значения по умолчанию до первого fitCameraToBuilding (там они
  // пересчитываются под размер конкретного здания) — не даём улететь на
  // километры или провалиться камерой в геометрию сразу после создания.
  controls.minDistance = 0.5
  controls.maxDistance = 200
  return controls
}
