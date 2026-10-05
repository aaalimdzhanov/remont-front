<script setup lang="ts">
// Карточка открытой заявки (contractor-вид, публичный список). Только реальные
// поля публичного ответа backend (см. api/types.ts: OpenMarketplaceRequest) —
// НЕ показывать имя клиента/проект/комнату/адрес, backend их не отдаёт.
//
// /marketplace UI/UX v3 ("Биржа" restructure): структура карточки теперь
// намеренно совпадает с MyRequestCard.vue (thumb-слот слева + название/
// статус/метаданные справа, дата+стрелка отдельной нижней строкой) — единый
// визуальный компонент карточки заявки, как и просило задание, а не два
// разных вида карточек. РЕАЛЬНАЯ миниатюра плана здесь НЕВОЗМОЖНА и не
// добавляется: OpenMarketplaceRequest никогда не содержит project_id/room_id
// — это осознанная privacy-граница backend (подрядчик не должен узнать, чей
// это проект, см. api/types.ts, комментарий у OpenMarketplaceRequestDto) —
// то же самое согласовано в задаче "Marketplace request plan thumbnail v1"
// этой сессии. thumb-слот здесь всегда содержит категорийную иконку — тот
// же requestCardIcon()/icon prop, что и раньше, просто в увеличенном
// квадратном "slot", визуально того же размера/радиуса, что и box плана на
// других карточках — отсюда ощущение одного и того же компонента, а не
// выдуманный Building там, где его в принципе не может быть.
//
// "2 комнаты"/площадь помещения из референса тоже недоступны здесь по той
// же причине (комнаты — это Building JSON, а не поле заявки) — карточка
// показывает честные quantity/unit (те же данные, что и раньше), без
// добавления несуществующих полей.
import type { OpenMarketplaceRequest } from '~/api/types'
import type { RequestCardIcon } from '~/utils/marketplace'
import { formatLocation } from '~/utils/marketplace'

const props = withDefaults(defineProps<{ request: OpenMarketplaceRequest, icon?: RequestCardIcon }>(), {
  icon: 'hammer',
})

const { t, locale } = useI18n()

const locationLabel = computed(() => formatLocation(props.request.location, locale.value))
</script>

<template>
  <NuxtLink :to="`/marketplace/requests/${request.id}`" class="open-request-card">
    <div class="open-request-card__main">
      <span class="open-request-card__thumb" aria-hidden="true">
        <UiIcon :name="icon" :size="26" />
      </span>

      <div class="open-request-card__info">
        <div class="open-request-card__head">
          <p class="open-request-card__title">
            {{ request.workType }}
          </p>
          <span class="open-request-card__status">
            <span class="open-request-card__status-dot" aria-hidden="true" />
            {{ t('marketplaceRequest.openBadge') }}
          </span>
        </div>

        <p class="open-request-card__quantity">
          {{ formatQuantity(request.quantity, request.unit, t) }}
        </p>

        <p v-if="locationLabel" class="open-request-card__location">
          <UiIcon name="pin" :size="14" />
          {{ locationLabel }}
        </p>
      </div>
    </div>

    <div class="open-request-card__foot">
      <span class="text-caption text-muted">{{ formatMarketplaceDate(request.createdAt, locale) }}</span>
      <UiIcon name="chevron-left" :size="16" class="open-request-card__arrow" />
    </div>
  </NuxtLink>
</template>

<style scoped>
.open-request-card {
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

.open-request-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card);
}

.open-request-card__main {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

/* Единый thumb-слот — та же роль, что и plan-миниатюра на "Мои заявки"
   (см. MarketplaceProjectPlanThumbnail.vue): фиксированный квадрат,
   светлый фон, тонкая граница. Здесь всегда иконка категории (см. doc
   comment выше — реальный план тут технически недоступен), но размер и
   расположение совпадают с "слотом под план" на других карточках. */
.open-request-card__thumb {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-card-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
  color: var(--color-primary);
}

.open-request-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.open-request-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.open-request-card__title {
  margin: 0;
  font-weight: 600;
  font-size: var(--font-body-lg-size);
  line-height: var(--font-h3-line);
  color: var(--color-text);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow-wrap: break-word;
  word-break: break-word;
}

.open-request-card__status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: 2px;
  padding: 2px var(--space-2);
  border-radius: 999px;
  background: var(--color-success-subtle);
  font-size: var(--font-caption-size);
  font-weight: 500;
  color: var(--color-success);
  white-space: nowrap;
}

.open-request-card__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}

.open-request-card__quantity {
  margin: 0;
  font-weight: 600;
  color: var(--color-text);
}

.open-request-card__location {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin: 0;
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
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-2);
  padding-left: calc(64px + var(--space-3));
  border-top: 1px solid var(--color-border);
}

.open-request-card__arrow {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transform: rotate(180deg);
}

@media (min-width: 768px) {
  .open-request-card__thumb {
    width: 88px;
    height: 88px;
  }

  .open-request-card__foot {
    padding-left: calc(88px + var(--space-3));
  }
}
</style>
