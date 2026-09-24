import { describe, expect, it } from 'vitest'
import {
  countActiveRequestFilters,
  defaultRequestFilters,
  filterOpenRequests,
  formatMarketplaceDate,
  formatPrice,
  formatPriceRange,
  isPriceRangeValid,
  isValidPriceValue,
  contractorCardPriceLabel,
  contractorServicesLabel,
  filterContractorsByWorkType,
  formatLocation,
  marketplaceRequestStatusLabel,
  normalizePriceInput,
  offerStatusLabel,
  requestCardIcon,
  uniqueContractorWorkTypes,
} from '~/utils/marketplace'
import type { OpenMarketplaceRequest, PublicContractorProfile, PublicContractorService, WorkCategory, WorkType } from '~/api/types'

describe('marketplaceRequestStatusLabel', () => {
  it('maps all 4 real backend statuses, including draft (Draft → Publish v1, see domain/marketplacerequest)', () => {
    expect(marketplaceRequestStatusLabel('draft')).toBe('Черновик')
    expect(marketplaceRequestStatusLabel('open')).toBe('Опубликована')
    expect(marketplaceRequestStatusLabel('cancelled')).toBe('Отменена')
    expect(marketplaceRequestStatusLabel('closed')).toBe('Закрыта')
  })
})

describe('offerStatusLabel', () => {
  it('maps all 4 real backend statuses (see domain/marketplaceoffer)', () => {
    expect(offerStatusLabel('pending')).toBe('Ожидает ответа')
    expect(offerStatusLabel('accepted')).toBe('Принято')
    expect(offerStatusLabel('rejected')).toBe('Отклонено')
    expect(offerStatusLabel('withdrawn')).toBe('Отозвано')
  })
})

describe('formatPrice', () => {
  it('formats an integer price with thousands separators and currency suffix', () => {
    // ru-RU toLocaleString uses a narrow no-break space (U+202F) as the
    // thousands separator, not a plain space — match loosely on \s to avoid
    // depending on that exact character.
    expect(formatPrice(300000)).toMatch(/^300\s000 сум$/)
    expect(formatPrice(1500000)).toMatch(/^1\s500\s000 сум$/)
  })

  it('never introduces a decimal part, even if given a non-integer by mistake', () => {
    // price is always int64 on the backend — this just guards against a
    // stray float ever being displayed with a fraction.
    expect(formatPrice(300000.7)).toMatch(/^300\s001 сум$/)
  })
})

describe('formatMarketplaceDate', () => {
  it('formats an ISO date as a short human date', () => {
    expect(formatMarketplaceDate('2026-09-16T10:00:00Z')).toMatch(/16 сент/)
  })
})

describe('formatPriceRange — ContractorService price_from/price_to (both nullable on backend)', () => {
  it('shows "от X" when only price_from is set', () => {
    expect(formatPriceRange(150000, null)).toMatch(/^от 150\s000 сум$/)
  })

  it('shows "до X" when only price_to is set', () => {
    expect(formatPriceRange(null, 300000)).toMatch(/^до 300\s000 сум$/)
  })

  it('shows a range when both are set and differ', () => {
    expect(formatPriceRange(150000, 300000)).toMatch(/^150\s000 — 300\s000 сум$/)
  })

  it('collapses to a single price when price_from equals price_to', () => {
    expect(formatPriceRange(150000, 150000)).toMatch(/^150\s000 сум$/)
  })

  it('says price is unset when both are null', () => {
    expect(formatPriceRange(null, null)).toBe('Цена не указана')
  })
})

describe('price input normalization/validation — never float, never parseFloat', () => {
  it('normalizePriceInput rounds to an integer regardless of string/number input', () => {
    expect(normalizePriceInput('150000')).toBe(150000)
    expect(normalizePriceInput(150000.7)).toBe(150001)
    expect(normalizePriceInput('150000.4')).toBe(150000)
  })

  it('isValidPriceValue rejects negative values', () => {
    expect(isValidPriceValue(-1)).toBe(false)
    expect(isValidPriceValue('0')).toBe(true)
    expect(isValidPriceValue(150000)).toBe(true)
  })

  it('isPriceRangeValid enforces price_from >= 0, price_to >= 0, price_to >= price_from', () => {
    expect(isPriceRangeValid(null, null)).toBe(true) // both optional
    expect(isPriceRangeValid(150000, null)).toBe(true)
    expect(isPriceRangeValid(null, 300000)).toBe(true)
    expect(isPriceRangeValid(150000, 300000)).toBe(true)
    expect(isPriceRangeValid(300000, 150000)).toBe(false) // price_to < price_from
    expect(isPriceRangeValid(-1, null)).toBe(false)
  })
})

describe('filterOpenRequests — client-side only (endpoint takes no query params)', () => {
  const requests: OpenMarketplaceRequest[] = [
    { id: 'r1', workTypeId: 'wt-wall', workType: 'Поклейка обоев', quantity: 10, unit: 'm2', createdAt: '2026-09-10T10:00:00Z', location: null },
    { id: 'r2', workTypeId: 'wt-floor', workType: 'Укладка ламината', quantity: 40, unit: 'm2', createdAt: '2026-09-15T10:00:00Z', location: null },
    { id: 'r3', workTypeId: 'wt-wall', workType: 'Поклейка обоев', quantity: 25, unit: 'm2', createdAt: '2026-09-12T10:00:00Z', location: null },
  ]
  const categoryMap: Record<string, string> = { 'wt-wall': 'cat-walls', 'wt-floor': 'cat-floors' }

  it('filters by category using the work_type_id -> category_id map (OpenMarketplaceRequest itself has no category_id)', () => {
    const result = filterOpenRequests(requests, { ...defaultRequestFilters(), categoryId: 'cat-floors' }, categoryMap)
    expect(result.map(r => r.id)).toEqual(['r2'])
  })

  it('filters by exact work_type_id', () => {
    const result = filterOpenRequests(requests, { ...defaultRequestFilters(), workTypeId: 'wt-wall' }, categoryMap)
    expect(result.map(r => r.id).sort()).toEqual(['r1', 'r3'])
  })

  it('filters by quantity range', () => {
    const result = filterOpenRequests(requests, { ...defaultRequestFilters(), quantityMin: 20, quantityMax: 30 }, categoryMap)
    expect(result.map(r => r.id)).toEqual(['r3'])
  })

  it('sorts newest first by default, oldest first when requested', () => {
    const newest = filterOpenRequests(requests, defaultRequestFilters(), categoryMap)
    expect(newest.map(r => r.id)).toEqual(['r2', 'r3', 'r1'])
    const oldest = filterOpenRequests(requests, { ...defaultRequestFilters(), sort: 'oldest' }, categoryMap)
    expect(oldest.map(r => r.id)).toEqual(['r1', 'r3', 'r2'])
  })
})

describe('countActiveRequestFilters — badge count (sort is not a "filter")', () => {
  it('counts zero for defaults', () => {
    expect(countActiveRequestFilters(defaultRequestFilters())).toBe(0)
  })

  it('counts each set narrowing field, but not sort', () => {
    expect(countActiveRequestFilters({ categoryId: 'c1', workTypeId: null, quantityMin: null, quantityMax: null, sort: 'oldest' })).toBe(1)
    expect(countActiveRequestFilters({ categoryId: 'c1', workTypeId: 'w1', quantityMin: 1, quantityMax: 2, sort: 'newest' })).toBe(4)
  })
})

// requestCardIcon — Marketplace UI/UX v2: decorative per-card icon resolved
// from real backend fields (work_type_id -> WorkType.categoryId ->
// WorkCategory.slug), not guessed from free-text work_type names. Fixture
// slugs match the real seeded categories (see GET /api/v1/work-categories).
describe('requestCardIcon — resolves a decorative icon from real category slugs', () => {
  const categories: WorkCategory[] = [
    { id: 'cat-electrical', name: 'Электрика', slug: 'electrical', sortOrder: 5 },
    { id: 'cat-plumbing', name: 'Сантехника', slug: 'plumbing', sortOrder: 6 },
    { id: 'cat-unknown-slug', name: 'Что-то новое', slug: 'some-future-category', sortOrder: 9 },
  ]
  const workTypes: WorkType[] = [
    { id: 'wt-bolt', categoryId: 'cat-electrical', name: 'Электропроводка', slug: 'wiring', unit: 'm', measurementSource: 'fixed', quantityMode: 'manual', sortOrder: 1 },
    { id: 'wt-faucet', categoryId: 'cat-plumbing', name: 'Сантехника', slug: 'plumbing-work', unit: 'pcs', measurementSource: 'fixed', quantityMode: 'manual', sortOrder: 1 },
    { id: 'wt-future', categoryId: 'cat-unknown-slug', name: 'Новая работа', slug: 'future-work', unit: 'pcs', measurementSource: 'fixed', quantityMode: 'manual', sortOrder: 1 },
  ]

  it('maps a known category slug to its icon', () => {
    expect(requestCardIcon('wt-bolt', workTypes, categories)).toBe('bolt')
    expect(requestCardIcon('wt-faucet', workTypes, categories)).toBe('faucet')
  })

  it('falls back to "hammer" for a category slug with no mapping (e.g. a future backend category)', () => {
    expect(requestCardIcon('wt-future', workTypes, categories)).toBe('hammer')
  })

  it('falls back to "hammer" when the work_type_id is not in the (not-yet-loaded) catalog', () => {
    expect(requestCardIcon('wt-does-not-exist', workTypes, categories)).toBe('hammer')
  })

  it('falls back to "hammer" when the catalog is empty (e.g. loadFilterCatalog() still in flight)', () => {
    expect(requestCardIcon('wt-bolt', [], [])).toBe('hammer')
  })
})

// PublicContractorCard.vue helpers — «Мастера на платформе» v1.
describe('contractorServicesLabel', () => {
  const svc = (workType: string): PublicContractorService => ({ workTypeId: workType, workType, priceFrom: null, priceTo: null })

  it('returns null when there are no services (card hides the block entirely)', () => {
    expect(contractorServicesLabel([])).toBeNull()
  })

  it('joins up to 3 service names with " · ", no overflow suffix when there are exactly 3', () => {
    expect(contractorServicesLabel([svc('Электрика'), svc('Сантехника'), svc('Отделка')]))
      .toBe('Электрика · Сантехника · Отделка')
  })

  it('shows only the first 3 names plus a "+N" count when there are more', () => {
    const services = [svc('Электрика'), svc('Сантехника'), svc('Отделка'), svc('Плитка'), svc('Демонтаж')]
    expect(contractorServicesLabel(services)).toBe('Электрика · Сантехника · Отделка +2')
  })

  it('respects a custom max', () => {
    expect(contractorServicesLabel([svc('Электрика'), svc('Сантехника')], 1)).toBe('Электрика +1')
  })
})

describe('contractorCardPriceLabel', () => {
  it('returns null when there are no services at all', () => {
    expect(contractorCardPriceLabel([])).toBeNull()
  })

  it('returns null when the first service has neither priceFrom nor priceTo (does not fall back to formatPriceRange\'s "Цена не указана")', () => {
    expect(contractorCardPriceLabel([{ workTypeId: 'wt1', workType: 'Электрика', priceFrom: null, priceTo: null }])).toBeNull()
  })

  it('formats the first service\'s price range via the existing formatPriceRange', () => {
    // ru-RU toLocaleString uses a narrow no-break space (U+202F) as the
    // thousands separator — see formatPrice's own tests above for the same \s match.
    expect(contractorCardPriceLabel([{ workTypeId: 'wt1', workType: 'Электрика', priceFrom: 150000, priceTo: 300000 }]))
      .toMatch(/^150\s000 — 300\s000 сум$/)
  })

  it('uses only the FIRST service, ignoring later ones (backend has no single "contractor price")', () => {
    const services: PublicContractorService[] = [
      { workTypeId: 'wt1', workType: 'Электрика', priceFrom: 150000, priceTo: null },
      { workTypeId: 'wt2', workType: 'Сантехника', priceFrom: 999999, priceTo: null },
    ]
    expect(contractorCardPriceLabel(services)).toMatch(/^от 150\s000 сум$/)
  })
})

// «Мастера» tab client-side filter helpers (Marketplace Tabs v1).
describe('uniqueContractorWorkTypes', () => {
  const svc = (id: string, name: string): PublicContractorService => ({ workTypeId: id, workType: name, priceFrom: null, priceTo: null })
  const contractor = (id: string, services: PublicContractorService[]): PublicContractorProfile => ({
    id, name: `Contractor ${id}`, description: '', services, rating: null, reviewsCount: 0, location: null,
  })

  it('returns an empty list when there are no contractors', () => {
    expect(uniqueContractorWorkTypes([])).toEqual([])
  })

  it('dedupes work types shared by multiple contractors', () => {
    const contractors = [
      contractor('c1', [svc('wt1', 'Электрика'), svc('wt2', 'Сантехника')]),
      contractor('c2', [svc('wt1', 'Электрика')]),
    ]
    expect(uniqueContractorWorkTypes(contractors)).toEqual([
      { id: 'wt1', name: 'Электрика' },
      { id: 'wt2', name: 'Сантехника' },
    ])
  })

  it('never invents a work type nobody actually offers (only from real services, not the full catalog)', () => {
    const contractors = [contractor('c1', [])]
    expect(uniqueContractorWorkTypes(contractors)).toEqual([])
  })

  it('preserves first-seen order (no invented ranking/sorting)', () => {
    const contractors = [
      contractor('c1', [svc('wt-z', 'Я последний по алфавиту'), svc('wt-a', 'Я первый по алфавиту')]),
    ]
    expect(uniqueContractorWorkTypes(contractors).map(o => o.id)).toEqual(['wt-z', 'wt-a'])
  })
})

describe('filterContractorsByWorkType', () => {
  const svc = (id: string): PublicContractorService => ({ workTypeId: id, workType: `Type ${id}`, priceFrom: null, priceTo: null })
  const contractor = (id: string, services: PublicContractorService[]): PublicContractorProfile => ({
    id, name: `Contractor ${id}`, description: '', services, rating: null, reviewsCount: 0, location: null,
  })
  const contractors = [
    contractor('c1', [svc('wt1')]),
    contractor('c2', [svc('wt2')]),
    contractor('c3', [svc('wt1'), svc('wt2')]),
    contractor('c4', []),
  ]

  it('returns every contractor unchanged when no filter is selected (null)', () => {
    expect(filterContractorsByWorkType(contractors, null)).toEqual(contractors)
  })

  it('keeps only contractors offering the selected work type', () => {
    expect(filterContractorsByWorkType(contractors, 'wt1').map(c => c.id)).toEqual(['c1', 'c3'])
  })

  it('a contractor with no matching service (including no services at all) is excluded', () => {
    expect(filterContractorsByWorkType(contractors, 'wt2').map(c => c.id)).toEqual(['c2', 'c3'])
  })

  it('returns an empty array when nobody offers the selected work type', () => {
    expect(filterContractorsByWorkType(contractors, 'wt-does-not-exist')).toEqual([])
  })
})

// Location/Address v1 — formatLocation() presentation helper. Только реальный
// Location | null (city/district), никогда fallback-строк вроде "Адрес не
// указан" (см. задание: "НЕ придумывать значение").
describe('formatLocation', () => {
  it('joins city and district with a comma when both are present', () => {
    expect(formatLocation({ city: 'Ташкент', district: 'Юнусабад' })).toBe('Ташкент, Юнусабад')
  })

  it('returns only the city when district is empty', () => {
    expect(formatLocation({ city: 'Ташкент', district: '' })).toBe('Ташкент')
  })

  it('returns only the district when city is empty', () => {
    expect(formatLocation({ city: '', district: 'Юнусабад' })).toBe('Юнусабад')
  })

  it('returns null when location itself is null (no fake fallback text)', () => {
    expect(formatLocation(null)).toBeNull()
  })

  it('returns null when both city and district are empty', () => {
    expect(formatLocation({ city: '', district: '' })).toBeNull()
  })

  it('trims whitespace-only fields the same as empty', () => {
    expect(formatLocation({ city: '  ', district: 'Юнусабад' })).toBe('Юнусабад')
  })
})
