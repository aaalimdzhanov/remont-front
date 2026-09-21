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

describe('contractorRatingLabel — backend aggregate is the source of truth, never recomputed', () => {
  it('reviews_count === 0 -> "Пока нет отзывов" (см. задание секция 13)', () => {
    expect(contractorRatingLabel(null, 0)).toBe('Пока нет отзывов')
  })

  it('rating === null but reviews_count > 0 (defensive edge case) -> "Нет отзывов"', () => {
    expect(contractorRatingLabel(null, 3)).toBe('Нет отзывов')
  })

  it('a real rating formats to one decimal place', () => {
    expect(contractorRatingLabel(4.8, 12)).toBe('4.8')
    expect(contractorRatingLabel(5, 1)).toBe('5.0')
  })
})

describe('reviewsCountLabel — RU pluralization (тот же паттерн, что pluralRooms в ProjectCard.vue)', () => {
  it('1 отзыв, 2/3/4 отзыва, 5+/0/11-14 отзывов', () => {
    expect(reviewsCountLabel(1)).toBe('1 отзыв')
    expect(reviewsCountLabel(2)).toBe('2 отзыва')
    expect(reviewsCountLabel(4)).toBe('4 отзыва')
    expect(reviewsCountLabel(5)).toBe('5 отзывов')
    expect(reviewsCountLabel(0)).toBe('0 отзывов')
    expect(reviewsCountLabel(11)).toBe('11 отзывов')
    expect(reviewsCountLabel(21)).toBe('21 отзыв')
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
  it('client role is always labeled "Клиент" (no Client display-name exists anywhere in the API)', () => {
    expect(reviewRoleLabel('client')).toBe('Клиент')
    expect(reviewRoleLabel('client', 'ignored')).toBe('Клиент')
  })

  it('contractor role uses the real contractor name when provided', () => {
    expect(reviewRoleLabel('contractor', 'Азиз')).toBe('Азиз')
  })

  it('contractor role falls back to "Мастер" when no name is known', () => {
    expect(reviewRoleLabel('contractor', null)).toBe('Мастер')
    expect(reviewRoleLabel('contractor', undefined)).toBe('Мастер')
    expect(reviewRoleLabel('contractor', '   ')).toBe('Мастер')
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
