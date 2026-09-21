<script setup lang="ts">
// /orders — список заказов, адаптируется к User Mode (см. задание, секция
// ORDERS PAGE): CLIENT — "Мои заказы" (заказы, где я client), CONTRACTOR —
// "Заказы" (заказы, где я contractor). Одна страница, не два route (см.
// задание, секция ROUTING) — GET /api/v1/orders уже возвращает оба среза
// слитыми (см. order_handler.go ListMine: "as Client and/or Contractor —
// one User may be both"), различать их здесь — чистая presentation-логика
// (сравнение id), а не access control: backend уже отфильтровал список до
// того, что реально видно вызывающему.
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Заказы' })

const { user } = useAuth()
const { isContractor } = useUserMode()
const { contractor, requestTitleCache, loadContractor } = useMarketplace()
const { orders, ordersLoading, ordersError, fetchOrders } = useOrders()

onMounted(() => {
  void fetchOrders()
  if (contractor.value === undefined) void loadContractor()
})

const myClientOrders = computed(() => orders.value.filter(o => user.value && o.clientUserId === user.value.id))
const myContractorOrders = computed(() => orders.value.filter(o => contractor.value && o.contractorId === contractor.value.id))
const visibleOrders = computed(() => (isContractor.value ? myContractorOrders.value : myClientOrders.value))

const pageTitle = computed(() => (isContractor.value ? 'Заказы' : 'Мои заказы'))
const emptyText = computed(() => (
  isContractor.value
    ? 'Принятые предложения станут заказами здесь.'
    : 'Когда мастер примет вашу работу и заказ будет создан, он появится здесь.'
))

function titleFor(order: { marketplaceRequestId: string }): string | null {
  return requestTitleCache.value[order.marketplaceRequestId]?.workType ?? null
}
</script>

<template>
  <main class="orders-page">
    <div class="orders-page__header">
      <NuxtLink to="/marketplace" class="orders-page__back">
        <UiIcon name="chevron-left" :size="18" />
        Биржа
      </NuxtLink>
      <AppProfileMenu />
    </div>

    <AppModeNav class="orders-page__mode-nav" />

    <h1 class="text-h1 orders-page__title">
      {{ pageTitle }}
    </h1>

    <div v-if="ordersLoading" class="orders-page__skeletons">
      <div v-for="n in 3" :key="n" class="orders-page__skeleton" />
    </div>

    <div v-else-if="ordersError" class="orders-page__state">
      <p class="text-secondary">
        Не удалось загрузить заказы.
      </p>
      <button type="button" class="btn btn-secondary" @click="fetchOrders">
        Повторить
      </button>
    </div>

    <p v-else-if="visibleOrders.length === 0" class="text-secondary orders-page__empty">
      Заказов пока нет. {{ emptyText }}
    </p>

    <div v-else class="orders-page__grid">
      <OrderCard v-for="order in visibleOrders" :key="order.id" :order="order" :work-title="titleFor(order)" />
    </div>
  </main>
</template>

<style scoped>
.orders-page {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

.orders-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.orders-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.orders-page__mode-nav {
  margin-bottom: var(--space-4);
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
