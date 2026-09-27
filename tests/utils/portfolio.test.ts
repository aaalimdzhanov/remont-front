import { describe, expect, it } from 'vitest'
import {
  isAllowedPortfolioImageType,
  isPortfolioDescriptionValid,
  isPortfolioImageSizeValid,
  isPortfolioTitleValid,
  moveItem,
  portfolioImageAlt,
  PORTFOLIO_MAX_DESCRIPTION_LENGTH,
  PORTFOLIO_MAX_IMAGE_BYTES,
  PORTFOLIO_MAX_TITLE_LENGTH,
  validatePortfolioImageFile,
} from '~/utils/portfolio'

function makeFile(name: string, type: string, size: number): File {
  const file = new File([new Uint8Array(size)], name, { type })
  return file
}

const t = (key: string) => key

describe('moveItem', () => {
  it('moves an item from one index to another, preserving the rest', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('does not mutate the original array', () => {
    const original = ['a', 'b', 'c']
    const result = moveItem(original, 0, 2)
    expect(original).toEqual(['a', 'b', 'c'])
    expect(result).not.toBe(original)
  })

  it('is a no-op when fromIndex equals toIndex', () => {
    const original = ['a', 'b', 'c']
    expect(moveItem(original, 1, 1)).toBe(original)
  })

  it('is a no-op for out-of-range indices (defensive, e.g. stale drag target)', () => {
    const original = ['a', 'b', 'c']
    expect(moveItem(original, -1, 1)).toBe(original)
    expect(moveItem(original, 0, 5)).toBe(original)
  })
})

describe('portfolioImageAlt', () => {
  it('uses the real title when filled in', () => {
    expect(portfolioImageAlt('Ремонт кухни', t)).toBe('Ремонт кухни')
  })

  it('trims whitespace', () => {
    expect(portfolioImageAlt('  Ремонт кухни  ', t)).toBe('Ремонт кухни')
  })

  it('falls back to a generic label when title is empty/whitespace — never a fabricated description', () => {
    expect(portfolioImageAlt('', t)).toBe('portfolio.defaultAlt')
    expect(portfolioImageAlt('   ', t)).toBe('portfolio.defaultAlt')
  })
})

// Лимиты — реальные backend-значения (см. domain/portfolio/portfolio_item.go
// MaxTitleLength/MaxDescriptionLength, portfolio_handler.go
// maxPortfolioImageBytes, application/portfolio/service.go
// AllowedImageContentTypes), не выдуманные.
describe('isAllowedPortfolioImageType', () => {
  it('accepts exactly jpeg/png/webp', () => {
    expect(isAllowedPortfolioImageType('image/jpeg')).toBe(true)
    expect(isAllowedPortfolioImageType('image/png')).toBe(true)
    expect(isAllowedPortfolioImageType('image/webp')).toBe(true)
  })

  it('rejects everything else, including other image types', () => {
    expect(isAllowedPortfolioImageType('image/gif')).toBe(false)
    expect(isAllowedPortfolioImageType('image/svg+xml')).toBe(false)
    expect(isAllowedPortfolioImageType('application/pdf')).toBe(false)
    expect(isAllowedPortfolioImageType('')).toBe(false)
  })
})

describe('isPortfolioImageSizeValid', () => {
  it('accepts sizes up to and including 10MB', () => {
    expect(isPortfolioImageSizeValid(1)).toBe(true)
    expect(isPortfolioImageSizeValid(PORTFOLIO_MAX_IMAGE_BYTES)).toBe(true)
  })

  it('rejects zero/negative and anything over 10MB', () => {
    expect(isPortfolioImageSizeValid(0)).toBe(false)
    expect(isPortfolioImageSizeValid(-1)).toBe(false)
    expect(isPortfolioImageSizeValid(PORTFOLIO_MAX_IMAGE_BYTES + 1)).toBe(false)
  })
})

describe('validatePortfolioImageFile', () => {
  it('returns null (valid) for an allowed type within the size limit', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024)
    expect(validatePortfolioImageFile(file, t)).toBeNull()
  })

  it('returns a human message for an unsupported type', () => {
    const file = makeFile('photo.gif', 'image/gif', 1024)
    expect(validatePortfolioImageFile(file, t)).toBe('errors.invalid_image_type')
  })

  it('returns a human message for an oversized file', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', PORTFOLIO_MAX_IMAGE_BYTES + 1)
    expect(validatePortfolioImageFile(file, t)).toBe('errors.image_too_large')
  })

  it('checks type before size (an unsupported oversized file reports the type error)', () => {
    const file = makeFile('photo.gif', 'image/gif', PORTFOLIO_MAX_IMAGE_BYTES + 1)
    expect(validatePortfolioImageFile(file, t)).toBe('errors.invalid_image_type')
  })
})

describe('isPortfolioTitleValid / isPortfolioDescriptionValid', () => {
  it('accepts up to the real backend limit', () => {
    expect(isPortfolioTitleValid('a'.repeat(PORTFOLIO_MAX_TITLE_LENGTH))).toBe(true)
    expect(isPortfolioDescriptionValid('a'.repeat(PORTFOLIO_MAX_DESCRIPTION_LENGTH))).toBe(true)
  })

  it('rejects one character past the limit', () => {
    expect(isPortfolioTitleValid('a'.repeat(PORTFOLIO_MAX_TITLE_LENGTH + 1))).toBe(false)
    expect(isPortfolioDescriptionValid('a'.repeat(PORTFOLIO_MAX_DESCRIPTION_LENGTH + 1))).toBe(false)
  })

  it('accepts empty strings — title/description are optional', () => {
    expect(isPortfolioTitleValid('')).toBe(true)
    expect(isPortfolioDescriptionValid('')).toBe(true)
  })
})
