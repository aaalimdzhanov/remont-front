import { describe, expect, it } from 'vitest'
import {
  contractorRatingLabel,
  findMyReview,
  isValidCommentLength,
  isValidRating,
  normalizeReviewComment,
  otherReviewRole,
  resolveReviewAuthorRole,
  reviewRoleLabel,
  reviewsCountLabel,
} from '~/utils/review'
import type { Order, Review } from '~/api/types'

describe('isValidRating — 1 <= rating <= 5, integer', () => {
  it('accepts rating 1 (minimum)', () => {
    expect(isValidRating(1)).toBe(true)
  })

  it('accepts rating 5 (maximum)', () => {
    expect(isValidRating(5)).toBe(true)
  })

  it('rejects invalid ratings: 0, 6, negative, non-integer', () => {
    expect(isValidRating(0)).toBe(false)
    expect(isValidRating(6)).toBe(false)
    expect(isValidRating(-1)).toBe(false)
    expect(isValidRating(3.5)).toBe(false)
  })
})

describe('isValidCommentLength — 0..2000 chars, empty allowed', () => {
  it('accepts an empty comment (rating is required, comment is not)', () => {
    expect(isValidCommentLength('')).toBe(true)
  })

  it('accepts exactly 2000 characters', () => {
    expect(isValidCommentLength('a'.repeat(2000))).toBe(true)
  })

  it('rejects 2001 characters', () => {
    expect(isValidCommentLength('a'.repeat(2001))).toBe(false)
  })
})

describe('normalizeReviewComment — empty/whitespace-only -> null (backend stores *string)', () => {
  it('trims and keeps a real comment', () => {
    expect(normalizeReviewComment('  Отличная работа!  ')).toBe('Отличная работа!')
  })

  it('normalizes an empty string to null', () => {
    expect(normalizeReviewComment('')).toBeNull()
  })

  it('normalizes a whitespace-only string to null', () => {
    expect(normalizeReviewComment('   \n\t  ')).toBeNull()
  })
})

const t = (key: string) => key

describe('contractorRatingLabel — backend aggregate is the source of truth, never recomputed', () => {
  it('reviews_count === 0 -> resolves reviews.noneYet (см. задание секция 13)', () => {
    expect(contractorRatingLabel(null, 0, t)).toBe('reviews.noneYet')
  })

  it('rating === null but reviews_count > 0 (defensive edge case) -> resolves reviews.none', () => {
    expect(contractorRatingLabel(null, 3, t)).toBe('reviews.none')
  })

  it('a real rating formats to one decimal place (no i18n needed for a number)', () => {
    expect(contractorRatingLabel(4.8, 12, t)).toBe('4.8')
    expect(contractorRatingLabel(5, 1, t)).toBe('5.0')
  })
})

describe('reviewsCountLabel — delegates pluralization to vue-i18n (no hand-rolled mod10/mod100 logic)', () => {
  it('passes count as both the named param and the plural choice', () => {
    const tPlural = (key: string, named: Record<string, unknown>, choice: number) => `${key}:${named.count}:${choice}`
    expect(reviewsCountLabel(1, tPlural)).toBe('reviews.count:1:1')
    expect(reviewsCountLabel(21, tPlural)).toBe('reviews.count:21:21')
  })
})

describe('resolveReviewAuthorRole / otherReviewRole — the only way to tell client vs contractor (Review has no role field)', () => {
  const order: Order = {
    id: 'o1', marketplaceOfferId: 'off1', marketplaceRequestId: 'r1', projectWorkId: 'pw1',
    clientUserId: 'client-user-1', contractorId: 'ct1', price: 100000, quantity: 1, unit: 'pcs',
    status: 'completed', createdAt: 'c', updatedAt: 'u', contractor: null,
  }

  it('a review authored by order.clientUserId is a client review', () => {
    const review: Review = { id: 'rv1', orderId: 'o1', authorUserId: 'client-user-1', targetUserId: 'contractor-user-1', rating: 5, comment: null, createdAt: 'c', updatedAt: 'u' }
    expect(resolveReviewAuthorRole(review, order)).toBe('client')
  })

  it('a review NOT authored by order.clientUserId is a contractor review (only two participants exist)', () => {
    const review: Review = { id: 'rv2', orderId: 'o1', authorUserId: 'contractor-user-1', targetUserId: 'client-user-1', rating: 4, comment: null, createdAt: 'c', updatedAt: 'u' }
    expect(resolveReviewAuthorRole(review, order)).toBe('contractor')
  })

  it('otherReviewRole flips client<->contractor', () => {
    expect(otherReviewRole('client')).toBe('contractor')
    expect(otherReviewRole('contractor')).toBe('client')
  })
})

describe('reviewRoleLabel — real contractor name when known, honest fallback otherwise', () => {
  it('client role always resolves reviews.roleClient (no Client display-name exists anywhere in the API)', () => {
    expect(reviewRoleLabel('client', t)).toBe('reviews.roleClient')
    expect(reviewRoleLabel('client', t, 'ignored')).toBe('reviews.roleClient')
  })

  it('contractor role uses the real contractor name when provided', () => {
    expect(reviewRoleLabel('contractor', t, 'Азиз')).toBe('Азиз')
  })

  it('contractor role falls back to reviews.roleContractorFallback when no name is known', () => {
    expect(reviewRoleLabel('contractor', t, null)).toBe('reviews.roleContractorFallback')
    expect(reviewRoleLabel('contractor', t, undefined)).toBe('reviews.roleContractorFallback')
    expect(reviewRoleLabel('contractor', t, '   ')).toBe('reviews.roleContractorFallback')
  })
})

describe('findMyReview — "have I already reviewed this order?" (см. задание секция ORDER DETAIL)', () => {
  const reviews: Review[] = [
    { id: 'rv1', orderId: 'o1', authorUserId: 'user-a', targetUserId: 'user-b', rating: 5, comment: null, createdAt: 'c', updatedAt: 'u' },
    { id: 'rv2', orderId: 'o1', authorUserId: 'user-b', targetUserId: 'user-a', rating: 4, comment: 'Спасибо', createdAt: 'c', updatedAt: 'u' },
  ]

  it('finds the review authored by the given user id', () => {
    expect(findMyReview(reviews, 'user-b')).toEqual(reviews[1])
  })

  it('returns null when the user has not reviewed yet', () => {
    expect(findMyReview(reviews, 'user-c')).toBeNull()
  })

  it('returns null when userId is not known yet (still loading auth)', () => {
    expect(findMyReview(reviews, undefined)).toBeNull()
    expect(findMyReview(reviews, null)).toBeNull()
  })
})
