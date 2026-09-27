<script setup lang="ts">
// Фильтр вкладки "Мастера" (см. задание "Marketplace Tabs v1", секция 6) —
// один критерий (вид работы), client-side, над уже загруженным списком
// мастеров (см. utils/marketplace.ts filterContractorsByWorkType/
// uniqueContractorWorkTypes в родительской странице). Никакого нового
// API-запроса, никакой backend-фильтрации, которой нет.
//
// Визуально — тот же "bottom sheet" приём (overlay+handle+панель), что уже
// использует MarketplaceFilters.vue для фильтров заявок — тот компонент не
// переиспользован напрямую (другой prop-контракт: там 4 критерия заявок,
// здесь один критерий мастеров, разные домены данных), но CSS-паттерн
// сознательно идентичен для визуальной консистентности (см. задание: "не
// создавать новую систему дизайна").
import type { ContractorWorkTypeOption } from '~/utils/marketplace'

defineProps<{
  open: boolean
  workTypes: ContractorWorkTypeOption[]
  selected: string | null
}>()

const emit = defineEmits<{ 'update:selected': [string | null], close: [] }>()

const { t } = useI18n()

function select(id: string | null) {
  emit('update:selected', id)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="cf-sheet__overlay" @click.self="emit('close')">
      <div class="cf-sheet__panel" role="dialog" aria-modal="true" :aria-label="t('marketplace.workTypeFilterTitle')">
        <div class="cf-sheet__handle" aria-hidden="true" />
        <h3 class="cf-sheet__title">
          {{ t('contractorProfile.workTypeLabel') }}
        </h3>

        <div class="cf-sheet__options" role="radiogroup" :aria-label="t('contractorProfile.workTypeLabel')">
          <button
            type="button"
            class="cf-sheet__option"
            :class="{ 'cf-sheet__option--active': selected === null }"
            role="radio"
            :aria-checked="selected === null"
            @click="select(null)"
          >
            {{ t('marketplace.allWorkTypes') }}
            <UiIcon v-if="selected === null" name="check" :size="16" />
          </button>
          <button
            v-for="option in workTypes"
            :key="option.id"
            type="button"
            class="cf-sheet__option"
            :class="{ 'cf-sheet__option--active': selected === option.id }"
            role="radio"
            :aria-checked="selected === option.id"
            @click="select(option.id)"
          >
            {{ option.name }}
            <UiIcon v-if="selected === option.id" name="check" :size="16" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cf-sheet__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.cf-sheet__panel {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  background: var(--color-surface);
  border-top-left-radius: var(--radius-modal);
  border-top-right-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  padding: var(--space-3) var(--space-5) var(--space-6);
  padding-bottom: max(var(--space-6), env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.cf-sheet__handle {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  margin-bottom: var(--space-3);
}

.cf-sheet__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 var(--space-3);
}

.cf-sheet__options {
  display: flex;
  flex-direction: column;
}

.cf-sheet__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: 48px;
  padding: 0 var(--space-3);
  border: none;
  background: none;
  border-radius: var(--radius-input);
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.cf-sheet__option:hover {
  background: var(--color-surface-subtle);
}

.cf-sheet__option--active {
  color: var(--color-primary);
  font-weight: 500;
}

@media (min-width: 640px) {
  .cf-sheet__overlay {
    align-items: center;
  }

  .cf-sheet__panel {
    border-radius: var(--radius-modal);
  }
}
</style>
