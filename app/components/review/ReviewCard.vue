<script setup lang="ts">
// Карточка одного отзыва — Order Detail ("Отзывы") и /reviews (Мои/
// Полученные). Presentation-only: роль автора (authorLabel) резолвится
// снаружи через utils/review.ts (resolveReviewAuthorRole/reviewRoleLabel) —
// на Order Detail это достоверно (Order уже загружен), на /reviews список
// это НЕ всегда достоверно без доп. запроса за каждым Order (см. задание,
// секция REVIEWS PAGE: "роль... только если достоверно") — поэтому
// authorLabel опционален, не показываем его, если вызывающая страница не
// смогла его вычислить, вместо выдумывания.
//
// Никогда не показывает: phone, user_id, внутренний UUID (order_id
// используется только как route-параметр ссылки "Заказ", не выводится
// текстом как ID).
import type { Review } from '~/api/types'

defineProps<{
  review: Review
  authorLabel?: string | null
  showOrderLink?: boolean
}>()
</script>

<template>
  <div class="review-card">
    <div class="review-card__header">
      <ReviewRatingStars :rating="review.rating" :size="16" />
      <span v-if="authorLabel" class="text-caption text-muted review-card__author">
        {{ authorLabel }}
      </span>
    </div>

    <p v-if="review.comment" class="text-small review-card__comment">
      {{ review.comment }}
    </p>

    <div class="review-card__footer">
      <span class="text-caption text-muted">{{ formatMarketplaceDate(review.createdAt) }}</span>
      <NuxtLink v-if="showOrderLink" :to="`/orders/${review.orderId}`" class="text-caption review-card__order-link">
        Заказ
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.review-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.review-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.review-card__author {
  flex-shrink: 0;
}

.review-card__comment {
  margin: 0;
  color: var(--color-text);
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.review-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.review-card__order-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.review-card__order-link:hover {
  text-decoration: underline;
}
</style>
