// Three.js слой: базовая сцена (свет + сетка пола). Сама 3D-геометрия
// здания (комнаты/стены/проёмы) строится отдельно в buildingRenderer.ts —
// этот файл отвечает только за статическое окружение сцены, не за модель.

import * as THREE from 'three'

export interface SceneBundle {
  scene: THREE.Scene
  directionalLight: THREE.DirectionalLight
}

// Возвращаем directionalLight отдельно (не только внутри scene.children),
// чтобы Viewer3D.vue мог один раз настроить его shadow-камеру — сцене самой
// не нужно знать про тени, это ответственность рендер-слоя.
export function createScene(): SceneBundle {
  const scene = new THREE.Scene()
  // Светлый нейтральный фон — не белый (чтобы светлые стены/потолок не
  // сливались с ним и сохранялся контраст), не холодный технический CAD-серый.
  scene.background = new THREE.Color(0xe7e4dd)

  // HemisphereLight мягко подсвечивает интерьер снизу/сверху (имитация
  // рассеянного света из окон/от пола), чтобы внутренние поверхности не
  // выглядели совсем чёрными в тени от направленного света.
  const hemisphere = new THREE.HemisphereLight(0xf3f6fb, 0xd8cdb8, 0.65)
  scene.add(hemisphere)

  const ambient = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambient)

  // Мягкий рассеянный directional вместо жёсткого "полуденного" света —
  // ниже интенсивность и мягкая (PCFSoft) тень с небольшим radius, тени
  // читаемы, но не режут глаз резкими краями.
  const directional = new THREE.DirectionalLight(0xffffff, 0.75)
  directional.position.set(8, 12, 6)
  directional.castShadow = true
  directional.shadow.mapSize.set(1024, 1024)
  directional.shadow.camera.near = 1
  directional.shadow.camera.far = 60
  directional.shadow.camera.left = -25
  directional.shadow.camera.right = 25
  directional.shadow.camera.top = 25
  directional.shadow.camera.bottom = -25
  directional.shadow.bias = -0.0015
  directional.shadow.radius = 4
  scene.add(directional)

  return { scene, directionalLight: directional }
}

// Размер сетки зависит от здания (не фиксированная гигантская сетка):
// берём наибольшую сторону + небольшой запас, округляя до целых метров.
export function createGridHelper(buildingWidth: number, buildingDepth: number): THREE.GridHelper {
  const margin = 4
  const size = Math.max(4, Math.ceil(Math.max(buildingWidth, buildingDepth) + margin))
  const grid = new THREE.GridHelper(size, size, 0xcdd2d6, 0xe4e7e9)
  // Приглушаем сетку полупрозрачностью — она остаётся полезной для
  // ориентации по масштабу, но не спорит по контрасту со светлыми полом/
  // стенами (не должна выглядеть как техническая CAD-сетка).
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.5
  // Небольшое техническое смещение вниз по Y (не связано с координатами
  // модели) — без него линии сетки лежат ровно в той же плоскости, что и
  // верх пола (Y=0), и мерцают (z-fighting) при пересечении с ним.
  grid.position.set(buildingWidth / 2, -0.01, buildingDepth / 2)
  return grid
}
