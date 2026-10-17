<script setup lang="ts">
// Карточка одной услуги в "Мои услуги" (ContractorProfile page). Только
// человекочитаемые поля — id/work_type_id (UUID) нигде не показываются
// пользователю (см. задание, секция 5: "Не показывать внутренние UUID").
//
// Отключённая услуга (is_active:false) остаётся в списке и сохраняет цены —
// backend её не удаляет (PATCH .../status меняет только is_active). Поэтому
// здесь она приглушена и помечена бейджем, но цена/единица по-прежнему
// видны, а "Изменить цену" остаётся доступным.
import type { ContractorService } from '~/api/types'

const props = defineProps<{ service: ContractorService, busy: boolean }>()
const emit = defineEmits<{ edit: [], delete: [], toggle: [nextIsActive: boolean] }>()

const { t, locale } = useI18n()

function handleToggle() {
  if (props.busy) return
  emit('toggle', !props.service.isActive)
}
</script>

<template>
  <div class="service-card" :class="{ 'service-card--busy': busy, 'service-card--inactive': !service.isActive }">
    <div class="service-card__info">
      <p class="service-card__name">
        {{ service.workType }}
        <span v-if="!service.isActive" class="service-card__badge">{{ t('contractorProfile.serviceDisabledBadge') }}</span>
      </p>
      <p class="text-caption text-muted service-card__meta">
        {{ unitLabel(service.unit, t) }} · {{ formatPriceRange(service.priceFrom, service.priceTo, t, locale, t('common.currency')) }}
      </p>
    </div>
    <div class="service-card__actions">
      <button
        type="button"
        role="switch"
        class="service-card__switch"
        :class="{ 'service-card__switch--on': service.isActive }"
        :aria-checked="service.isActive"
        :aria-label="service.isActive ? t('contractorProfile.disableServiceAria', { workType: service.workType }) : t('contractorProfile.enableServiceAria', { workType: service.workType })"
        :disabled="busy"
        @click="handleToggle"
      >
        <span class="service-card__switch-knob" />
      </button>
      <button type="button" class="service-card__icon-btn" :aria-label="t('contractorProfile.editPrice')" :disabled="busy" @click="emit('edit')">
        <UiIcon name="edit" :size="16" />
      </button>
      <button type="button" class="service-card__icon-btn service-card__icon-btn--danger" :aria-label="t('contractorProfile.deleteService')" :disabled="busy" @click="emit('delete')">
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

/* Отключённая услуга — приглушённая, но не "удалённая": бейдж + более
   бледный фон, при этом цена/единица остаются читаемыми (данные никуда
   не делись, см. doc comment в script). */
.service-card--inactive {
  background: var(--color-surface-subtle);
  border-style: dashed;
}

.service-card--inactive .service-card__name {
  color: var(--color-text-secondary);
}

.service-card__badge {
  display: inline-block;
  margin-left: var(--space-2);
  padding: 1px var(--space-2);
  border-radius: 999px;
  background: var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-caption-size);
  font-weight: 500;
  white-space: nowrap;
  vertical-align: middle;
}

/* Переключатель включено/отключено. Отдельного Switch-компонента в проекте
   нет, поэтому это обычная <button role="switch"> на тех же токенах —
   доступна с клавиатуры, имеет aria-checked и 44px touch target. */
.service-card__switch {
  flex-shrink: 0;
  position: relative;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-card__switch::before {
  content: '';
  width: 40px;
  height: 24px;
  border-radius: 999px;
  background: var(--color-border-strong);
  transition: background var(--transition-fast);
}

.service-card__switch--on::before {
  background: var(--color-primary);
}

.service-card__switch-knob {
  position: absolute;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: 0 1px 2px rgba(37, 37, 37, 0.25);
  transition: transform var(--transition-fast);
}

.service-card__switch--on .service-card__switch-knob {
  transform: translateX(16px);
}

.service-card__switch:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 999px;
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
