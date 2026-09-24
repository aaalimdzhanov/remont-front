import { describe, expect, it } from 'vitest'
import { districtsForCity, LOCATION_CATALOG, LOCATION_CITIES, setLocationCity, setLocationDistrict } from '~/utils/location'

describe('LOCATION_CATALOG', () => {
  it('every city has a non-empty district list', () => {
    for (const entry of LOCATION_CATALOG) {
      expect(entry.city.length).toBeGreaterThan(0)
      expect(entry.districts.length).toBeGreaterThan(0)
    }
  })

  it('LOCATION_CITIES matches the catalog city order 1:1', () => {
    expect(LOCATION_CITIES).toEqual(LOCATION_CATALOG.map(e => e.city))
  })

  it('Ташкент has real districts (not a single generic placeholder)', () => {
    expect(districtsForCity('Ташкент').length).toBeGreaterThan(1)
    expect(districtsForCity('Ташкент')).toContain('Юнусабадский')
  })
})

describe('districtsForCity', () => {
  it('returns the districts for a known city', () => {
    expect(districtsForCity('Самарканд')).toEqual(['Центр'])
  })

  it('returns an empty array for an unknown/empty city — no district can be selected without a city', () => {
    expect(districtsForCity('')).toEqual([])
    expect(districtsForCity('Атлантида')).toEqual([])
  })
})

describe('setLocationCity — city selection (задание, секция VALIDATION)', () => {
  it('a chosen city produces a Location with an empty district', () => {
    expect(setLocationCity('Ташкент')).toEqual({ city: 'Ташкент', district: '' })
  })

  it('clearing the city (empty string) collapses to null — no district without a city', () => {
    expect(setLocationCity('')).toBeNull()
  })
})

describe('setLocationDistrict', () => {
  it('sets the district once a city is present', () => {
    const withCity = setLocationCity('Ташкент')
    expect(setLocationDistrict(withCity, 'Юнусабадский')).toEqual({ city: 'Ташкент', district: 'Юнусабадский' })
  })

  it('is a no-op when there is no city yet (district cannot exist without a city)', () => {
    expect(setLocationDistrict(null, 'Юнусабадский')).toBeNull()
  })

  it('changing the city resets any previously chosen district — never {city: "Самарканд", district: "Юнусабадский"}', () => {
    const tashkentWithDistrict = setLocationDistrict(setLocationCity('Ташкент'), 'Юнусабадский')
    const switchedToSamarkand = setLocationCity('Самарканд')
    expect(switchedToSamarkand).toEqual({ city: 'Самарканд', district: '' })
    expect(switchedToSamarkand).not.toEqual({ city: 'Самарканд', district: 'Юнусабадский' })
    // sanity: the earlier value is untouched (setLocationCity does not mutate)
    expect(tashkentWithDistrict).toEqual({ city: 'Ташкент', district: 'Юнусабадский' })
  })
})
