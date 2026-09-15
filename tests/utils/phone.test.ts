import { describe, expect, it } from 'vitest'
import { maskPhone } from '~/utils/phone'

describe('maskPhone', () => {
  it('masks the middle of a phone number, keeping country code and last digits visible', () => {
    expect(maskPhone('+998901234567')).toBe('+998 ** *** ** 67')
  })

  it('returns short/empty input unchanged rather than throwing', () => {
    expect(maskPhone('')).toBe('')
    expect(maskPhone('+998')).toBe('+998')
  })
})
