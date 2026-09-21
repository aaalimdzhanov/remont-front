import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetShimState } from '../setup'

const reviewsApi = {
  createReview: vi.fn(),
  getOrderReviews: vi.fn(),
  getMyReviews: vi.fn(),
  getReceivedReviews: vi.fn(),
}
vi.mock('~/api/reviews', () => reviewsApi)

let useReviews: typeof import('~/composables/useReviews')['useReviews']

beforeEach(async () => {
  vi.resetModules()
  resetShimState()
  vi.clearAllMocks()
  ;({ useReviews } = await import('~/composables/useReviews'))
})

const review = {
  id: 'rv1', orderId: 'o1', authorUserId: 'u1', targetUserId: 'u2',
  rating: 5, comment: 'Отлично', createdAt: 'c', updatedAt: 'u',
}

describe('useReviews — loadOrderReviews', () => {
  it('populates orderReviews on success and toggles loading', async () => {
    let resolve!: (v: unknown) => void
    reviewsApi.getOrderReviews.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const rv = useReviews()
    const p = rv.loadOrderReviews('o1')
    expect(rv.orderReviewsLoading.value).toBe(true)
    resolve([review])
    await p
    expect(rv.orderReviewsLoading.value).toBe(false)
    expect(rv.orderReviews.value).toEqual([review])
  })

  it('surfaces an error via orderReviewsError without throwing', async () => {
    reviewsApi.getOrderReviews.mockRejectedValueOnce({ status: 500, code: 'internal_error', message: 'boom' })
    const rv = useReviews()
    await rv.loadOrderReviews('o1')
    expect(rv.orderReviewsError.value?.code).toBe('internal_error')
    expect(rv.orderReviews.value).toEqual([])
  })
})

describe('useReviews — loadMyReviews (mine)', () => {
  it('populates myReviews from GET /reviews/mine', async () => {
    reviewsApi.getMyReviews.mockResolvedValueOnce([review])
    const rv = useReviews()
    await rv.loadMyReviews()
    expect(rv.myReviews.value).toEqual([review])
  })
})

describe('useReviews — loadReceivedReviews (received)', () => {
  it('populates receivedReviews from GET /reviews/received', async () => {
    reviewsApi.getReceivedReviews.mockResolvedValueOnce([review])
    const rv = useReviews()
    await rv.loadReceivedReviews()
    expect(rv.receivedReviews.value).toEqual([review])
  })
})

describe('useReviews — createReview', () => {
  it('successful create appends the new review to orderReviews', async () => {
    reviewsApi.createReview.mockResolvedValueOnce(review)
    const rv = useReviews()
    const result = await rv.createReview('o1', { rating: 5, comment: 'Отлично' })
    expect(reviewsApi.createReview).toHaveBeenCalledWith('o1', { rating: 5, comment: 'Отлично' })
    expect(result).toEqual(review)
    expect(rv.orderReviews.value).toEqual([review])
  })

  it('guards against double-submit while a create is already in flight', async () => {
    let resolve!: (v: unknown) => void
    reviewsApi.createReview.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const rv = useReviews()
    const first = rv.createReview('o1', { rating: 5 })
    const second = await rv.createReview('o1', { rating: 3 })
    expect(second).toBeNull()
    expect(reviewsApi.createReview).toHaveBeenCalledTimes(1)
    resolve(review)
    await first
  })

  it('duplicate review (409 review_already_exists) surfaces via createReviewError, does not add a fake entry', async () => {
    reviewsApi.createReview.mockRejectedValueOnce({ status: 409, code: 'review_already_exists', message: 'This order already has a review from you' })
    const rv = useReviews()
    const result = await rv.createReview('o1', { rating: 5 })
    expect(result).toBeNull()
    expect(rv.createReviewError.value?.code).toBe('review_already_exists')
    expect(rv.orderReviews.value).toEqual([])
  })

  it('order not completed (409 order_not_completed) surfaces via createReviewError', async () => {
    reviewsApi.createReview.mockRejectedValueOnce({ status: 409, code: 'order_not_completed', message: 'Order is not completed' })
    const rv = useReviews()
    const result = await rv.createReview('o1', { rating: 5 })
    expect(result).toBeNull()
    expect(rv.createReviewError.value?.code).toBe('order_not_completed')
  })

  it('invalid rating (400 invalid_rating) surfaces via createReviewError', async () => {
    reviewsApi.createReview.mockRejectedValueOnce({ status: 400, code: 'invalid_rating', message: 'rating must be between 1 and 5' })
    const rv = useReviews()
    const result = await rv.createReview('o1', { rating: 0 })
    expect(result).toBeNull()
    expect(rv.createReviewError.value?.code).toBe('invalid_rating')
  })
})
