import { beforeEach, describe, expect, it } from 'vitest'
import { resetShimState } from '../setup'
import { useEditorView } from '~/composables/useEditorView'

beforeEach(() => {
  resetShimState()
})

describe('useEditorView — dimensions toggle (used by both the "Размеры" button and the M shortcut)', () => {
  it('showDimensions starts visible by default', () => {
    const { showDimensions } = useEditorView()
    expect(showDimensions.value).toBe(true)
  })

  it('toggleDimensions() flips the shared state', () => {
    const { showDimensions, toggleDimensions } = useEditorView()
    toggleDimensions()
    expect(showDimensions.value).toBe(false)
    toggleDimensions()
    expect(showDimensions.value).toBe(true)
  })

  it('click ("Размеры" button) and keyboard (M) drive the exact same state, not two independent ones', () => {
    // Builder.vue calls useEditorView() once and wires BOTH the button's
    // @click and the keydown handler's case 'm'/'M' to the same
    // toggleDimensions reference — simulated here by two separate
    // useEditorView() calls (as if two different consumers), which must
    // still observe the same underlying useState.
    const buttonSide = useEditorView()
    const keyboardSide = useEditorView()

    expect(keyboardSide.showDimensions.value).toBe(true)

    buttonSide.toggleDimensions() // simulates a click on "Размеры"
    expect(keyboardSide.showDimensions.value).toBe(false) // seen immediately from the "keyboard" side too

    keyboardSide.toggleDimensions() // simulates pressing M
    expect(buttonSide.showDimensions.value).toBe(true) // and vice versa
  })
})

// 3D = view mode (см. задание "ИСПРАВИТЬ UX BUILDER В РЕЖИМЕ 3D"): Builder.vue
// вызывает deactivateRoomDraw() (как часть activateSelectTool()) на КАЖДОЕ
// переключение viewMode — что в 2D→3D, что обратно 3D→2D, см.
// `watch(viewMode, activateSelectTool)`. Здесь — не сам watch (это
// template-уровень Builder.vue, недоступный без mount), а гарантия,
// которую этот watch использует: что deactivateRoomDraw() реально
// сбрасывает roomDrawActive, откуда бы его ни вызвали.
describe('useEditorView — roomDrawActive (room draw mode, reset when leaving 2D edit tools)', () => {
  it('starts inactive', () => {
    const { roomDrawActive } = useEditorView()
    expect(roomDrawActive.value).toBe(false)
  })

  it('activateRoomDraw() turns it on, deactivateRoomDraw() turns it back off', () => {
    const { roomDrawActive, activateRoomDraw, deactivateRoomDraw } = useEditorView()
    activateRoomDraw()
    expect(roomDrawActive.value).toBe(true)
    deactivateRoomDraw()
    expect(roomDrawActive.value).toBe(false)
  })

  it('deactivateRoomDraw() is a safe no-op when room draw was never active (e.g. already in Select)', () => {
    const { roomDrawActive, deactivateRoomDraw } = useEditorView()
    expect(roomDrawActive.value).toBe(false)
    deactivateRoomDraw()
    expect(roomDrawActive.value).toBe(false)
  })
})
