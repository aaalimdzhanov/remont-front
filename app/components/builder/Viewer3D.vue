<script setup lang="ts">
// Три.js работает только здесь и только на клиенте (компонент подключается
// через <ClientOnly> в Builder.vue). Building JSON остаётся единственным
// источником истины: эта сцена ничего не хранит сама, а перестраивается из
// document.building при любом его изменении и просто переиспользует ту же
// систему выделения (useBuilding().selectRoom/selectWall/selectOpening),
// что и 2D Builder — второй системы selection здесь нет.
import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createCamera, fitCameraToBuilding } from '~/three/camera'
import { createOrbitControls } from '~/three/controls'
import { createRenderer, resizeRendererToContainer } from '~/three/renderer'
import { createGridHelper, createScene } from '~/three/scene'
import { buildBuildingGroup, computeBuildingBoundingBox, disposeObject3D } from '~/three/buildingRenderer'
import { applySelectionHighlight, pickObjectAtPointer } from '~/three/selection'

const {
  document: buildingDocument,
  selectedRoomId,
  selectedWallId,
  selectedOpeningId,
  selectRoom,
  selectWall,
  selectOpening,
  clearSelection,
} = useBuilding()

const container = ref<HTMLDivElement | null>(null)
const hasRooms = computed(() => buildingDocument.value.building.rooms.length > 0)
const renderError = ref<string | null>(null)
// Чисто визуальный режим просмотра — Building JSON не меняется, поэтому
// это обычный ref компонента, а не поле в документе.
const showCeiling = ref(false)

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let buildingGroup: THREE.Group | null = null
let gridHelper: THREE.GridHelper | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrameId: number | null = null
let hasFitCameraOnce = false

function currentSelectedId(): string | null {
  return selectedRoomId.value ?? selectedWallId.value ?? selectedOpeningId.value
}

// Ошибка здесь (например, на какой-то нетипичной геометрии) не должна молча
// оставлять пользователя с пустым canvas: ловим её явно, показываем и не
// даём ей прервать остальной onMounted (иначе renderLoop() ниже вообще не
// запустится, и canvas не отрендерится ни разу).
function rebuildBuilding() {
  if (!scene) return

  try {
    if (buildingGroup) {
      scene.remove(buildingGroup)
      disposeObject3D(buildingGroup)
    }
    if (gridHelper) {
      scene.remove(gridHelper)
      gridHelper.dispose()
    }

    const building = buildingDocument.value.building
    buildingGroup = buildBuildingGroup(building, { showCeiling: showCeiling.value })
    scene.add(buildingGroup)

    gridHelper = createGridHelper(building.dimensions.width, building.dimensions.length)
    scene.add(gridHelper)

    applySelectionHighlight(buildingGroup, currentSelectedId())

    if (camera && controls && !hasFitCameraOnce) {
      fitCameraToBuilding(camera, controls, computeBuildingBoundingBox(building))
      hasFitCameraOnce = true
    }

    renderError.value = null
    exposeDebugHook()
  } catch (error) {
    renderError.value = error instanceof Error ? error.message : String(error)
    console.error('[Viewer3D] Не удалось построить 3D-сцену:', error)
  }
}

// Пересчитывает bounding box заново и подгоняет камеру — в отличие от
// автоподгонки в rebuildBuilding() (которая срабатывает один раз, чтобы не
// дёргать камеру при каждой правке), это явное действие пользователя.
function resetCamera() {
  if (!camera || !controls) return
  fitCameraToBuilding(camera, controls, computeBuildingBoundingBox(buildingDocument.value.building))
}

// Canvas нельзя проинспектировать через DOM — небольшой debug-хук на window
// облегчает автоматическое тестирование сцены (и отладку). Ни на что в
// приложении не влияет.
function exposeDebugHook() {
  if (!import.meta.dev) return
  ;(window as unknown as { __remontViewer3D?: unknown }).__remontViewer3D = {
    scene,
    camera,
    renderer,
    controls,
    buildingGroup,
    THREE,
    stopRenderLoop: () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
    },
  }
}

// render() может бросить не при сборке сцены, а именно тут (например, при
// первой лениво компилируемой шейдерной программе) — без try/catch такая
// ошибка повторялась бы на каждом кадре (десятки раз в секунду) и canvas
// оставался бы пустым без единого понятного сообщения.
function renderLoop() {
  animationFrameId = requestAnimationFrame(renderLoop)
  try {
    controls?.update()
    if (renderer && scene && camera) renderer.render(scene, camera)
  } catch (error) {
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
    animationFrameId = null
    renderError.value = error instanceof Error ? error.message : String(error)
    console.error('[Viewer3D] Ошибка рендера:', error)
  }
}

// Различаем клик (выделение объекта) и перетаскивание камеры (OrbitControls):
// если указатель сдвинулся заметно между down/up — это была орбита, не клик.
let pointerDownAt: { x: number, y: number } | null = null

function handlePointerDown(event: PointerEvent) {
  pointerDownAt = { x: event.clientX, y: event.clientY }
}

function handlePointerUp(event: PointerEvent) {
  const start = pointerDownAt
  pointerDownAt = null
  if (!start || !container.value || !camera || !buildingGroup) return

  const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
  if (moved > 5) return

  const result = pickObjectAtPointer(event, container.value, camera, buildingGroup)
  if (!result) {
    clearSelection()
    return
  }

  if (result.kind === 'room') selectRoom(result.id)
  else if (result.kind === 'wall') selectWall(result.id)
  else selectOpening(result.id)
}

onMounted(() => {
  if (!container.value) return

  // Если тут что-то бросит исключение (например, браузер/расширение
  // заблокировали WebGL) — не даём ему молча оборвать остаток onMounted
  // (тогда renderLoop() ниже вообще не запустится и canvas не отрисуется
  // ни разу, оставшись пустым без единого сообщения об ошибке).
  try {
    scene = createScene().scene
    camera = createCamera(container.value.clientWidth / Math.max(1, container.value.clientHeight))
    renderer = createRenderer(container.value)
    controls = createOrbitControls(camera, renderer.domElement)
  } catch (error) {
    renderError.value = error instanceof Error ? error.message : String(error)
    console.error('[Viewer3D] Не удалось инициализировать WebGL:', error)
    return
  }

  rebuildBuilding()
  renderLoop()

  container.value.addEventListener('pointerdown', handlePointerDown)
  container.value.addEventListener('pointerup', handlePointerUp)

  resizeObserver = new ResizeObserver(() => {
    if (container.value && renderer && camera) {
      resizeRendererToContainer(renderer, camera, container.value)
    }
  })
  resizeObserver.observe(container.value)
})

watch(
  () => buildingDocument.value.building,
  () => rebuildBuilding(),
  { deep: true },
)

watch(showCeiling, () => rebuildBuilding())

watch([selectedRoomId, selectedWallId, selectedOpeningId], () => {
  if (buildingGroup) applySelectionHighlight(buildingGroup, currentSelectedId())
})

onBeforeUnmount(() => {
  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
  resizeObserver?.disconnect()
  container.value?.removeEventListener('pointerdown', handlePointerDown)
  container.value?.removeEventListener('pointerup', handlePointerUp)

  if (buildingGroup) disposeObject3D(buildingGroup)
  if (gridHelper) gridHelper.dispose()
  controls?.dispose()

  if (renderer) {
    renderer.dispose()
    // Браузеры ограничивают число одновременных WebGL-контекстов на страницу
    // (обычно ~16). dispose() освобождает GPU-ресурсы, но не гарантирует
    // немедленное освобождение самого контекста — forceContextLoss() делает
    // это явно и сразу, что критично при частом переключении План/3D:
    // без этого повторные переключения могли бы исчерпать лимит контекстов,
    // и следующий Viewer3D перестал бы рендериться вообще.
    renderer.forceContextLoss()
    if (container.value?.contains(renderer.domElement)) {
      container.value.removeChild(renderer.domElement)
    }
  }

  scene = null
  camera = null
  renderer = null
  controls = null
  buildingGroup = null
  gridHelper = null

  if (import.meta.dev) {
    delete (window as unknown as { __remontViewer3D?: unknown }).__remontViewer3D
  }
})
</script>

<template>
  <div class="viewer3d-wrap">
    <div ref="container" class="viewer3d" />

    <div class="viewer3d__toolbar">
      <label class="viewer3d__toggle">
        <input v-model="showCeiling" type="checkbox">
        Потолок
      </label>
      <button type="button" class="viewer3d__reset-btn" @click="resetCamera">
        Сбросить камеру
      </button>
    </div>

    <div v-if="hasRooms" class="viewer3d__legend">
      <span class="viewer3d__legend-item"><i class="viewer3d__swatch viewer3d__swatch--wall" />Стены</span>
      <span class="viewer3d__legend-item"><i class="viewer3d__swatch viewer3d__swatch--door" />Двери</span>
      <span class="viewer3d__legend-item"><i class="viewer3d__swatch viewer3d__swatch--window" />Окна</span>
    </div>

    <p v-if="renderError" class="viewer3d__hint viewer3d__hint--error">
      Ошибка построения 3D-сцены: {{ renderError }}
    </p>
    <p v-else-if="!hasRooms" class="viewer3d__hint">
      Добавьте комнату для просмотра 3D
    </p>
  </div>
</template>

<style scoped>
.viewer3d-wrap {
  position: relative;
}

.viewer3d {
  width: 100%;
  height: 480px;
  border: 1px solid #e1e4ea;
  border-radius: 8px;
  overflow: hidden;
  background: #eef1f5;
  touch-action: none;
}

.viewer3d__hint {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  padding: 8px 16px;
  border-radius: 6px;
  background: rgba(31, 36, 48, 0.75);
  color: #fff;
  font-size: 14px;
  pointer-events: none;
  max-width: 80%;
  text-align: center;
}

.viewer3d__hint--error {
  background: rgba(224, 85, 79, 0.9);
}

.viewer3d__toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e1e4ea;
  box-shadow: 0 1px 3px rgba(31, 36, 48, 0.12);
}

.viewer3d__toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #3a4049;
  cursor: pointer;
  user-select: none;
}

.viewer3d__reset-btn {
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid #d6dae1;
  background: #fff;
  color: #3a4049;
  font-size: 12px;
  cursor: pointer;
}

.viewer3d__reset-btn:hover {
  background: #f2f4f7;
}

.viewer3d__legend {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e1e4ea;
  font-size: 12px;
  color: #5b6472;
  pointer-events: none;
}

.viewer3d__legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.viewer3d__swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.viewer3d__swatch--wall {
  background: #4b5563;
}

.viewer3d__swatch--door {
  background: #b8955c;
}

.viewer3d__swatch--window {
  background: #a8d8ea;
}
</style>
