<script setup lang="ts">
// /marketplace/offers — "Мои предложения" (contractor-сценарий).
// GET /api/v1/offers/mine. Название работы показывается ТОЛЬКО если оно
// реально встречалось в открытом списке за эту сессию (requestTitleCache,
// см. useMarketplace.ts) — MarketplaceOffer сам по себе work_type не
// содержит, а get-by-id для заявки у backend нет вообще.
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
useHead({ title: computed(() => t('offers.myOffers')) })

const { myOffers, myOffersLoading, myOffersError, requestTitleCache, offerActionId, offerActionError, loadMyOffers, setOfferStatus } = useMarketplace()
const { fetchOrders, findOrderByRequestId } = useOrders()

onMounted(() => {
  void loadMyOffers()
  // Заказ по принятому предложению (см. OfferCard.vue "Заказ" ссылка) —
  // Offer сам по себе order_id не содержит, находим через реальный GET
  // /orders, не выдумываем (см. задание, секция OFFER CARD).
  void fetchOrders()
})

function titleFor(marketplaceRequestId: string): string | null {
  return requestTitleCache.value[marketplaceRequestId]?.workType ?? null
}

function orderIdFor(marketplaceRequestId: string): string | null {
  return findOrderByRequestId(marketplaceRequestId)?.id ?? null
}

async function handleWithdraw(offerId: string) {
  await setOfferStatus(offerId, 'withdrawn')
}
</script>

<template>
  <main class="my-offers-page">
    <div class="my-offers-page__header">
      <NuxtLink to="/marketplace" class="my-offers-page__back">
        <UiIcon name="chevron-left" :size="18" />
        {{ t('navigation.backToMarketplace') }}
      </NuxtLink>
      <AppProfileMenu />
    </div>

    <AppModeNav class="my-offers-page__mode-nav" />

    <h1 class="text-h1 my-offers-page__title">
      {{ t('offers.myOffers') }}
    </h1>

    <div v-if="myOffersLoading" class="my-offers-page__skeletons">
      <div v-for="n in 3" :key="n" class="my-offers-page__skeleton" />
    </div>

    <div v-else-if="myOffersError" class="my-offers-page__state">
      <p class="text-secondary">
        {{ t('offers.loadError') }}
      </p>
      <button type="button" class="btn btn-secondary" @click="loadMyOffers">
        {{ t('common.retry') }}
      </button>
    </div>

    <p v-else-if="myOffers.length === 0" class="text-secondary my-offers-page__empty">
      {{ t('offers.empty') }}
    </p>

    <div v-else class="my-offers-page__list">
      <p v-if="offerActionError" class="my-offers-page__error">
        {{ offerActionError.message }}
      </p>
      <MarketplaceOfferCard
        v-for="offer in myOffers"
        :key="offer.id"
        :offer="offer"
        mode="mine"
        :title="titleFor(offer.marketplaceRequestId)"
        :busy="offerActionId === offer.id"
        :order-id="orderIdFor(offer.marketplaceRequestId)"
        @withdraw="handleWithdraw(offer.id)"
      />
    </div>
  </main>
</template>

<style scoped>
.my-offers-page {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

.my-offers-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.my-offers-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.my-offers-page__mode-nav {
  margin-bottom: var(--space-5);
}

.my-offers-page__title {
  margin: 0 0 var(--space-5);
}

.my-offers-page__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.my-offers-page__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.my-offers-page__skeleton {
  height: 100px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: my-offers-page-pulse 1.4s ease-in-out infinite;
}

@keyframes my-offers-page-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.my-offers-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
}

.my-offers-page__empty {
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
}

.my-offers-page__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}
</style>
