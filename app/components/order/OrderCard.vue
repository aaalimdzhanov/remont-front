<script setup lang="ts">
// Карточка заказа — список /orders (см. pages/orders/index.vue). Order
// response (см. api/types.ts) содержит только IDs, ни названия работы, ни
// имени клиента/мастера — workTitle приходит best-effort извне (см.
// useMarketplace().requestTitleCache, тот же паттерн, что уже используется
// на /marketplace/offers) и может быть null, тогда просто не показывается
// вместо выдуманного значения. Технические ID (marketplace_offer_id,
// project_work_id, client_user_id, contractor_id) нигде не отображаются.
import type { Order } from '~/api/types'

defineProps<{ order: Order, workTitle?: string | null }>()
</script>

<template>
  <NuxtLink :to="`/orders/${order.id}`" class="order-card">
    <div class="order-card__header">
      <p v-if="workTitle" class="order-card__title">
        {{ workTitle }}
      </p>
      <p v-else class="order-card__title text-muted">
        Заказ
      </p>
      <span class="order-card__status" :class="`order-card__status--${orderStatusClass(order.status)}`">
        {{ orderStatusLabel(order.status) }}
      </span>
    </div>

    <div class="order-card__row">
      <span class="text-caption text-muted">Количество</span>
      <span class="text-small">{{ formatQuantity(order.quantity, order.unit) }}</span>
    </div>

    <div class="order-card__row">
      <span class="text-caption text-muted">Цена</span>
      <span class="order-card__price">{{ formatPrice(order.price) }}</span>
    </div>

    <p class="text-caption text-muted order-card__date">
      Создан {{ formatMarketplaceDate(order.createdAt) }}
    </p>
  </NuxtLink>
</template>

<style scoped>
.order-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  text-decoration: none;
  color: inherit;
}

.order-card:hover {
  border-color: var(--color-border-strong);
}

.order-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.order-card__title {
  margin: 0;
  font-weight: 600;
  font-size: var(--font-body-lg-size);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.order-card__status {
  flex-shrink: 0;
  font-size: var(--font-caption-size);
  padding: 2px var(--space-2);
  border-radius: 999px;
  white-space: nowrap;
}

.order-card__status--planned { color: var(--color-text-secondary); background: var(--color-surface-subtle); }
.order-card__status--in_progress { color: var(--color-warning); background: var(--color-warning-subtle); }
.order-card__status--completed { color: var(--color-success); background: var(--color-success-subtle); }
.order-card__status--cancelled { color: var(--color-text-muted); background: var(--color-surface-subtle); }

.order-card__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.order-card__price {
  font-weight: 600;
  color: var(--color-text);
}

.order-card__date {
  margin: 0;
}
</style>
