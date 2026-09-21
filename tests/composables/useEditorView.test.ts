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
