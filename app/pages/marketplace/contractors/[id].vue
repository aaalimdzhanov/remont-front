<script setup lang="ts">
// /marketplace/contractors/{id} — PUBLIC профиль мастера (см. задание
// "Public Contractor Profile Frontend v1"). ОТДЕЛЬНЫЙ route от
// /marketplace/contractor (без "s", без id) — та страница остаётся
// PRIVATE self-profile (создание/редактирование СВОЕГО профиля, требует
// auth) и этим файлом не трогается вообще. Эта страница — просто витрина
// по чужому id, публичная (backend: auth не требуется), только
// read-only-поля из PublicContractorProfile (см. api/types.ts) — никогда
// phone/user_id/status/timestamps, даже если backend когда-нибудь начнёт
// их отдавать (см. задание, секция PRIVACY).
// Public Marketplace v1: middleware:'auth' удалён — гость должен иметь
// возможность открыть публичный профиль мастера (backend: auth не
// требуется, см. комментарий выше) точно так же, как и авторизованный
// пользователь; ранее эта страница была недостижима без сессии, хотя и
// backend, и сам компонент уже были к этому готовы.

const route = useRoute()
const contractorId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

const { contractor, isLoading, error, fetchContractor } = usePublicContractor()

const locationLabel = computed(() => (contractor.value ? formatLocation(contractor.value.location) : null))

// Portfolio v1 — приходит вместе с самим GET /contractors/{id} (см.
// api/types.ts PublicContractorProfile.portfolio), отдельного запроса нет
// (см. задание, секция PERFORMANCE). null (список мастеров) сюда в принципе
// не долетает — detail-эндпоинт всегда резолвит portfolio как массив
// (возможно пустой), но на всякий случай не считаем null "есть работы".
const viewingPortfolioItem = ref<{ imageUrl: string, title: string, description: string } | null>(null)

useHead({ title: 'Профиль мастера' })

onMounted(() => {
  void fetchContractor(contractorId.value)
})
</script>

<template>
  <main class="public-contractor-page">
    <div class="public-contractor-page__header">
      <NuxtLink to="/marketplace" class="public-contractor-page__back">
        <UiIcon name="chevron-left" :size="18" />
        Биржа
      </NuxtLink>
      <AppProfileMenu />
    </div>

    <h1 class="text-h1 public-contractor-page__title">
      Профиль мастера
    </h1>

    <div v-if="isLoading && contractor === undefined" class="public-contractor-page__skeleton-wrap">
      <div class="public-contractor-page__skeleton public-contractor-page__skeleton--card" />
      <div class="public-contractor-page__skeleton public-contractor-page__skeleton--row" />
      <div class="public-contractor-page__skeleton public-contractor-page__skeleton--row" />
    </div>

    <div v-else-if="contractor === null" class="public-contractor-page__state">
      <UiIcon name="alert" :size="28" class="public-contractor-page__state-icon" />
      <p class="text-h3">
        Мастер не найден
      </p>
      <NuxtLink to="/marketplace" class="btn btn-secondary">
        Вернуться к бирже
      </NuxtLink>
    </div>

    <div v-else-if="error" class="public-contractor-page__state">
      <UiIcon name="alert" :size="28" class="public-contractor-page__state-icon" />
      <p class="text-secondary">
        Не удалось загрузить профиль мастера.
      </p>
      <button type="button" class="btn btn-secondary" @click="fetchContractor(contractorId)">
        Повторить
      </button>
    </div>

    <template v-else-if="contractor">
      <section class="public-contractor-page__profile">
        <div class="public-contractor-page__avatar" aria-hidden="true">
          <UiIcon name="user" :size="28" />
        </div>
        <p class="public-contractor-page__name">
          {{ contractor.name.trim() || 'Мастер' }}
        </p>
        <p v-if="contractor.description.trim()" class="text-secondary public-contractor-page__description">
          {{ contractor.description.trim() }}
        </p>
        <div class="public-contractor-page__rating">
          <ReviewRatingStars :rating="contractor.rating" :size="18" />
          <span class="text-small text-secondary">
            {{ contractorRatingLabel(contractor.rating, contractor.reviewsCount) }}
            <template v-if="contractor.reviewsCount > 0">· {{ reviewsCountLabel(contractor.reviewsCount) }}</template>
          </span>
        </div>
      </section>

      <section v-if="locationLabel" class="public-contractor-page__location">
        <h2 class="text-h3 public-contractor-page__location-title">
          Работает в
        </h2>
        <p class="public-contractor-page__location-value">
          <UiIcon name="pin" :size="16" />
          {{ locationLabel }}
        </p>
      </section>

      <section class="public-contractor-page__services">
        <h2 class="text-h3 public-contractor-page__services-title">
          Услуги мастера
        </h2>

        <p v-if="contractor.services.length === 0" class="text-secondary public-contractor-page__services-empty">
          Мастер пока не добавил услуги.
        </p>
        <div v-else class="public-contractor-page__service-list">
          <div v-for="service in contractor.services" :key="service.workTypeId" class="public-contractor-page__service">
            <span class="public-contractor-page__service-name">{{ service.workType }}</span>
            <span class="text-small text-secondary public-contractor-page__service-price">
              {{ formatPriceRange(service.priceFrom, service.priceTo) }}
            </span>
          </div>
        </div>
      </section>

      <section v-if="contractor.portfolio && contractor.portfolio.length > 0" class="public-contractor-page__portfolio">
        <h2 class="text-h3 public-contractor-page__portfolio-title">
          Работы мастера
        </h2>
        <MarketplacePortfolioGrid :items="contractor.portfolio" @open="(item) => (viewingPortfolioItem = item)" />
      </section>
    </template>

    <MarketplacePortfolioImageViewer :item="viewingPortfolioItem" @close="viewingPortfolioItem = null" />
  </main>
</template>

<style scoped>
.public-contractor-page {
  max-width: 560px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

.public-contractor-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.public-contractor-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.public-contractor-page__title {
  margin: 0 0 var(--space-5);
}

.public-contractor-page__skeleton-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.public-contractor-page__skeleton {
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: public-contractor-page-pulse 1.4s ease-in-out infinite;
}

.public-contractor-page__skeleton--card {
  height: 200px;
}

.public-contractor-page__skeleton--row {
  height: 64px;
}

@keyframes public-contractor-page-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.public-contractor-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  min-height: 40vh;
  text-align: center;
}

.public-contractor-page__state-icon {
  color: var(--color-warning);
}

.public-contractor-page__profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  text-align: center;
}

.public-contractor-page__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  margin-bottom: var(--space-1);
}

.public-contractor-page__name {
  margin: 0;
  font-weight: 600;
  font-size: var(--font-h3-size);
  color: var(--color-text);
  overflow-wrap: break-word;
}

.public-contractor-page__description {
  margin: 0;
  overflow-wrap: break-word;
  max-width: 40ch;
}

.public-contractor-page__rating {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: var(--space-1);
}

.public-contractor-page__location {
  margin-top: var(--space-8);
}

.public-contractor-page__location-title {
  margin: 0 0 var(--space-3);
}

.public-contractor-page__location-value {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  overflow-wrap: break-word;
  word-break: break-word;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  color: var(--color-text);
}

.public-contractor-page__location-value .icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.public-contractor-page__services {
  margin-top: var(--space-8);
}

.public-contractor-page__services-title {
  margin: 0 0 var(--space-4);
}

.public-contractor-page__services-empty {
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
}

.public-contractor-page__service-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.public-contractor-page__service {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.public-contractor-page__service-name {
  min-width: 0;
  overflow-wrap: break-word;
  color: var(--color-text);
}

.public-contractor-page__service-price {
  flex-shrink: 0;
  text-align: right;
}

.public-contractor-page__portfolio {
  margin-top: var(--space-8);
}

.public-contractor-page__portfolio-title {
  margin: 0 0 var(--space-4);
}
</style>
