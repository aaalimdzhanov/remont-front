// Типизированные методы для Review — см. remont-back
// internal/interfaces/http/review_handler.go. Review создаётся ТОЛЬКО для
// completed Order, путь — /api/v1/orders/{order_id}/reviews (POST), тело —
// ровно {rating, comment}: order_id/author_user_id/target_user_id backend
// резолвит сам (см. api/types.ts CreateReviewPayload). Единственная точка
// HTTP-транспорта — apiFetch из client.ts, как и во всём проекте.
import { apiFetch } from './client'
import type { CreateReviewPayload, Review, ReviewDto } from './types'

function toReview(dto: ReviewDto): Review {
  return {
    id: dto.id,
    orderId: dto.order_id,
    authorUserId: dto.author_user_id,
    targetUserId: dto.target_user_id,
    rating: dto.rating,
    comment: dto.comment,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export async function createReview(orderId: string, payload: CreateReviewPayload): Promise<Review> {
  const dto = await apiFetch<ReviewDto>(`/api/v1/orders/${encodeURIComponent(orderId)}/reviews`, {
    method: 'POST',
    body: payload,
  })
  return toReview(dto)
}

// Все отзывы конкретного заказа (обычно 0-2: Client->Contractor и/или
// Contractor->Client) — доступно только реальным участникам заказа (см.
// application/review.Service.ListForOrder), чужому — 404 на весь Order,
// не отдельная 403 здесь.
export async function getOrderReviews(orderId: string): Promise<Review[]> {
  const items = await apiFetch<ReviewDto[]>(`/api/v1/orders/${encodeURIComponent(orderId)}/reviews`)
  return items.map(toReview)
}

export async function getReview(id: string): Promise<Review> {
  const dto = await apiFetch<ReviewDto>(`/api/v1/reviews/${encodeURIComponent(id)}`)
  return toReview(dto)
}

// Отзывы, оставленные вызывающим (как автор) — не зависит от client/
// contractor режима, один и тот же список в обоих (см. useUserMode.ts).
export async function getMyReviews(): Promise<Review[]> {
  const items = await apiFetch<ReviewDto[]>('/api/v1/reviews/mine')
  return items.map(toReview)
}

// Отзывы, полученные вызывающим (как target) — тоже не зависит от режима.
export async function getReceivedReviews(): Promise<Review[]> {
  const items = await apiFetch<ReviewDto[]>('/api/v1/reviews/received')
  return items.map(toReview)
}
