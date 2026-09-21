<script setup lang="ts">
// Order Detail → блок "Мастер" (см. задание "Order Party Details Frontend
// v1"). Presentation-only — никаких API-вызовов здесь: contractor уже
// приходит вместе с Order (GET /api/v1/orders/{id}, см. api/types.ts
// OrderContractorSummary) — компонент просто показывает то, что получил.
// Кликабельно на публичный профиль /marketplace/contractors/{id} (см.
// задание "Public Contractor Profile Frontend v1", секция ORDER
// INTEGRATION) — ЭТО НЕ /marketplace/contractor (без "s", без id): та
// страница остаётся PRIVATE self-profile (создание/редактирование СВОЕГО
// профиля), использовать её для просмотра ЧУЖОГО мастера было бы
// категорийной ошибкой. Ссылка есть всегда, когда контрактор вообще
// показан (contractor.id уже есть в тех же данных — доп. запрос не нужен).
import type { OrderContractorSummary } from '~/api/types'

defineProps<{ contractor: OrderContractorSummary | null }>()
</script>

<template>
  <section class="order-contractor">
    <p class="text-caption text-muted order-contractor__label">
      Мастер
    </p>

    <NuxtLink v-if="contractor" :to="`/marketplace/contractors/${contractor.id}`" class="order-contractor__card">
      <div class="order-contractor__avatar" aria-hidden="true">
        <UiIcon name="user" :size="22" />
      </div>
      <div class="order-contractor__info">
        <p class="order-contractor__name">
          {{ contractorDisplayName(contractor) }}
        </p>
        <div class="order-contractor__rating">
          <ReviewRatingStars :rating="contractor.rating" :size="14" />
          <span class="text-caption text-muted">
            {{ contractorRatingLabel(contractor.rating, contractor.reviewsCount) }}
            <template v-if="contractor.reviewsCount > 0">· {{ reviewsCountLabel(contractor.reviewsCount) }}</template>
          </span>
        </div>
        <p v-if="contractorDescription(contractor)" class="text-small text-secondary order-contractor__description">
          {{ contractorDescription(contractor) }}
        </p>
      </div>
      <UiIcon name="chevron-left" :size="16" class="order-contractor__chevron" />
    </NuxtLink>

    <p v-else class="text-secondary order-contractor__fallback">
      Информация о мастере недоступна.
    </p>
  </section>
</template>

<style scoped>
.order-contractor {
  margin-top: var(--space-5);
}

.order-contractor__label {
  margin: 0 0 var(--space-2);
}

.order-contractor__card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  text-decoration: none;
  color: inherit;
}

.order-contractor__card:hover {
  border-color: var(--color-border-strong);
}

.order-contractor__chevron {
  flex-shrink: 0;
  align-self: center;
  color: var(--color-text-muted);
  transform: rotate(180deg);
}

.order-contractor__avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.order-contractor__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}

.order-contractor__name {
  margin: 0;
  font-weight: 600;
  color: var(--color-text);
  overflow-wrap: break-word;
}

.order-contractor__rating {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.order-contractor__description {
  margin: 0;
  overflow-wrap: break-word;
}

.order-contractor__fallback {
  margin: 0;
  padding: var(--space-4);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
}
</style>
