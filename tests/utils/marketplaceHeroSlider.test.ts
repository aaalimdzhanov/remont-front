import { describe, expect, it } from 'vitest'
import {
  MARKETPLACE_HERO_SLIDES,
  resolveHeroSlideHref,
  resolveHeroSlideIndex,
} from '~/utils/marketplaceHeroSlider'

describe('MARKETPLACE_HERO_SLIDES — content contract (see задание "Marketplace Hero Slider v1")', () => {
  it('has exactly 3 slides', () => {
    expect(MARKETPLACE_HERO_SLIDES).toHaveLength(3)
  })

  it('slide 1 (contractor) is a "browse" action — scrolls the already-open /marketplace, not a link', () => {
    const slide = MARKETPLACE_HERO_SLIDES[0]!
    expect(slide.key).toBe('contractor')
    expect(slide.ctaLabelKey).toBe('marketplace.heroContractorCta')
    expect(slide.action).toEqual({ kind: 'browse' })
  })

  it('slide 2 (client) links to the real existing /projects flow, not a fabricated route', () => {
    const slide = MARKETPLACE_HERO_SLIDES[1]!
    expect(slide.key).toBe('client')
    expect(slide.ctaLabelKey).toBe('marketplace.heroClientCta')
    expect(slide.action).toEqual({ kind: 'link', to: '/projects' })
  })

  it('slide 3 (profile) links to the real existing /marketplace/contractor self-profile page', () => {
    const slide = MARKETPLACE_HERO_SLIDES[2]!
    expect(slide.key).toBe('profile')
    expect(slide.ctaLabelKey).toBe('marketplace.heroProfileCta')
    expect(slide.action).toEqual({ kind: 'link', to: '/marketplace/contractor' })
  })

  it('every slide has non-empty eyebrow/title/description/ctaLabel i18n keys and icon (no blank slides)', () => {
    for (const slide of MARKETPLACE_HERO_SLIDES) {
      expect(slide.eyebrowKey.length).toBeGreaterThan(0)
      expect(slide.titleKey.length).toBeGreaterThan(0)
      expect(slide.descriptionKey.length).toBeGreaterThan(0)
      expect(slide.ctaLabelKey.length).toBeGreaterThan(0)
      expect(slide.icon.length).toBeGreaterThan(0)
    }
  })

  it('slide keys are unique (used as :key in v-for)', () => {
    const keys = MARKETPLACE_HERO_SLIDES.map(s => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('resolveHeroSlideHref — existing auth flow reuse, no new auth logic', () => {
  it('returns null for a "browse" action regardless of auth state (no href — it is a @click, not a link)', () => {
    expect(resolveHeroSlideHref({ kind: 'browse' }, true)).toBeNull()
    expect(resolveHeroSlideHref({ kind: 'browse' }, false)).toBeNull()
  })

  it('authenticated users get the real destination directly', () => {
    expect(resolveHeroSlideHref({ kind: 'link', to: '/projects' }, true)).toBe('/projects')
    expect(resolveHeroSlideHref({ kind: 'link', to: '/marketplace/contractor' }, true)).toBe('/marketplace/contractor')
  })

  it('guests get the existing /auth/login redirect flow (same ?redirect= the AuthGate already uses)', () => {
    expect(resolveHeroSlideHref({ kind: 'link', to: '/projects' }, false)).toBe('/auth/login?redirect=%2Fprojects')
  })

  it('URL-encodes the redirect target', () => {
    expect(resolveHeroSlideHref({ kind: 'link', to: '/marketplace/contractor' }, false))
      .toBe('/auth/login?redirect=%2Fmarketplace%2Fcontractor')
  })
})

describe('resolveHeroSlideIndex — pagination dots synced to real scroll position', () => {
  it('rounds to the nearest slide index', () => {
    expect(resolveHeroSlideIndex(0, 390, 3)).toBe(0)
    expect(resolveHeroSlideIndex(390, 390, 3)).toBe(1)
    expect(resolveHeroSlideIndex(780, 390, 3)).toBe(2)
  })

  it('rounds a mid-swipe position to the nearest slide', () => {
    expect(resolveHeroSlideIndex(200, 390, 3)).toBe(1) // > half way to slide 1
    expect(resolveHeroSlideIndex(150, 390, 3)).toBe(0) // < half way
  })

  it('clamps overscroll past the last slide (iOS Safari rubber-banding) to the last valid index', () => {
    expect(resolveHeroSlideIndex(850, 390, 3)).toBe(2)
  })

  it('clamps a negative scrollLeft (rubber-banding at the start) to 0', () => {
    expect(resolveHeroSlideIndex(-40, 390, 3)).toBe(0)
  })

  it('returns 0 before the track has been laid out (slideWidth still 0)', () => {
    expect(resolveHeroSlideIndex(0, 0, 3)).toBe(0)
  })

  it('returns 0 for an empty slide list (defensive)', () => {
    expect(resolveHeroSlideIndex(0, 390, 0)).toBe(0)
  })
})
