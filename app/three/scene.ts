// Three.js слой: базовая сцена (свет + сетка пола). Сама 3D-геометрия
// здания (комнаты/стены/проёмы) строится отдельно в buildingRenderer.ts —
// этот файл отвечает только за статическое окружение сцены, не за модель.

import * as THREE from 'three'

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xeef1f5)

  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)

  const directional = new THREE.DirectionalLight(0xffffff, 1.2)
  directional.position.set(8, 12, 6)
  scene.add(directional)

  return scene
}

// Размер сетки зависит от здания (не фиксированная гигантская сетка):
// берём наибольшую сторону + небольшой запас, округляя до целых метров.
export function createGridHelper(buildingWidth: number, buildingDepth: number): THREE.GridHelper {
  const margin = 4
  const size = Math.max(4, Math.ceil(Math.max(buildingWidth, buildingDepth) + margin))
  const grid = new THREE.GridHelper(size, size, 0xb9c1cc, 0xdfe3e8)
  grid.position.set(buildingWidth / 2, 0, buildingDepth / 2)
  return grid
}
