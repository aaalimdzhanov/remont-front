import { describe, expect, it } from 'vitest'
import {
  CONTRACTOR_PHOTO_MAX_BYTES,
  isAllowedContractorPhotoType,
  isContractorPhotoSizeValid,
  validateContractorPhotoFile,
} from '~/utils/contractorPhoto'

function makeFile(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type })
}

const t = (key: string) => key

describe('isAllowedContractorPhotoType', () => {
  it('allows jpeg/png/webp', () => {
    expect(isAllowedContractorPhotoType('image/jpeg')).toBe(true)
    expect(isAllowedContractorPhotoType('image/png')).toBe(true)
    expect(isAllowedContractorPhotoType('image/webp')).toBe(true)
  })

  it('rejects everything else, e.g. gif or html masquerading as an image', () => {
    expect(isAllowedContractorPhotoType('image/gif')).toBe(false)
    expect(isAllowedContractorPhotoType('text/html')).toBe(false)
  })
})

describe('isContractorPhotoSizeValid', () => {
  it('accepts sizes up to the 5MB backend limit', () => {
    expect(isContractorPhotoSizeValid(1)).toBe(true)
    expect(isContractorPhotoSizeValid(CONTRACTOR_PHOTO_MAX_BYTES)).toBe(true)
  })

  it('rejects zero/negative and over-limit sizes', () => {
    expect(isContractorPhotoSizeValid(0)).toBe(false)
    expect(isContractorPhotoSizeValid(CONTRACTOR_PHOTO_MAX_BYTES + 1)).toBe(false)
  })
})

describe('validateContractorPhotoFile', () => {
  it('returns null for a valid file', () => {
    expect(validateContractorPhotoFile(makeFile('a.jpg', 'image/jpeg', 1024), t)).toBeNull()
  })

  it('returns the shared portfolio-style type error for an unsupported type (same wording, no MB number)', () => {
    expect(validateContractorPhotoFile(makeFile('a.gif', 'image/gif', 1024), t)).toBe('errors.invalid_image_type')
  })

  it('returns the contractor-photo-specific 5MB size error, not the 10MB portfolio one', () => {
    const tooBig = makeFile('a.jpg', 'image/jpeg', CONTRACTOR_PHOTO_MAX_BYTES + 1)
    expect(validateContractorPhotoFile(tooBig, t)).toBe('contractorProfile.photoTooLarge')
  })
})
