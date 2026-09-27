// Presentation/validation-only хелперы для Review UI. Ничего не решает про
// authorization/lifecycle — backend остаётся единственным источником истины
// (см. задание, секция ARCHITECTURAL RULES: "Frontend только отражает
// backend state"). Здесь только: (1) client-side предвалидация формы перед
// отправкой (backend всё равно проверяет сам — 400 invalid_rating/
// invalid_comment, см. api/client.ts), (2) форматирование rating/count,
// (3) определение "роли" автора отзыва — единственный способ отличить
// Client-review от Contractor-review, раз у Review нет отдельного поля
// role/direction (см. api/types.ts) — сравнение author_user_id с реальным
// Order.clientUserId, который у нас уже есть без доп. запросов.
import type { Order, Review } from '~/api/types'

export const REVIEW_MIN_RATING = 1
export const REVIEW_MAX_RATING = 5
export const REVIEW_MAX_COMMENT_LENGTH = 2000

export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= REVIEW_MIN_RATING && rating <= REVIEW_MAX_RATING
}

export function isValidCommentLength(comment: string): boolean {
  return comment.length <= REVIEW_MAX_COMMENT_LENGTH
}

// '' / whitespace-only -> null (то же "пустое поле — значит не заполнено",
// что уже принято в этом проекте для необязательных текстовых полей, см.
// CreateOfferPayload/comment в api/marketplace.ts) — backend хранит comment
// как *string, null означает "без комментария", а не пустую строку.
export function normalizeReviewComment(raw: string): string | null {
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

// ---- Rating aggregate display (OrderContractorCard) ----
// rating/reviewsCount уже посчитаны backend'ом (см. api/types.ts
// OrderContractorSummary) — здесь только форматирование, никакого счёта.
// t — переданный вызывающим компонентом useI18n().t (см. тот же паттерн в
// utils/marketplace.ts/work.ts — этот файл остаётся без Vue-контекста).
export function contractorRatingLabel(rating: number | null, reviewsCount: number, t: (key: string) => string): string {
  if (reviewsCount === 0) return t('reviews.noneYet')
  if (rating === null) return t('reviews.none') // defensive: не должно происходить при reviewsCount>0
  return rating.toFixed(1)
}

// vue-i18n plural message (namespace reviews.count) — реальная RU 3-форменная
// плюрализация (1 отзыв / 2-4 отзыва / 5+ отзывов) резолвится самим
// vue-i18n по числу, не собственной mod10/mod100-логикой, как раньше; uz —
// одна инвариантная форма (см. locales/uz.json).
export function reviewsCountLabel(count: number, t: (key: string, named: Record<string, unknown>, choice: number) => string): string {
  return t('reviews.count', { count }, count)
}

// ---- Review author role (только внутри Order Detail, где Order уже есть) ----
export type ReviewRole = 'client' | 'contractor'

// Единственные два реальных участника заказа — если автор не client, он
// contractor (см. domain/review's package comment: "AuthorUserID is always
// either the Order's ClientUserID or the User behind its ContractorID").
export function resolveReviewAuthorRole(review: Review, order: Order): ReviewRole {
  return review.authorUserId === order.clientUserId ? 'client' : 'contractor'
}

export function otherReviewRole(role: ReviewRole): ReviewRole {
  return role === 'client' ? 'contractor' : 'client'
}

// contractorName — order.contractor?.name, если роль 'contractor' и имя
// реально известно (см. OrderContractorSummary) — иначе честный fallback
// "Мастер"/"Клиент", без выдумывания.
export function reviewRoleLabel(role: ReviewRole, t: (key: string) => string, contractorName?: string | null): string {
  if (role === 'client') return t('reviews.roleClient')
  const trimmed = contractorName?.trim()
  return trimmed ? trimmed : t('reviews.roleContractorFallback')
}

// Уже оставленный мной отзыв по этому заказу, если есть — см. задание,
// секция ORDER DETAIL: "Для пользователя определить, оставлял ли он уже
// отзыв". Только presentation-логика: список reviews уже прошёл через
// backend'ную авторизацию (ListForOrder доступен только участникам).
export function findMyReview(reviews: Review[], userId: string | null | undefined): Review | null {
  if (!userId) return null
  return reviews.find(r => r.authorUserId === userId) ?? null
}
