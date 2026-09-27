<script setup lang="ts">
// Карточка "моей" заявки (owner-вид, приватный список ListMine). ВАЖНО:
// приватная форма MarketplaceRequest (см. api/types.ts) НЕ содержит
// work_type/work_type_id вообще — только project_work_id. Название работы
// здесь принципиально нельзя показать без выдумывания: у backend нет
// endpoint'а "получить ProjectWork по id без project_id". Полный контекст
// (название работы + статус заявки) доступен на странице /projects/{id}/works,
// где эта заявка создавалась и где ProjectWork уже резолвится по каталогу —
// см. ProjectWorkCard.vue. Здесь — честный fallback на количество/статус/дату.
//
// Draft → Publish v1: карточка со статусом 'draft' НЕ ссылается на публичный
// /marketplace/requests/{id} — backend намеренно исключает draft из
// GetPublicByID (WHERE status != 'draft'), переход туда дал бы честному
// владельцу его же заявки "не найдено". Вместо ссылки — просто некликабельная
// карточка с подсказкой опубликовать со страницы «Работы» (см. задание,
// секции DRAFT В PRIVATE UI/REQUEST DETAIL).
import type { MarketplaceRequest } from '~/api/types'

const props = defineProps<{ request: MarketplaceRequest }>()

const { t, locale } = useI18n()

const isDraft = computed(() => props.request.status === 'draft')
</script>

<template>
  <component
    :is="isDraft ? 'div' : 'NuxtLink'"
    :to="isDraft ? undefined : `/marketplace/requests/${request.id}`"
    class="my-request-card"
    :class="{ 'my-request-card--draft': isDraft }"
  >
    <div class="my-request-card__row">
      <span class="my-request-card__quantity">{{ formatQuantity(request.quantity, request.unit, t) }}</span>
      <span class="my-request-card__status" :class="`my-request-card__status--${request.status}`">
        {{ marketplaceRequestStatusLabel(request.status, t) }}
      </span>
    </div>
    <p class="text-caption text-muted my-request-card__date">
      {{ t('marketplaceRequest.createdAt', { date: formatMarketplaceDate(request.createdAt, locale) }) }}
    </p>
    <span v-if="isDraft" class="text-caption text-muted my-request-card__hint">
      {{ t('marketplaceRequest.publishHint') }}
    </span>
    <span v-else class="btn btn-secondary btn-sm my-request-card__cta">
      {{ t('marketplaceRequest.viewOffers') }}
    </span>
  </component>
</template>

<style scoped>
.my-request-card {
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

.my-request-card:hover {
  border-color: var(--color-border-strong);
}

.my-request-card--draft {
  cursor: default;
}

.my-request-card--draft:hover {
  border-color: var(--color-border);
}

.my-request-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.my-request-card__quantity {
  font-weight: 600;
  font-size: var(--font-body-lg-size);
  color: var(--color-text);
}

.my-request-card__status {
  flex-shrink: 0;
  font-size: var(--font-caption-size);
  padding: 2px var(--space-2);
  border-radius: 999px;
  white-space: nowrap;
}

.my-request-card__status--draft { color: var(--color-warning); background: var(--color-warning-subtle); }
.my-request-card__status--open { color: var(--color-success); background: var(--color-success-subtle); }
.my-request-card__status--cancelled { color: var(--color-text-muted); background: var(--color-surface-subtle); }
.my-request-card__status--closed { color: var(--color-text-secondary); background: var(--color-surface-subtle); }

.my-request-card__date {
  margin: 0;
}

.my-request-card__cta {
  align-self: flex-start;
  margin-top: var(--space-2);
  min-height: 44px;
}

.my-request-card__hint {
  margin: 0;
}
</style>
