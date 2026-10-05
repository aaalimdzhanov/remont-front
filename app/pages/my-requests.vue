<script setup lang="ts">
// /my-requests — ЛИЧНЫЙ раздел: заявки, созданные ТЕКУЩИМ пользователем
// (owner-вид ListMine), отдельно от публичной биржи /marketplace (см.
// задание "Navigation split v1": «Заявки» в header раньше вело на
// /marketplace и там же показывало "Мои заявки" вперемешку с чужими
// открытыми заявками — теперь /marketplace остаётся чисто публичным
// списком, а свои заявки — здесь).
//
// Данные/composable/карточка — НЕ новые: myRequests/myRequestsLoading/
// myRequestsError/loadMyRequests уже существовали в useMarketplace.ts (там
// же, где их использовал /marketplace до restructure v3 — см. финальный
// отчёт той задачи), MarketplaceMyRequestCard.vue — та же карточка с
// реальной миниатюрой плана (project_id/room_id, см. "Marketplace request
// plan thumbnail"), просто была временно нигде не отрендерена. Здесь она
// впервые снова используется — не второй компонент, тот же самый файл.
//
// Табы "Все/Активные/Завершённые/Черновики" — единственная НОВАЯ
// presentation-логика этой задачи: чистая client-side фильтрация уже
// загруженного myRequests по существующему полю status, без нового
// API-запроса. "Завершённые" объединяет closed И cancelled (оба —
// терминальные статусы, у заявки уже нет активного жизненного цикла) —
// в реальных статусах backend нет отдельного "completed", а заводить для
// каждого статуса отдельный таб задание не просило (примерная схема — 4
// таба, реальных статусов — 4: draft/open/cancelled/closed).
definePageMeta({ middleware: 'auth', layout: 'app' })

const { t } = useI18n()
useHead({ title: computed(() => t('marketplace.myRequestsHeading')) })

const { myRequests, myRequestsLoading, myRequestsError, loadMyRequests } = useMarketplace()
const { isContractor } = useUserMode()

onMounted(() => {
  void loadMyRequests()
})

type StatusTab = 'all' | 'active' | 'completed' | 'draft'
const activeTab = ref<StatusTab>('all')

const STATUS_TABS: { id: StatusTab, labelKey: string }[] = [
  { id: 'all', labelKey: 'myRequests.tabAll' },
  { id: 'active', labelKey: 'myRequests.tabActive' },
  { id: 'completed', labelKey: 'myRequests.tabCompleted' },
  { id: 'draft', labelKey: 'myRequests.tabDraft' },
]

const filteredRequests = computed(() => {
  switch (activeTab.value) {
    case 'active': return myRequests.value.filter(r => r.status === 'open')
    case 'completed': return myRequests.value.filter(r => r.status === 'closed' || r.status === 'cancelled')
    case 'draft': return myRequests.value.filter(r => r.status === 'draft')
    default: return myRequests.value
  }
})
</script>

<template>
  <main class="my-requests-page">
    <div class="my-requests-page__head">
      <h1 class="text-h1 my-requests-page__title">
        {{ t('marketplace.myRequestsHeading') }}
      </h1>
      <!-- Та же вторичная ссылка, что и на /marketplace (см. задание,
           секция 5: "можно разместить отдельной вкладкой" — вместо
           дублирования уже существующей полноценной страницы
           /marketplace/offers второй копией её UI, просто ссылка на неё;
           видимость та же, что и там — contractor-режим уже видит
           "Предложения" в собственной навигации). -->
      <NuxtLink v-if="!isContractor" to="/marketplace/offers" class="btn btn-secondary my-requests-page__offers-link">
        <UiIcon name="coins" :size="16" />
        {{ t('offers.myOffers') }}
      </NuxtLink>
    </div>

    <nav class="my-requests-page__tabs" :aria-label="t('myRequests.statusTabsAriaLabel')">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.id"
        type="button"
        class="my-requests-page__tab"
        :class="{ 'my-requests-page__tab--active': activeTab === tab.id }"
        :aria-current="activeTab === tab.id ? 'page' : undefined"
        @click="activeTab = tab.id"
      >
        {{ t(tab.labelKey) }}
      </button>
    </nav>

    <div v-if="myRequestsLoading" class="my-requests-page__skeletons">
      <div v-for="n in 3" :key="n" class="my-requests-page__skeleton" />
    </div>

    <div v-else-if="myRequestsError" class="my-requests-page__state">
      <p class="text-secondary">
        {{ t('marketplace.myRequestsLoadError') }}
      </p>
      <button type="button" class="btn btn-secondary" @click="loadMyRequests">
        {{ t('common.retry') }}
      </button>
    </div>

    <p v-else-if="myRequests.length === 0" class="text-secondary my-requests-page__empty">
      {{ t('marketplace.myRequestsEmpty') }}
    </p>

    <p v-else-if="filteredRequests.length === 0" class="text-secondary my-requests-page__empty">
      {{ t('myRequests.noneInTab') }}
    </p>

    <div v-else class="my-requests-page__grid">
      <MarketplaceMyRequestCard v-for="request in filteredRequests" :key="request.id" :request="request" />
    </div>
  </main>
</template>

<style scoped>
.my-requests-page {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

.my-requests-page__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.my-requests-page__title {
  margin: 0;
}

.my-requests-page__offers-link {
  flex-shrink: 0;
  min-height: 44px;
}

/* Тот же pill-паттерн с горизонтальным scroll, что и AppModeNav.vue
   (.mode-nav) — 4 таба гарантированно помещаются без переноса и на узких
   экранах, не создавая horizontal overflow всей страницы. */
.my-requests-page__tabs {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;
  margin-bottom: var(--space-5);
}

.my-requests-page__tabs::-webkit-scrollbar {
  display: none;
}

.my-requests-page__tab {
  flex-shrink: 0;
  height: 36px;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-small-size);
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
}

.my-requests-page__tab:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.my-requests-page__tab--active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}

.my-requests-page__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

.my-requests-page__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.my-requests-page__skeleton {
  height: 120px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: my-requests-page-pulse 1.4s ease-in-out infinite;
}

@keyframes my-requests-page-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.my-requests-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
}

.my-requests-page__empty {
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
}

@media (min-width: 768px) {
  .my-requests-page__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
