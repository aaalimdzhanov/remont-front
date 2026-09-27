<script setup lang="ts">
// Карточка одной услуги в "Мои услуги" (ContractorProfile page). Только
// человекочитаемые поля — id/work_type_id (UUID) нигде не показываются
// пользователю (см. задание, секция 5: "Не показывать внутренние UUID").
import type { ContractorService } from '~/api/types'

defineProps<{ service: ContractorService, busy: boolean }>()
defineEmits<{ edit: [], delete: [] }>()

const { t, locale } = useI18n()
</script>

<template>
  <div class="service-card" :class="{ 'service-card--busy': busy }">
    <div class="service-card__info">
      <p class="service-card__name">
        {{ service.workType }}
      </p>
      <p class="text-caption text-muted service-card__meta">
        {{ unitLabel(service.unit, t) }} · {{ formatPriceRange(service.priceFrom, service.priceTo, t, locale, t('common.currency')) }}
      </p>
    </div>
    <div class="service-card__actions">
      <button type="button" class="service-card__icon-btn" :aria-label="t('contractorProfile.editPrice')" :disabled="busy" @click="$emit('edit')">
        <UiIcon name="edit" :size="16" />
      </button>
      <button type="button" class="service-card__icon-btn service-card__icon-btn--danger" :aria-label="t('contractorProfile.deleteService')" :disabled="busy" @click="$emit('delete')">
        <UiIcon name="trash" :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.service-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.service-card--busy {
  opacity: 0.6;
  pointer-events: none;
}

.service-card__info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.service-card__name {
  margin: 0;
  font-weight: 500;
  color: var(--color-text);
  overflow-wrap: break-word;
}

.service-card__meta {
  margin: 0;
}

.service-card__actions {
  flex-shrink: 0;
  display: flex;
  gap: var(--space-1);
}

.service-card__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-input);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.service-card__icon-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.service-card__icon-btn--danger:hover {
  color: var(--color-error);
  border-color: var(--color-error);
}
</style>
