<script setup lang="ts">
// /orders — список заказов, адаптируется к User Mode (см. задание, секция
// ORDERS PAGE): CLIENT — "Мои заказы" (заказы, где я client), CONTRACTOR —
// "Заказы" (заказы, где я contractor). Одна страница, не два route (см.
// задание, секция ROUTING) — GET /api/v1/orders уже возвращает оба среза
// слитыми (см. order_handler.go ListMine: "as Client and/or Contractor —
// one User may be both"), различать их здесь — чистая presentation-логика
// (сравнение id), а не access control: backend уже отфильтровал список до
// того, что реально видно вызывающему.
// layout:'app' — тот же общий AppHeader.vue, что и на /projects и
// /marketplace (см. правку "Header consistency"): раньше страница рисовала
// собственный
// back-link+AppProfileMenu+AppModeNav вместо общего header — из-за этого
// не было логотипа и белого header-фона, которые есть у остальных
// authenticated-страниц.
definePageMeta({ middleware: 'auth', layout: 'app' })

const { t } = useI18n()
useHead({ title: computed(() => t('orders.listTitle')) })

const { user } = useAuth()
const { isContractor } = useUserMode()
const { contractor, loadContractor } = useMarketplace()
const { orders, ordersLoading, ordersError, fetchOrders } = useOrders()

onMounted(() => {
  void fetchOrders()
  if (contractor.value === undefined) void loadContractor()
})

const myClientOrders = computed(() => orders.value.filter(o => user.value && o.clientUserId === user.value.id))
const myContractorOrders = computed(() => orders.value.filter(o => contractor.value && o.contractorId === contractor.value.id))
const visibleOrders = computed(() => (isContractor.value ? myContractorOrders.value : myClientOrders.value))

const pageTitle = computed(() => t(isContractor.value ? 'orders.listTitle' : 'orders.myOrdersTitle'))
const emptyText = computed(() => t(isContractor.value ? 'orders.emptyContractor' : 'orders.emptyClient'))
</script>

<template>
  <main class="orders-page">
    <h1 class="text-h1 orders-page__title">
      {{ pageTitle }}
    </h1>

    <div v-if="ordersLoading" class="orders-page__skeletons">
      <div v-for="n in 3" :key="n" class="orders-page__skeleton" />
    </div>

    <div v-else-if="ordersError" class="orders-page__state">
      <p class="text-secondary">
        {{ t('orders.loadErrorList') }}
      </p>
      <button type="button" class="btn btn-secondary" @click="fetchOrders">
        {{ t('common.retry') }}
      </button>
    </div>

    <p v-else-if="visibleOrders.length === 0" class="text-secondary orders-page__empty">
      {{ t('orders.emptyPrefix') }} {{ emptyText }}
    </p>

    <div v-else class="orders-page__grid">
      <OrderCard v-for="order in visibleOrders" :key="order.id" :order="order" />
    </div>
  </main>
</template>

<style scoped>
.orders-page {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

.orders-page__title {
  margin: 0 0 var(--space-6);
}

.orders-page__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

.orders-page__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.orders-page__skeleton {
  height: 120px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: orders-page-pulse 1.4s ease-in-out infinite;
}

@keyframes orders-page-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.orders-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
}

.orders-page__empty {
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
}

@media (min-width: 768px) {
  .orders-page__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
