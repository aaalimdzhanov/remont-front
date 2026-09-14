// Three.js слой: камера и подгонка её позиции под размер конкретного здания.
// Никогда не используем фиксированную позицию — она вычисляется из bounding
// box текущей модели, поэтому подходит для здания любого размера.

import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function createCamera(aspect: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000)
  camera.position.set(10, 10, 10)
  return camera
}

// Вычисляет позицию камеры так, чтобы весь bounding box был виден, и
// направляет OrbitControls на его центр. Заодно выставляет min/maxDistance
// от размера конкретного здания (не хардкод) — чтобы нельзя было улететь
// на километры или влезть камерой внутрь геометрии.
export function fitCameraToBuilding(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  box: THREE.Box3,
): void {
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  const maxDimension = Math.max(size.x, size.y, size.z, 1)
  const fovRadians = (camera.fov * Math.PI) / 180
  const distance = (maxDimension / (2 * Math.tan(fovRadians / 2))) * 1.6

  const direction = new THREE.Vector3(1, 0.85, 1).normalize()
  camera.position.copy(center).addScaledVector(direction, distance)
  camera.near = Math.max(0.1, distance / 100)
  camera.far = distance * 20
  camera.updateProjectionMatrix()

  controls.target.copy(center)
  controls.minDistance = Math.max(0.5, maxDimension * 0.15)
  controls.maxDistance = maxDimension * 6
  controls.update()
}
