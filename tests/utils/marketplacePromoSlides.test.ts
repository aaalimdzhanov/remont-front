import { describe, expect, it } from 'vitest'
import { MARKETPLACE_PROMO_SLIDES, nextPromoSlideIndex } from '~/utils/marketplacePromoSlides'

describe('MARKETPLACE_PROMO_SLIDES — content contract', () => {
  it('has exactly 3 slides', () => {
    expect(MARKETPLACE_PROMO_SLIDES).toHaveLength(3)
  })

  it('every slide has non-empty i18n keys and a real image path under public/banner (no blank slides)', () => {
    for (const slide of MARKETPLACE_PROMO_SLIDES) {
      expect(slide.eyebrowKey.length).toBeGreaterThan(0)
      expect(slide.titleKey.length).toBeGreaterThan(0)
      expect(slide.descriptionKey.length).toBeGreaterThan(0)
      expect(slide.imageAltKey.length).toBeGreaterThan(0)
      expect(slide.image).toMatch(/^\/banner\/banner-\d\.png$/)
    }
  })

  it('slide keys are unique (used as :key in v-for)', () => {
    const keys = MARKETPLACE_PROMO_SLIDES.map(s => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('slide image paths are unique (each slide shows a different photo)', () => {
    const images = MARKETPLACE_PROMO_SLIDES.map(s => s.image)
    expect(new Set(images).size).toBe(images.length)
  })
})

describe('nextPromoSlideIndex — cyclic autoplay advance', () => {
  it('advances to the next index', () => {
    expect(nextPromoSlideIndex(0, 3)).toBe(1)
    expect(nextPromoSlideIndex(1, 3)).toBe(2)
  })

  it('wraps back to 0 after the last slide', () => {
    expect(nextPromoSlideIndex(2, 3)).toBe(0)
  })

  it('returns 0 for an empty/invalid slide list (defensive)', () => {
    expect(nextPromoSlideIndex(0, 0)).toBe(0)
  })
})
