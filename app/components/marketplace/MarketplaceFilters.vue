<script setup lang="ts">
// Явные фильтры /marketplace (см. задание, секции 9-11): mobile — кнопка
// "Фильтры N" + bottom sheet; desktop — всегда видимый горизонтальный
// filter bar, без отдельной кнопки (изменения применяются сразу). Оба
// режима рендерятся одновременно и переключаются CSS media query (тот же
// подход, что и dual mobile/desktop composition в Builder — см. память
// проекта), не JS-детект viewport. Фильтрация — только client-side, по уже
// загруженному списку открытых заявок (см. utils/marketplace.ts
// filterOpenRequests) — endpoint /marketplace/requests/open параметров не
// принимает.
import type { WorkCategory, WorkType } from '~/api/types'
import type { RequestFilters } from '~/utils/marketplace'

defineProps<{
  categories: WorkCategory[]
  workTypes: WorkType[]
  filters: RequestFilters
  activeCount: number
}>()

const emit = defineEmits<{ update: [patch: Partial<RequestFilters>], reset: [] }>()

const { t } = useI18n()

const sheetOpen = ref(false)
</script>

<template>
  <div class="mp-filters">
    <button type="button" class="btn btn-secondary mp-filters__toggle" @click="sheetOpen = true">
      <UiIcon name="sort" :size="16" />
      {{ t('marketplace.filters') }}
      <span v-if="activeCount > 0" class="mp-filters__badge">{{ activeCount }}</span>
    </button>

    <div class="mp-filters__inline">
      <MarketplaceFilterFields :categories="categories" :work-types="workTypes" :filters="filters" compact @update="emit('update', $event)" />
      <button v-if="activeCount > 0" type="button" class="btn btn-ghost mp-filters__inline-reset" @click="emit('reset')">
        {{ t('common.reset') }}
      </button>
    </div>

    <Teleport to="body">
      <div v-if="sheetOpen" class="mp-filters__overlay" @click.self="sheetOpen = false">
        <div class="mp-filters__panel" role="dialog" aria-modal="true" :aria-label="t('marketplace.filters')">
          <div class="mp-filters__handle" aria-hidden="true" />
          <h3 class="mp-filters__title">
            {{ t('marketplace.filters') }}
          </h3>

          <MarketplaceFilterFields :categories="categories" :work-types="workTypes" :filters="filters" @update="emit('update', $event)" />

          <div class="mp-filters__actions">
            <button type="button" class="btn btn-secondary" @click="emit('reset')">
              {{ t('common.reset') }}
            </button>
            <button type="button" class="btn btn-primary" @click="sheetOpen = false">
              {{ t('common.apply') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.mp-filters {
  margin-bottom: var(--space-4);
}

.mp-filters__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
}

.mp-filters__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-caption-size);
  font-weight: 600;
}

.mp-filters__inline {
  display: none;
}

.mp-filters__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.mp-filters__panel {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface);
  border-top-left-radius: var(--radius-modal);
  border-top-right-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  padding: var(--space-3) var(--space-6) var(--space-6);
  padding-bottom: max(var(--space-6), env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.mp-filters__handle {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  margin-bottom: var(--space-3);
}

.mp-filters__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 var(--space-4);
}

.mp-filters__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-5);
}

.mp-filters__actions .btn {
  flex: 1;
  min-height: 48px;
}

@media (min-width: 768px) {
  .mp-filters__toggle {
    display: none;
  }

  .mp-filters__inline {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
  }

  .mp-filters__inline-reset {
    height: 44px;
  }

  /* Safety net: sheet has no reachable trigger on desktop (button above is
     hidden), but force-hide in case sheetOpen was true before a resize. */
  .mp-filters__overlay {
    display: none;
  }
}
</style>
