import { describe, expect, it } from 'vitest'
import ru from '../../locales/ru.json'
import uz from '../../locales/uz.json'

// Страница/компоненты (ContractorServiceCard.vue/AddServiceSheet.vue/
// contractor.vue) не монтируются в тестах (environment: 'node', см. doc
// comment в useRenovationEstimateFlow.test.ts/OrderContractorCard.test.ts),
// поэтому перевод проверяется на уровне самих locale-файлов: ключ, которым
// пользуется UI управления услугами, должен существовать и быть непустым
// в ОБОИХ языках.
const CONTRACTOR_SERVICE_STATUS_KEYS = [
  'serviceDisabledBadge',
  'enableServiceAria',
  'disableServiceAria',
  'workTypeDisabledOption',
  'reactivateHint',
  'enableServiceSubmit',
  'noActiveServicesHint',
] as const

describe('contractor service status i18n — RU/UZ completeness', () => {
  it.each(CONTRACTOR_SERVICE_STATUS_KEYS)('contractorProfile.%s is a non-empty string in both ru.json and uz.json', (key) => {
    const ruValue = (ru.contractorProfile as Record<string, string>)[key]
    const uzValue = (uz.contractorProfile as Record<string, string>)[key]
    expect(ruValue, `ru.json contractorProfile.${key}`).toBeTypeOf('string')
    expect(ruValue.length, `ru.json contractorProfile.${key} is empty`).toBeGreaterThan(0)
    expect(uzValue, `uz.json contractorProfile.${key}`).toBeTypeOf('string')
    expect(uzValue.length, `uz.json contractorProfile.${key} is empty`).toBeGreaterThan(0)
  })

  it('{workType}/{price} interpolation placeholders are present in both languages (not accidentally dropped in translation)', () => {
    expect(ru.contractorProfile.enableServiceAria).toContain('{workType}')
    expect(uz.contractorProfile.enableServiceAria).toContain('{workType}')
    expect(ru.contractorProfile.disableServiceAria).toContain('{workType}')
    expect(uz.contractorProfile.disableServiceAria).toContain('{workType}')
    expect(ru.contractorProfile.workTypeDisabledOption).toContain('{workType}')
    expect(uz.contractorProfile.workTypeDisabledOption).toContain('{workType}')
    expect(ru.contractorProfile.reactivateHint).toContain('{price}')
    expect(uz.contractorProfile.reactivateHint).toContain('{price}')
  })

  it('the exact hint text from the task spec is present verbatim in ru.json', () => {
    expect(ru.contractorProfile.noActiveServicesHint).toBe(
      'Добавьте хотя бы одну активную услугу из действующего каталога, чтобы клиенты могли видеть ваш профиль',
    )
  })
})
