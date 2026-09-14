// Three.js слой: клик по 3D-объекту -> тот же selection, что и в 2D Builder
// (useBuilding().selectRoom/selectWall/selectOpening). Здесь нет отдельной
// 3D-системы выделения — только raycasting, читающий mesh.userData.{kind,id}
// и дергающий существующие composable-функции.

import * as THREE from 'three'

export type PickKind = 'room' | 'wall' | 'door' | 'window'

export interface PickResult {
  kind: PickKind
  id: string
}

interface SelectableUserData {
  kind: PickKind
  id: string
  baseColor: number
  selectedColor: number
}

function isSelectableMesh(object: THREE.Object3D): object is THREE.Mesh {
  return object instanceof THREE.Mesh && typeof object.userData?.id === 'string'
}

const raycaster = new THREE.Raycaster()

export function pickObjectAtPointer(
  event: PointerEvent,
  container: HTMLElement,
  camera: THREE.Camera,
  group: THREE.Group,
): PickResult | null {
  const rect = container.getBoundingClientRect()
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )

  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(group.children, true)
  const hit = hits.find(intersection => isSelectableMesh(intersection.object))
  if (!hit) return null

  const data = hit.object.userData as SelectableUserData
  return { kind: data.kind, id: data.id }
}

export function applySelectionHighlight(group: THREE.Group, selectedId: string | null): void {
  group.traverse((object) => {
    if (!isSelectableMesh(object)) return
    const data = object.userData as SelectableUserData
    const material = object.material as THREE.MeshStandardMaterial
    material.color.set(data.id === selectedId ? data.selectedColor : data.baseColor)
  })
}
