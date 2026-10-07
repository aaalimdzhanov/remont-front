import { beforeEach, describe, expect, it } from 'vitest'
import { resetShimState } from '../setup'
import { createEmptyBuildingDocument, useBuilding } from '~/composables/useBuilding'

beforeEach(() => {
  resetShimState()
})

// Единая snapshot-based история Building (не отдельные history per room/wall/
// opening — задание "UNDO/REDO В 2D BUILDER"). Каждый тест работает через
// публичный API useBuilding() — ровно так же, как вызывает его Plan2D/
// PropertiesPanel/Builder.vue, без заглядывания во внутренний historyPast/
// historyFuture (они не экспортируются намеренно, это editor state).
describe('useBuilding — undo/redo history', () => {
  it('1. initial state: canUndo=false, canRedo=false', () => {
    const { canUndo, canRedo } = useBuilding()
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })

  it('2. first mutation enables canUndo, canRedo stays false', () => {
    const { createBuilding, canUndo, canRedo } = useBuilding()
    createBuilding(10, 10)
    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(false)
  })

  it('3. undo restores the previous Building', () => {
    const { createBuilding, addRoom, undo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 3, length: 3 })
    expect(document.value.building.rooms).toHaveLength(1)
    undo()
    expect(document.value.building.rooms).toHaveLength(0)
  })

  it('4. redo restores the undone Building', () => {
    const { createBuilding, addRoom, undo, redo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 3, length: 3 })
    undo()
    redo()
    expect(document.value.building.rooms).toHaveLength(1)
  })

  it('5. a new mutation after undo clears redo', () => {
    const { createBuilding, addRoom, undo, canRedo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 3, length: 3 })
    undo()
    expect(canRedo.value).toBe(true)
    addRoom({ name: 'B', type: 'other', width: 2, length: 2 })
    expect(canRedo.value).toBe(false)
    expect(document.value.building.rooms.map(r => r.name)).toEqual(['B'])
  })

  it('6. multiple undo walks back through several states in order', () => {
    const { createBuilding, addRoom, undo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 3, length: 3 })
    addRoom({ name: 'B', type: 'other', width: 2, length: 2 })
    addRoom({ name: 'C', type: 'other', width: 2, length: 2 })
    undo()
    expect(document.value.building.rooms.map(r => r.name)).toEqual(['A', 'B'])
    undo()
    expect(document.value.building.rooms.map(r => r.name)).toEqual(['A'])
    undo()
    expect(document.value.building.rooms).toHaveLength(0)
  })

  it('7. multiple redo walks forward again in order', () => {
    const { createBuilding, addRoom, undo, redo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 3, length: 3 })
    addRoom({ name: 'B', type: 'other', width: 2, length: 2 })
    undo()
    undo()
    redo()
    expect(document.value.building.rooms.map(r => r.name)).toEqual(['A'])
    redo()
    expect(document.value.building.rooms.map(r => r.name)).toEqual(['A', 'B'])
  })

  it('8. history is capped — oldest entries are dropped once the limit is exceeded', () => {
    const { createBuilding, addRoom, undo, document } = useBuilding()
    createBuilding(10, 10)
    for (let i = 0; i < 60; i++) {
      addRoom({ name: `room-${i}`, type: 'other', width: 1, length: 1, position: { x: 0, z: 0 } })
    }
    // 61 мутаций всего (1 createBuilding + 60 addRoom) — лимит 50 истории
    // должен позволить ровно 50 успешных undo, не больше.
    let undoCount = 0
    for (let i = 0; i < 200; i++) {
      const before = document.value.building.rooms.length
      undo()
      if (document.value.building.rooms.length === before) break
      undoCount++
    }
    expect(undoCount).toBe(50)
  })

  it('9. deep clone — mutating the live Building after a mutation does not retroactively change the recorded snapshot', () => {
    const { createBuilding, addRoom, moveRoom, undo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 3, length: 3, position: { x: 0, z: 0 } })
    const roomId = document.value.building.rooms[0]!.id
    moveRoom(roomId, 2, 2) // records a "before" snapshot with position (0,0)

    const liveRoom = document.value.building.rooms[0]!
    if (liveRoom.geometry.type === 'rectangle') liveRoom.geometry.position.x = 999

    undo()
    const restored = document.value.building.rooms[0]!
    expect(restored.geometry.type === 'rectangle' && restored.geometry.position).toEqual({ x: 0, z: 0 })
  })

  it('10. room create: undo removes it, redo re-adds it unchanged', () => {
    const { createBuilding, addRoom, undo, redo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'Гостиная', type: 'living', width: 3, length: 4, position: { x: 0, z: 0 } })
    undo()
    expect(document.value.building.rooms).toHaveLength(0)
    redo()
    expect(document.value.building.rooms).toHaveLength(1)
    expect(document.value.building.rooms[0]!.name).toBe('Гостиная')
  })

  it('11. room resize: undo restores previous size, redo re-applies it', () => {
    const { createBuilding, addRoom, resizeRoom, undo, redo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 3, length: 3, position: { x: 0, z: 0 } })
    const roomId = document.value.building.rooms[0]!.id
    resizeRoom(roomId, 4, 5)

    undo()
    const afterUndo = document.value.building.rooms[0]!
    expect(afterUndo.geometry.type === 'rectangle' && afterUndo.geometry.width).toBe(3)
    expect(afterUndo.geometry.type === 'rectangle' && afterUndo.geometry.length).toBe(3)

    redo()
    const afterRedo = document.value.building.rooms[0]!
    expect(afterRedo.geometry.type === 'rectangle' && afterRedo.geometry.width).toBe(4)
    expect(afterRedo.geometry.type === 'rectangle' && afterRedo.geometry.length).toBe(5)
  })

  it('12. room move: undo restores previous position, redo re-applies it', () => {
    const { createBuilding, addRoom, moveRoom, undo, redo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 3, length: 3, position: { x: 0, z: 0 } })
    const roomId = document.value.building.rooms[0]!.id
    moveRoom(roomId, 2, 3)

    undo()
    const afterUndo = document.value.building.rooms[0]!
    expect(afterUndo.geometry.type === 'rectangle' && afterUndo.geometry.position).toEqual({ x: 0, z: 0 })

    redo()
    const afterRedo = document.value.building.rooms[0]!
    expect(afterRedo.geometry.type === 'rectangle' && afterRedo.geometry.position).toEqual({ x: 2, z: 3 })
  })

  it('13. door create: undo removes it, redo re-adds it, wall_id/dimensions intact', () => {
    const { createBuilding, addRoom, addOpening, undo, redo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 3, length: 3, position: { x: 0, z: 0 } })
    const wallId = document.value.building.walls[0]!.id
    addOpening('door', wallId)
    const created = document.value.building.openings[0]!

    undo()
    expect(document.value.building.openings).toHaveLength(0)

    redo()
    expect(document.value.building.openings).toHaveLength(1)
    const restored = document.value.building.openings[0]!
    expect(restored.type).toBe('door')
    expect(restored.wall_id).toBe(wallId)
    expect(restored.dimensions).toEqual(created.dimensions)
  })

  it('14. window create: undo removes it, redo re-adds it, wall_id/dimensions intact', () => {
    const { createBuilding, addRoom, addOpening, undo, redo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 3, length: 3, position: { x: 0, z: 0 } })
    const wallId = document.value.building.walls[0]!.id
    addOpening('window', wallId)
    const created = document.value.building.openings[0]!

    undo()
    expect(document.value.building.openings).toHaveLength(0)

    redo()
    expect(document.value.building.openings).toHaveLength(1)
    const restored = document.value.building.openings[0]!
    expect(restored.type).toBe('window')
    expect(restored.wall_id).toBe(wallId)
    expect(restored.dimensions).toEqual(created.dimensions)
  })

  it('15. opening move: undo restores previous offset, redo re-applies it', () => {
    const { createBuilding, addRoom, addOpening, moveOpening, undo, redo, document } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 4, length: 4, position: { x: 0, z: 0 } })
    const wallId = document.value.building.walls[0]!.id
    addOpening('window', wallId)
    const openingId = document.value.building.openings[0]!.id
    const initialOffset = document.value.building.openings[0]!.position.offset
    moveOpening(openingId, initialOffset + 0.5)

    undo()
    expect(document.value.building.openings[0]!.position.offset).toBeCloseTo(initialOffset)

    redo()
    expect(document.value.building.openings[0]!.position.offset).toBeCloseTo(initialOffset + 0.5)
  })

  it('16. a drag batch (beginHistoryBatch/commitHistoryBatch) creates exactly ONE history entry for the whole gesture, not one per moveRoom call', () => {
    const { createBuilding, addRoom, moveRoom, beginHistoryBatch, commitHistoryBatch, undo, document, canUndo, hasBuilding } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 2, length: 2, position: { x: 0, z: 0 } })
    const roomId = document.value.building.rooms[0]!.id

    beginHistoryBatch()
    moveRoom(roomId, 0.5, 0.5)
    moveRoom(roomId, 1, 1)
    moveRoom(roomId, 1.5, 1.5)
    moveRoom(roomId, 2, 2)
    commitHistoryBatch()

    const dragged = document.value.building.rooms[0]!
    expect(dragged.geometry.type === 'rectangle' && dragged.geometry.position).toEqual({ x: 2, z: 2 })

    // Один undo должен откатить ВЕСЬ drag целиком, а не один из 4 moveRoom.
    undo()
    const afterOneUndo = document.value.building.rooms[0]!
    expect(afterOneUndo.geometry.type === 'rectangle' && afterOneUndo.geometry.position).toEqual({ x: 0, z: 0 })

    // Если бы drag создал 4 отдельные записи, этот undo всё ещё откатывал бы
    // сам drag, а не addRoom.
    undo()
    expect(document.value.building.rooms).toHaveLength(0)

    undo()
    expect(hasBuilding.value).toBe(false)
    expect(canUndo.value).toBe(false)
  })

  it('17. an empty history batch (begin immediately followed by commit, no mutation inside) does not create a phantom history entry', () => {
    const { createBuilding, beginHistoryBatch, commitHistoryBatch, undo, hasBuilding } = useBuilding()
    createBuilding(10, 10)

    beginHistoryBatch()
    commitHistoryBatch()

    // Единственная реальная запись — createBuilding; один undo должен сразу
    // откатить к состоянию "здание ещё не создано", а не застрять на пустом батче.
    undo()
    expect(hasBuilding.value).toBe(false)
  })

  it('18. undo/redo bump documentRevision, so existing autosave watchers (guest draft + authenticated project) see the change with zero changes to persistence code', () => {
    const { createBuilding, addRoom, undo, redo, documentRevision } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 2, length: 2 })
    const revisionAfterMutations = documentRevision.value

    undo()
    expect(documentRevision.value).toBeGreaterThan(revisionAfterMutations)
    const revisionAfterUndo = documentRevision.value

    redo()
    expect(documentRevision.value).toBeGreaterThan(revisionAfterUndo)
  })

  it('19. loadDocument() resets history — Undo/Redo are disabled right after loading a different document', () => {
    const { createBuilding, addRoom, undo, loadDocument, canUndo, canRedo } = useBuilding()
    createBuilding(10, 10)
    addRoom({ name: 'A', type: 'other', width: 2, length: 2 })
    undo()
    expect(canRedo.value).toBe(true)

    loadDocument(createEmptyBuildingDocument())
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })

  it('20. a mutator call that is a no-op (invalid id, early return before touch()) does not create a history entry', () => {
    const { createBuilding, moveRoom, undo, hasBuilding } = useBuilding()
    createBuilding(10, 10)

    moveRoom('nonexistent-room', 1, 1) // early-return inside moveRoom, никогда не вызывает touch()

    // Если бы moveRoom всё равно записал snapshot, этого undo не хватило бы,
    // чтобы откатить до "здание ещё не создано" — нужен был бы второй undo.
    undo()
    expect(hasBuilding.value).toBe(false)
  })
})
