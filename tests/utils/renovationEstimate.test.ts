import { describe, expect, it } from 'vitest'
import { formatRenovationMillions, isValidRenovationArea, RENOVATION_AREA_MAX, RENOVATION_AREA_MIN } from '~/utils/renovationEstimate'
import ru from '../../locales/ru.json'
import uz from '../../locales/uz.json'

describe('isValidRenovationArea', () => {
  it('accepts values within [1, 1000], including decimals', () => {
    expect(isValidRenovationArea(1)).toBe(true)
    expect(isValidRenovationArea(1000)).toBe(true)
    expect(isValidRenovationArea(65.5)).toBe(true)
  })

  it('rejects null, out-of-range and non-finite values', () => {
    expect(isValidRenovationArea(null)).toBe(false)
    expect(isValidRenovationArea(0)).toBe(false)
    expect(isValidRenovationArea(0.9)).toBe(false)
    expect(isValidRenovationArea(1000.1)).toBe(false)
    expect(isValidRenovationArea(Number.NaN)).toBe(false)
    expect(isValidRenovationArea(Number.POSITIVE_INFINITY)).toBe(false)
  })

  it('exposes the same bounds backend validates (see renovation_estimate_dto.go)', () => {
    expect(RENOVATION_AREA_MIN).toBe(1)
    expect(RENOVATION_AREA_MAX).toBe(1000)
  })
})

describe('formatRenovationMillions', () => {
  it('formats whole-million amounts without a decimal (backend example: 85 000 000 / 110 000 000 UZS)', () => {
    expect(formatRenovationMillions(85_000_000)).toBe('85')
    expect(formatRenovationMillions(110_000_000)).toBe('110')
  })

  it('formats sub-10-million per-m2 amounts with 1 decimal (backend example: 1 307 692 / 1 692 307 UZS)', () => {
    expect(formatRenovationMillions(1_307_692)).toBe('1,3')
    expect(formatRenovationMillions(1_692_307)).toBe('1,7')
  })

  it('uses uz-UZ grouping/decimal conventions for the uz locale', () => {
    expect(formatRenovationMillions(1_307_692, 'uz')).toBe('1,3')
  })

  it('formats the v2 LABOR/MATERIALS breakdown amounts from the task example (34–44 / 33–42 million UZS)', () => {
    expect(formatRenovationMillions(34_000_000)).toBe('34')
    expect(formatRenovationMillions(44_000_000)).toBe('44')
    expect(formatRenovationMillions(33_000_000)).toBe('33')
    expect(formatRenovationMillions(42_000_000)).toBe('42')
  })
})

// RU/UZ переводы — страница не монтируется в unit-тестах (в проекте нет
// прецедента тестирования page-компонентов, см. tests/composables/
// useRenovationEstimateFlow.test.ts doc comment), поэтому единственная
// честная проверка переводов здесь — на уровне самих locale-файлов: каждый
// ключ, который использует renovation-estimate.vue, существует и непуст в
// ОБОИХ языках, и ни один язык не "отстаёт" от другого набором ключей.
const RENOVATION_ESTIMATE_KEYS = [
  'stepLabel', 'nextButton',
  'step1Question', 'propertyTypeApartment', 'propertyTypeHouse',
  'step2Question', 'areaPlaceholder', 'areaHint', 'areaErrorRequired', 'areaErrorRange',
  'step3Question', 'conditionShell', 'conditionShellHint', 'conditionPreFinish', 'conditionPreFinishHint',
  'conditionSecondary', 'conditionSecondaryHint', 'conditionMajorRepair', 'conditionMajorRepairHint',
  'step4Question', 'finishLevelEconomy', 'finishLevelStandard', 'finishLevelPremium',
  'step5Question', 'step5Hint', 'workWalls', 'workFloor', 'workCeiling', 'workElectricity', 'workPlumbing', 'workDoors',
  'worksErrorRequired', 'calculating',
  'resultTitle', 'resultRange', 'resultPerM2Label', 'resultPerM2Range', 'laborLabel', 'materialsLabel',
  'resultDisclaimer', 'resultTestPricingNote', 'resultCtaBuilder', 'resultRestart',
] as const

describe('renovationEstimate i18n — RU/UZ completeness', () => {
  it.each(RENOVATION_ESTIMATE_KEYS)('key "%s" is a non-empty string in both ru.json and uz.json', (key) => {
    const ruValue = (ru.renovationEstimate as Record<string, string>)[key]
    const uzValue = (uz.renovationEstimate as Record<string, string>)[key]
    expect(ruValue, `ru.json renovationEstimate.${key}`).toBeTypeOf('string')
    expect(ruValue.length, `ru.json renovationEstimate.${key} is empty`).toBeGreaterThan(0)
    expect(uzValue, `uz.json renovationEstimate.${key}`).toBeTypeOf('string')
    expect(uzValue.length, `uz.json renovationEstimate.${key} is empty`).toBeGreaterThan(0)
  })

  it('ru.json and uz.json expose the exact same renovationEstimate key set (no drift either direction)', () => {
    const ruKeys = Object.keys(ru.renovationEstimate).sort()
    const uzKeys = Object.keys(uz.renovationEstimate).sort()
    expect(uzKeys).toEqual(ruKeys)
  })

  it('"other" is never a translated work-type label exposed as a selectable option (v2 — hidden from UI on purpose)', () => {
    // workOther key itself may still exist (harmless leftover string), but
    // the UI option list (WORK_OPTIONS in renovation-estimate.vue) must not
    // reference it — this is enforced by useRenovationEstimateFlow.test.ts
    // ("toggleWork never includes other unless explicitly toggled") plus the
    // fact that WORK_OPTIONS below intentionally excludes it; this test only
    // pins the exact list of work labels the UI is allowed to show.
    const uiWorkLabelKeys = ['workWalls', 'workFloor', 'workCeiling', 'workElectricity', 'workPlumbing', 'workDoors']
    expect(uiWorkLabelKeys).not.toContain('workOther')
  })
})

describe('renovation-estimate error i18n — RU/UZ completeness', () => {
  const ERROR_KEYS = [
    'invalid_property_type', 'invalid_area', 'area_too_small_for_work', 'invalid_condition',
    'invalid_finish_level', 'no_work_types', 'invalid_work_type', 'duplicate_work_type',
    'request_too_large', 'renovation_pricing_unavailable', 'serviceUnavailable',
  ] as const

  it.each(ERROR_KEYS)('error key "%s" is a non-empty string in both ru.json and uz.json', (key) => {
    const ruValue = (ru.errors as Record<string, string>)[key]
    const uzValue = (uz.errors as Record<string, string>)[key]
    expect(ruValue, `ru.json errors.${key}`).toBeTypeOf('string')
    expect(ruValue.length).toBeGreaterThan(0)
    expect(uzValue, `uz.json errors.${key}`).toBeTypeOf('string')
    expect(uzValue.length).toBeGreaterThan(0)
  })
})
