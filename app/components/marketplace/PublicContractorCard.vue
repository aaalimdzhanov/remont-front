<script setup lang="ts">
// Компактная карточка мастера для секции "Мастера на платформе" публичного
// /marketplace (см. задание "Public Marketplace — Мастера на платформе v1").
// Только реальные поля PublicContractorProfile (см. api/types.ts — тот же
// тип, что и /marketplace/contractors/[id].vue уже использует): никогда
// phone/user_id/status/timestamps, backend их для этого DTO вообще не
// возвращает (см. public_contractor_handler.go toPublicContractorResponse).
//
// Переиспользование, а не новая система:
//   - contractorDisplayName/contractorDescription — те же функции, что уже
//     использует OrderContractorCard.vue (см. utils/order.ts); принимают
//     {id,name,description}, а PublicContractorProfile — структурный
//     надмножество этого набора полей, поэтому переиспользуются напрямую,
//     без дублирования fallback-логики ("Мастер", пустое описание -> null);
//   - ReviewRatingStars + contractorRatingLabel/reviewsCountLabel — та же
//     звёздная система и те же подписи, что уже показывает публичный
//     профиль мастера (contractors/[id].vue) и OrderContractorCard.vue;
//   - formatPriceRange (через contractorCardPriceLabel) — тот же
//     форматтер цены, что и везде в Marketplace;
//   - avatar — тот же паттерн "круг + UiIcon 'user'", что уже используют
//     OrderContractorCard.vue и сам публичный профиль мастера, а не новый
//     letter-avatar, которого в проекте нет.
//
// Вся карточка — один NuxtLink (см. задание, секция 17: "не вкладывать
// button внутрь link") — визуальная "кнопка" ниже это <span class="btn">,
// тот же приём, что уже использует OpenRequestCard.vue для "Подробнее".
import { contractorDescription, contractorDisplayName } from '~/utils/order'
import { contractorCardPriceLabel, contractorServicesLabel } from '~/utils/marketplace'
import type { PublicContractorProfile } from '~/api/types'

const props = defineProps<{ contractor: PublicContractorProfile }>()

const description = computed(() => contractorDescription(props.contractor))
const servicesLabel = computed(() => contractorServicesLabel(props.contractor.services))
const priceLabel = computed(() => contractorCardPriceLabel(props.contractor.services))
</script>

<template>
  <NuxtLink :to="`/marketplace/contractors/${contractor.id}`" class="public-contractor-card">
    <div class="public-contractor-card__head">
      <span class="public-contractor-card__avatar" aria-hidden="true">
        <UiIcon name="user" :size="20" />
      </span>
      <p class="public-contractor-card__name">
        {{ contractorDisplayName(contractor) }}
      </p>
    </div>

    <div class="public-contractor-card__rating">
      <ReviewRatingStars :rating="contractor.rating" :size="14" />
      <span class="text-caption text-muted">
        {{ contractorRatingLabel(contractor.rating, contractor.reviewsCount) }}
        <template v-if="contractor.reviewsCount > 0">· {{ reviewsCountLabel(contractor.reviewsCount) }}</template>
      </span>
    </div>

    <p v-if="description" class="public-contractor-card__description">
      {{ description }}
    </p>

    <p v-if="servicesLabel" class="text-caption text-muted public-contractor-card__services">
      {{ servicesLabel }}
    </p>

    <p v-if="priceLabel" class="public-contractor-card__price">
      {{ priceLabel }}
    </p>

    <span class="btn btn-secondary btn-sm public-contractor-card__cta">
      Посмотреть профиль
    </span>
  </NuxtLink>
</template>

<style scoped>
.public-contractor-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-lg);
  background: var(--color-surface);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.public-contractor-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card);
}

.public-contractor-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.public-contractor-card__avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.public-contractor-card__name {
  margin: 0;
  min-width: 0;
  font-weight: 600;
  font-size: var(--font-body-lg-size);
  color: var(--color-text);
  overflow-wrap: break-word;
  word-break: break-word;
}

.public-contractor-card__rating {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

/* line-clamp — карточка не должна растягиваться из-за длинного описания
   (см. задание, секция 13: "максимум 2-3 строки на mobile"). */
.public-contractor-card__description {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
  line-height: var(--font-small-line);
}

.public-contractor-card__services {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-contractor-card__price {
  margin: 0;
  font-weight: 600;
  font-size: var(--font-small-size);
  color: var(--color-text);
}

.public-contractor-card__cta {
  margin-top: var(--space-1);
  min-height: 44px;
  justify-content: center;
}
</style>
