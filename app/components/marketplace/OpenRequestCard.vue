<script setup lang="ts">
// Карточка открытой заявки (contractor-вид, публичный список). Только реальные
// поля публичного ответа backend (см. api/types.ts: OpenMarketplaceRequest) —
// НЕ показывать имя клиента/проект/комнату/адрес, backend их не отдаёт.
//
// UI/UX v2 (mobile-first marketplace-item look): иконка резолвится ВЫШЕ
// (index.vue, см. utils/marketplace.ts requestCardIcon()) из реальных
// backend-полей work_type_id -> WorkType.categoryId -> WorkCategory.slug —
// уже загруженный для фильтров каталог, не новый API-запрос и не угаданная
// по тексту иконка. Этот компонент сам ничего не резолвит — просто рисует
// то, что передали, с honest generic fallback'ом ('hammer'), если каталог
// ещё не загрузился. "Открыта" — не выдуманное поле: OpenMarketplaceRequest
// в принципе не содержит status, потому что ЛЮБОЙ элемент этого списка
// гарантированно открыт (см. GET /marketplace/requests/open — backend
// отдаёт только status='open'), так что этот текст — константа для всего
// списка, а не отображение несуществующего поля. Description сознательно
// не показывается вообще — backend его не отдаёт (см. задание: "не
// фейковать description").
//
// location — Project Location в Marketplace v1 (см. api/types.ts): coarse
// city/district уже загруженной заявки, null если у Project нет location —
// тот же formatLocation()/иконка 'pin', что уже использует
// PublicContractorCard.vue для мастеров, без второго форматтера/иконки.
import type { OpenMarketplaceRequest } from '~/api/types'
import type { RequestCardIcon } from '~/utils/marketplace'
import { formatLocation } from '~/utils/marketplace'

const props = withDefaults(defineProps<{ request: OpenMarketplaceRequest, icon?: RequestCardIcon }>(), {
  icon: 'hammer',
})

const locationLabel = computed(() => formatLocation(props.request.location))
</script>

<template>
  <NuxtLink :to="`/marketplace/requests/${request.id}`" class="open-request-card">
    <div class="open-request-card__head">
      <span class="open-request-card__icon" aria-hidden="true">
        <UiIcon :name="icon" :size="18" />
      </span>
      <p class="open-request-card__title">
        {{ request.workType }}
      </p>
    </div>

    <div class="open-request-card__meta">
      <span class="open-request-card__quantity">{{ formatQuantity(request.quantity, request.unit) }}</span>
      <span class="text-caption text-muted">{{ formatMarketplaceDate(request.createdAt) }}</span>
    </div>

    <p v-if="locationLabel" class="open-request-card__location">
      <UiIcon name="pin" :size="14" />
      {{ locationLabel }}
    </p>

    <div class="open-request-card__foot">
      <span class="open-request-card__status">
        <span class="open-request-card__status-dot" aria-hidden="true" />
        Открыта
      </span>
      <span class="open-request-card__arrow" aria-hidden="true">
        <UiIcon name="chevron-left" :size="16" />
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.open-request-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  min-height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card-lg);
  background: var(--color-surface);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.open-request-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card);
}

.open-request-card__head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.open-request-card__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.open-request-card__title {
  margin: 0;
  padding-top: 2px;
  font-weight: 600;
  font-size: var(--font-body-lg-size);
  line-height: var(--font-h3-line);
  color: var(--color-text);
  overflow-wrap: break-word;
  word-break: break-word;
}

.open-request-card__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding-left: calc(36px + var(--space-3));
}

.open-request-card__quantity {
  font-weight: 600;
  color: var(--color-text);
}

.open-request-card__location {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin: 0;
  padding-left: calc(36px + var(--space-3));
  overflow-wrap: break-word;
  word-break: break-word;
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
}

.open-request-card__location .icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.open-request-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-top: var(--space-2);
  padding-left: calc(36px + var(--space-3));
  border-top: 1px solid var(--color-border);
}

.open-request-card__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-small-size);
  font-weight: 500;
  color: var(--color-success);
}

.open-request-card__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}

.open-request-card__arrow {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  transform: rotate(180deg);
}
</style>
