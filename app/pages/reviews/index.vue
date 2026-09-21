<script setup lang="ts">
// /reviews — "Полученные"/"Мои" отзывы (см. задание "Marketplace Review &
// Rating Frontend v1", секции REVIEWS LIST/REVIEWS PAGE). Одна страница для
// обоих User Mode — набор табов одинаков и в client, и в contractor режиме
// (см. utils/userMode.ts): "Мои"/"Полученные" не зависят от роли — это
// собственные отзывы пользователя как автора/как цели, а не что-то
// специфичное для client или contractor.
//
// Роль автора/цели каждого review здесь СОЗНАТЕЛЬНО не резолвится (в
// отличие от Order Detail, где Order уже загружен и сравнение с
// order.clientUserId — бесплатно): чтобы узнать роль review из этого
// списка, пришлось бы отдельно грузить каждый связанный Order — то самое
// дублирование запросов, которого задание просит избегать (секция audit:
// "не дублируй API-запросы без необходимости"). Вместо этого — честная
// карточка без роли + ссылка "Заказ" (order_id у Review есть всегда,
// см. api/types.ts), по которой роль уже видна бесплатно на Order Detail.
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Отзывы' })

const { myReviews, myReviewsLoading, myReviewsError, receivedReviews, receivedReviewsLoading, receivedReviewsError, loadMyReviews, loadReceivedReviews } = useReviews()

const activeTab = ref<'received' | 'mine'>('received')

onMounted(() => {
  void loadReceivedReviews()
  void loadMyReviews()
})

const activeList = computed(() => (activeTab.value === 'received' ? receivedReviews.value : myReviews.value))
const activeLoading = computed(() => (activeTab.value === 'received' ? receivedReviewsLoading.value : myReviewsLoading.value))
const activeError = computed(() => (activeTab.value === 'received' ? receivedReviewsError.value : myReviewsError.value))

function retry() {
  if (activeTab.value === 'received') void loadReceivedReviews()
  else void loadMyReviews()
}

const emptyText = computed(() => (
  activeTab.value === 'received'
    ? 'Пока нет полученных отзывов.'
    : 'Вы ещё не оставляли отзывы.'
))
</script>

<template>
  <main class="reviews-page">
    <div class="reviews-page__header">
      <NuxtLink to="/marketplace" class="reviews-page__back">
        <UiIcon name="chevron-left" :size="18" />
        Биржа
      </NuxtLink>
      <AppProfileMenu />
    </div>

    <AppModeNav class="reviews-page__mode-nav" />

    <h1 class="text-h1 reviews-page__title">
      Отзывы
    </h1>

    <div class="reviews-page__tabs" role="tablist">
      <button
        type="button"
        class="reviews-page__tab"
        :class="{ 'reviews-page__tab--active': activeTab === 'received' }"
        role="tab"
        :aria-selected="activeTab === 'received'"
        @click="activeTab = 'received'"
      >
        Полученные
      </button>
      <button
        type="button"
        class="reviews-page__tab"
        :class="{ 'reviews-page__tab--active': activeTab === 'mine' }"
        role="tab"
        :aria-selected="activeTab === 'mine'"
        @click="activeTab = 'mine'"
      >
        Мои
      </button>
    </div>

    <div v-if="activeLoading" class="reviews-page__skeletons">
      <div v-for="n in 3" :key="n" class="reviews-page__skeleton" />
    </div>

    <div v-else-if="activeError" class="reviews-page__state">
      <p class="text-secondary">
        Не удалось загрузить отзывы.
      </p>
      <button type="button" class="btn btn-secondary" @click="retry">
        Повторить
      </button>
    </div>

    <p v-else-if="activeList.length === 0" class="text-secondary reviews-page__empty">
      {{ emptyText }}
    </p>

    <div v-else class="reviews-page__list">
      <ReviewCard v-for="review in activeList" :key="review.id" :review="review" show-order-link />
    </div>
  </main>
</template>

<style scoped>
.reviews-page {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

.reviews-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.reviews-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.reviews-page__mode-nav {
  margin-bottom: var(--space-4);
}

.reviews-page__title {
  margin: 0 0 var(--space-5);
}

.reviews-page__tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.reviews-page__tab {
  flex: 1;
  min-height: 44px;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-input);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  font-weight: 500;
  cursor: pointer;
}

.reviews-page__tab:hover {
  border-color: var(--color-border-strong);
}

.reviews-page__tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.reviews-page__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.reviews-page__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.reviews-page__skeleton {
  height: 100px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: reviews-page-pulse 1.4s ease-in-out infinite;
}

@keyframes reviews-page-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.reviews-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
}

.reviews-page__empty {
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
}
</style>
