<script setup lang="ts">
// Карточка предложения — переиспользуется и owner-видом (Request Details:
// Принять/Отклонить), и contractor-видом ("Мои предложения": Отозвать).
// ВАЖНО: MarketplaceOffer (см. api/types.ts) НЕ содержит профиль контрактора
// (имя/телефон/рейтинг) — только contractor_id. Имя/рейтинг здесь по-прежнему
// НЕ показаны (backend их не отдаёт в Offer), но offer.contractor_id — это
// реальное, уже присутствующее поле (не выдумано), поэтому owner-виду
// (клиент, решающий, принять ли предложение) добавлена ссылка на публичный
// профиль мастера — см. задание "Public Contractor Profile Frontend v1",
// секция NAVIGATION FROM MARKETPLACE. В "mine"-режиме (сам мастер смотрит
// свой оффер) ссылка не нужна — это его собственный профиль.
import type { MarketplaceOffer } from '~/api/types'

const props = defineProps<{
  offer: MarketplaceOffer
  mode: 'owner' | 'mine'
  title?: string | null
  busy: boolean
  // Заказ, созданный из этого (принятого) предложения — Offer сам по себе
  // order_id не содержит (см. api/types.ts), поэтому это best-effort: id
  // резолвится извне через useOrders().findOrderByRequestId() (см. задание,
  // секция OFFER CARD — "если Order ID пока недоступен, не придумывать").
  orderId?: string | null
}>()

const emit = defineEmits<{ accept: [], reject: [], withdraw: [] }>()

const isPending = computed(() => props.offer.status === 'pending')
</script>

<template>
  <div class="offer-card" :class="{ 'offer-card--busy': busy }">
    <div class="offer-card__header">
      <div>
        <p v-if="title" class="offer-card__title">
          {{ title }}
        </p>
        <p class="offer-card__price">
          {{ formatPrice(offer.price) }}
        </p>
      </div>
      <span class="offer-card__status" :class="`offer-card__status--${offer.status}`">
        {{ offerStatusLabel(offer.status) }}
      </span>
    </div>

    <NuxtLink v-if="mode === 'owner'" :to="`/marketplace/contractors/${offer.contractorId}`" class="offer-card__profile-link">
      <UiIcon name="user" :size="14" />
      Профиль мастера
    </NuxtLink>

    <p v-if="offer.comment" class="offer-card__comment">
      «{{ offer.comment }}»
    </p>

    <p class="text-caption text-muted offer-card__date">
      {{ formatMarketplaceDate(offer.createdAt) }}
    </p>

    <div v-if="mode === 'owner' && isPending" class="offer-card__actions">
      <button type="button" class="btn btn-primary" :disabled="busy" @click="emit('accept')">
        Принять
      </button>
      <button type="button" class="btn btn-secondary" :disabled="busy" @click="emit('reject')">
        Отклонить
      </button>
    </div>

    <div v-else-if="mode === 'mine' && isPending" class="offer-card__actions">
      <button type="button" class="btn btn-ghost" :disabled="busy" @click="emit('withdraw')">
        Отозвать
      </button>
    </div>

    <NuxtLink v-if="offer.status === 'accepted' && orderId" :to="`/orders/${orderId}`" class="btn btn-secondary btn-sm offer-card__order-link">
      <UiIcon name="check" :size="14" />
      Заказ
    </NuxtLink>
  </div>
</template>

<style scoped>
.offer-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.offer-card--busy {
  opacity: 0.6;
  pointer-events: none;
}

.offer-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.offer-card__title {
  margin: 0 0 2px;
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
}

.offer-card__price {
  margin: 0;
  font-weight: 700;
  font-size: var(--font-h3-size);
  color: var(--color-text);
}

.offer-card__status {
  flex-shrink: 0;
  font-size: var(--font-caption-size);
  padding: 2px var(--space-2);
  border-radius: 999px;
  white-space: nowrap;
}

.offer-card__status--pending { color: var(--color-warning); background: var(--color-warning-subtle); }
.offer-card__status--accepted { color: var(--color-success); background: var(--color-success-subtle); }
.offer-card__status--rejected { color: var(--color-error); background: var(--color-error-subtle); }
.offer-card__status--withdrawn { color: var(--color-text-muted); background: var(--color-surface-subtle); }

.offer-card__profile-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  align-self: flex-start;
  min-height: 44px;
  color: var(--color-primary);
  font-size: var(--font-small-size);
  font-weight: 500;
  text-decoration: none;
}

.offer-card__profile-link:hover {
  text-decoration: underline;
}

.offer-card__comment {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
}

.offer-card__date {
  margin: 0;
}

.offer-card__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.offer-card__actions .btn {
  flex: 1;
  min-height: 44px;
}

.offer-card__order-link {
  align-self: flex-start;
  margin-top: var(--space-1);
  min-height: 44px;
  text-decoration: none;
}
</style>
