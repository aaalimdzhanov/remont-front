<script setup lang="ts">
// Карточка заказа — список /orders (см. pages/orders/index.vue). Order
// response (см. api/types.ts) содержит только IDs, ни названия работы, ни
// имени клиента/мастера. Технические ID (marketplace_offer_id,
// project_work_id, client_user_id, contractor_id) нигде не отображаются.
//
// Order Card work title v1: название работы теперь резолвится САМОЙ
// карточкой (тот же самодостаточный паттерн, что и
// MarketplaceProjectPlanThumbnail.vue/MyRequestCard.vue) через
// useMarketplace().loadRequestTitle(order.marketplaceRequestId) — активная
// загрузка канонического публичного GET /marketplace-requests/{id}
// (dedup-кэш по requestId, см. useMarketplace.ts requestTitleCache), а не
// пассивный best-effort проп от родителя, который раньше почти никогда не
// резолвился для заказов (заявка заказа уже ЗАКРЫТА, её никто не видел в
// открытом списке за эту сессию — см. историю requestTitleCache). Пока имя
// ещё грузится (или backend реально не смог его отдать — оба случая дают
// null) — честный fallback "Заказ" (orders.title), НЕ придуманное значение.
import type { Order } from '~/api/types'

const props = defineProps<{ order: Order }>()

const { t, locale } = useI18n()
const { requestTitleCache, loadRequestTitle } = useMarketplace()

onMounted(() => {
  void loadRequestTitle(props.order.marketplaceRequestId)
})

const workTitle = computed(() => requestTitleCache.value[props.order.marketplaceRequestId]?.workType ?? null)
</script>

<template>
  <NuxtLink :to="`/orders/${order.id}`" class="order-card">
    <div class="order-card__header">
      <p v-if="workTitle" class="order-card__title">
        {{ workTitle }}
      </p>
      <p v-else class="order-card__title text-muted">
        {{ t('orders.title') }}
      </p>
      <span class="order-card__status" :class="`order-card__status--${orderStatusClass(order.status)}`">
        {{ orderStatusLabel(order.status, t) }}
      </span>
    </div>

    <div class="order-card__row">
      <span class="text-caption text-muted">{{ t('orders.quantity') }}</span>
      <span class="text-small">{{ formatQuantity(order.quantity, order.unit, t) }}</span>
    </div>

    <div class="order-card__row">
      <span class="text-caption text-muted">{{ t('orders.price') }}</span>
      <span class="order-card__price">{{ formatPrice(order.price, locale, t('common.currency')) }}</span>
    </div>

    <p class="text-caption text-muted order-card__date">
      {{ t('orders.createdOn', { date: formatMarketplaceDate(order.createdAt, locale) }) }}
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

/* Главный элемент карточки (см. задание "улучшить /orders": "название
   работы должно быть самым заметным текстом") — тот же line-clamp/перенос,
   что и .open-request-card__title/.my-request-card__title, чтобы длинное
   название ("Комплексная штукатурка стен в квартире") переносилось на 1-2
   строки, а не наезжало на status badge справа (align-items:flex-start на
   .order-card__header не даёт им перекрыться по вертикали). */
.order-card__title {
  flex: 1;
  margin: 0;
  font-weight: 600;
  font-size: var(--font-body-lg-size);
  line-height: var(--font-h3-line);
  color: var(--color-text);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow-wrap: break-word;
  word-break: break-word;
  min-width: 0;
}

.order-card__status {
  flex-shrink: 0;
  margin-top: 2px;
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
