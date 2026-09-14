// Three.js слой: WebGLRenderer + его привязка к размеру контейнера.
// Создаётся только на клиенте (вызывается из Viewer3D.vue внутри onMounted).

import * as THREE from 'three'

// Набор вариантов контекста от «идеального» к самому базовому. На части
// GPU-драйверов/рендер-пайплайнов браузера (например, при новых экспери-
// ментальных compositor-бэкендах) создание контекста с ОПРЕДЕЛЁННОЙ
// комбинацией атрибутов (antialias/preserveDrawingBuffer/alpha) может
// падать с "Error creating WebGL context", хотя WebGL в браузере в целом
// исправен — при этом более простой набор атрибутов отрабатывает нормально.
// Пробуем по очереди, а не гадаем один фиксированный набор заранее.
const CONTEXT_ATTEMPTS: THREE.WebGLRendererParameters[] = [
  { antialias: true, preserveDrawingBuffer: true, alpha: false },
  { antialias: true, preserveDrawingBuffer: true },
  { antialias: false, preserveDrawingBuffer: true },
  { antialias: false },
]

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  let lastError: unknown = null

  for (const options of CONTEXT_ATTEMPTS) {
    try {
      const renderer = new THREE.WebGLRenderer(options)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(container.clientWidth, container.clientHeight)
      // Базовые мягкие тени — сцена простая (десятки объектов), стоимость
      // на прототипном масштабе незначительная. Если это когда-нибудь
      // ощутимо просядет по производительности — отключить здесь одной строкой.
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      container.appendChild(renderer.domElement)
      return renderer
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Не удалось создать WebGL-контекст ни с одним набором опций')
}

export function resizeRendererToContainer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  container: HTMLElement,
): void {
  const width = Math.max(1, container.clientWidth)
  const height = Math.max(1, container.clientHeight)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
