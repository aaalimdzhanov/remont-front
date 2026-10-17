import { describe, expect, it } from 'vitest'
import { availableWorkTypesForCategory, findInactiveServiceForWorkType } from '~/utils/contractorService'
import type { ContractorService, WorkType } from '~/api/types'

const wallsPlaster: WorkType = { id: 'wt1', categoryId: 'cat1', name: 'Штукатурка стен', slug: 'wall-plaster', unit: 'm2', measurementSource: 'wall_net_area', quantityMode: 'automatic', sortOrder: 0 }
const wallsWallpaper: WorkType = { id: 'wt2', categoryId: 'cat1', name: 'Поклейка обоев', slug: 'wallpaper', unit: 'm2', measurementSource: 'wall_net_area', quantityMode: 'automatic', sortOrder: 1 }
const floorLaminate: WorkType = { id: 'wt3', categoryId: 'cat2', name: 'Укладка ламината', slug: 'floor-laminate', unit: 'm2', measurementSource: 'floor_area', quantityMode: 'automatic', sortOrder: 0 }
const allWorkTypes = [wallsPlaster, wallsWallpaper, floorLaminate]

function service(overrides: Partial<ContractorService> = {}): ContractorService {
  return {
    id: 's1', workTypeId: 'wt1', workType: 'Штукатурка стен', unit: 'm2',
    priceFrom: 150000, priceTo: 300000, isActive: true, createdAt: 'c1', updatedAt: 'u1',
    ...overrides,
  }
}

describe('availableWorkTypesForCategory', () => {
  it('returns an empty list when no category is selected', () => {
    expect(availableWorkTypesForCategory(allWorkTypes, '', [])).toEqual([])
  })

  it('filters to the selected category only', () => {
    const result = availableWorkTypesForCategory(allWorkTypes, 'cat1', [])
    expect(result.map(w => w.id)).toEqual(['wt1', 'wt2'])
  })

  it('excludes work types that already have an ACTIVE service', () => {
    const result = availableWorkTypesForCategory(allWorkTypes, 'cat1', ['wt1'])
    expect(result.map(w => w.id)).toEqual(['wt2'])
  })

  // Ключевое поведение задания, секция 3: "не показывай отключённую услугу
  // как совершенно недоступную" — work type отключённой услуги НЕ
  // исключается здесь (только активные исключаются), иначе его нельзя было
  // бы выбрать для реактивации.
  it('does NOT exclude a work type whose service is merely inactive — it stays selectable (for reactivation)', () => {
    const result = availableWorkTypesForCategory(allWorkTypes, 'cat1', [/* wt1 not active */])
    expect(result.map(w => w.id)).toContain('wt1')
  })
})

describe('findInactiveServiceForWorkType', () => {
  it('returns null when no work type is selected', () => {
    expect(findInactiveServiceForWorkType([service({ isActive: false })], '')).toBeNull()
  })

  it('returns null when there is no inactive service for that work type (genuinely new)', () => {
    expect(findInactiveServiceForWorkType([], 'wt1')).toBeNull()
  })

  it('finds the matching inactive service by work_type_id — this is what switches the sheet into "reactivate" mode', () => {
    const inactive = service({ id: 's1', workTypeId: 'wt2', isActive: false })
    expect(findInactiveServiceForWorkType([inactive], 'wt2')).toEqual(inactive)
  })

  it('does not match a service for a different work type', () => {
    const inactive = service({ workTypeId: 'wt2', isActive: false })
    expect(findInactiveServiceForWorkType([inactive], 'wt1')).toBeNull()
  })
})
