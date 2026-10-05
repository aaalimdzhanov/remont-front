import { describe, expect, it } from 'vitest'
import { isMeaningfulDraft, loadDraftFromStorage, loadDraftSummary, saveDraftToStorage, syncDraftToStorage } from '~/utils/builderDraft'
import type { BuildingDocument } from '~/types/building'

// Тот же паттерн, что tests/utils/userMode.test.ts: под Vitest (environment:
// 'node', см. vitest.config.ts) нет window/localStorage — все storage-функции
// обязаны тихо no-op'ать/возвращать null, а не бросать. Реальное чтение/запись
// в localStorage этот пакет не тестирует (как и userMode.ts/authRedirect.ts) —
// единственный browser-зависимый путь в проекте, который это делает.
describe('builderDraft storage functions — safe outside a browser client context', () => {
  it('loadDraftFromStorage returns null under Vitest (no window/localStorage) instead of throwing', () => {
    expect(loadDraftFromStorage()).toBeNull()
  })

  it('loadDraftSummary returns null when there is nothing to read', () => {
    expect(loadDraftSummary()).toBeNull()
  })

  it('saveDraftToStorage / syncDraftToStorage do not throw when window is absent', () => {
    const doc = buildTestDocument(1)
    expect(() => saveDraftToStorage(doc)).not.toThrow()
    expect(() => syncDraftToStorage(doc)).not.toThrow()
  })
})

function buildTestDocument(roomCount: number): BuildingDocument {
  const building: BuildingDocument['building'] = {
    id: 'building-001',
    type: 'house',
    dimensions: { width: 8, length: 7 },
    floors: [{ id: 'f1', number: 0, elevation: 0, height: 3 }],
    rooms: Array.from({ length: roomCount }, (_, i) => ({
      id: `room-${i}`,
      floor_id: 'f1',
      name: `Комната ${i}`,
      type: 'other' as const,
      geometry: { type: 'rectangle' as const, width: 3, length: 3, position: { x: i * 3, z: 0 }, rotation: 0 },
    })),
    walls: [],
    openings: [],
    stairs: [],
    roof: null,
    elements: [],
  }

  return {
    schema: { name: 'remont-building', version: '1.0' },
    project: { id: 'project-001', name: 'Черновик', status: 'draft' },
    units: { length: 'm', area: 'm2', volume: 'm3', angle: 'deg' },
    building,
    work_requirements: [],
    calculated: {
      areas: { floor: roomCount * 9, ceiling: roomCount * 9, wallGross: 0, wallNet: 0 },
      openings: { doors: 0, windows: 0, total: 0 },
      statistics: { roomCount, wallCount: 0, doorCount: 0, windowCount: 0 },
      warnings: [],
    },
  }
}

// Чистая функция, без window — тестируется напрямую (см. задание "УПРОСТИТЬ
// ВЫХОД ИЗ GUEST BUILDER", Case A: "ничего не изменил → не создавать
// бессмысленный draft" — это и есть порог, по которому решается, что считать
// "ничего").
describe('isMeaningfulDraft — threshold for "worth offering as Продолжить план"', () => {
  it('is false for a document with zero rooms, even if the building shell was created (dimensions set)', () => {
    expect(isMeaningfulDraft(buildTestDocument(0))).toBe(false)
  })

  it('is true as soon as there is at least one room', () => {
    expect(isMeaningfulDraft(buildTestDocument(1))).toBe(true)
  })

  it('is true for multiple rooms', () => {
    expect(isMeaningfulDraft(buildTestDocument(3))).toBe(true)
  })
})
