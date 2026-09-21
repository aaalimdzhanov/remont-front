import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetchMock = vi.fn()
vi.mock('~/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

const { createReview, getMyReviews, getOrderReviews, getReceivedReviews, getReview } = await import('~/api/reviews')

beforeEach(() => {
  apiFetchMock.mockReset()
})

const dto = {
  id: 'rv1',
  order_id: 'o1',
  author_user_id: 'u1',
  target_user_id: 'u2',
  rating: 5,
  comment: 'Отличная работа!',
  created_at: 'c',
  updated_at: 'u',
}

const review = {
  id: 'rv1',
  orderId: 'o1',
  authorUserId: 'u1',
  targetUserId: 'u2',
  rating: 5,
  comment: 'Отличная работа!',
  createdAt: 'c',
  updatedAt: 'u',
}

describe('review api methods (см. review_handler.go — реальный backend contract)', () => {
  it('createReview POSTs to /api/v1/orders/{order_id}/reviews with exactly {rating, comment}', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    const result = await createReview('o1', { rating: 5, comment: 'Отличная работа!' })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/orders/o1/reviews', {
      method: 'POST',
      body: { rating: 5, comment: 'Отличная работа!' },
    })
    expect(result).toEqual(review)
  })

  it('createReview never sends order_id/author_user_id/target_user_id — only rating/comment', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    await createReview('o1', { rating: 4, comment: null })
    const body = apiFetchMock.mock.calls[0]![1].body
    expect(Object.keys(body).sort()).toEqual(['comment', 'rating'])
  })

  it('getOrderReviews GETs /api/v1/orders/{order_id}/reviews', async () => {
    apiFetchMock.mockResolvedValueOnce([dto])
    const result = await getOrderReviews('o1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/orders/o1/reviews')
    expect(result).toEqual([review])
  })

  it('getReview GETs /api/v1/reviews/{id}', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    const result = await getReview('rv1')
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/reviews/rv1')
    expect(result).toEqual(review)
  })

  it('getMyReviews GETs /api/v1/reviews/mine', async () => {
    apiFetchMock.mockResolvedValueOnce([dto])
    const result = await getMyReviews()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/reviews/mine')
    expect(result).toEqual([review])
  })

  it('getReceivedReviews GETs /api/v1/reviews/received', async () => {
    apiFetchMock.mockResolvedValueOnce([dto])
    const result = await getReceivedReviews()
    expect(apiFetchMock).toHaveBeenCalledWith('/api/v1/reviews/received')
    expect(result).toEqual([review])
  })

  it('a null comment round-trips as null, not an empty string or undefined', async () => {
    apiFetchMock.mockResolvedValueOnce({ ...dto, comment: null })
    const result = await getReview('rv1')
    expect(result.comment).toBeNull()
  })

  it('maps every field to camelCase and never adds fields beyond id/orderId/authorUserId/targetUserId/rating/comment/createdAt/updatedAt', async () => {
    apiFetchMock.mockResolvedValueOnce(dto)
    const result = await getReview('rv1')
    expect(Object.keys(result).sort()).toEqual(
      ['authorUserId', 'comment', 'createdAt', 'id', 'orderId', 'rating', 'targetUserId', 'updatedAt'].sort(),
    )
  })
})
