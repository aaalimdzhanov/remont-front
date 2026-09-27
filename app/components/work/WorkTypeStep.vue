<script setup lang="ts">
// Screen 4 — вид работы внутри выбранной категории (GET /api/v1/work-types
// ?category_id=...), НЕ hardcode. Поиск — по уже загруженному списку этой
// категории, без нового backend endpoint (см. задание, секция SEARCH).
import type { WorkCategory, WorkType } from '~/api/types'

const props = defineProps<{
  workTypes: WorkType[]
  loading: boolean
  error: string | null
  category: WorkCategory | null
  searchQuery: string
}>()

const emit = defineEmits<{ select: [workTypeId: string], retry: [], 'update:searchQuery': [value: string] }>()

const { t } = useI18n()

const filtered = computed(() => {
  const q = props.searchQuery.trim().toLowerCase()
  if (!q) return props.workTypes
  return props.workTypes.filter(w => w.name.toLowerCase().includes(q))
})
</script>

<template>
  <div class="type-step">
    <p class="text-h3 type-step__title">
      {{ category?.name ?? t('builder.workBuilder.workType') }}
    </p>

    <label class="type-step__search">
      <UiIcon name="search" :size="16" class="type-step__search-icon" />
      <input
        :value="searchQuery"
        type="search"
        :placeholder="t('builder.workBuilder.searchWorkPlaceholder')"
        :aria-label="t('builder.workBuilder.searchWorkAriaLabel')"
        @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
      >
    </label>

    <div v-if="loading" class="type-step__list" aria-busy="true">
      <div v-for="n in 4" :key="n" class="type-step__skeleton" />
    </div>

    <div v-else-if="error" class="type-step__error">
      <p class="text-secondary">
        {{ error }}
      </p>
      <button type="button" class="btn btn-secondary" @click="emit('retry')">
        {{ t('common.retry') }}
      </button>
    </div>

    <p v-else-if="filtered.length === 0" class="text-secondary type-step__no-results">
      {{ t('builder.workBuilder.nothingFound') }}
    </p>

    <ul v-else class="type-step__list">
      <li v-for="workType in filtered" :key="workType.id">
        <button type="button" class="type-step__item" @click="emit('select', workType.id)">
          <UiIcon :name="workTypeIcon(workType.slug, category?.slug ?? '')" :size="20" class="type-step__icon" />
          <span class="type-step__info">
            <span class="type-step__name">{{ workType.name }}</span>
            <span class="text-caption text-muted">{{ unitLabel(workType.unit, t) }}</span>
          </span>
          <UiIcon name="chevron-left" :size="16" class="type-step__chevron" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.type-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.type-step__title {
  margin: 0;
}

.type-step__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-input);
  background: var(--color-surface);
}

.type-step__search-icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.type-step__search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  color: var(--color-text);
}

.type-step__search input::placeholder {
  color: var(--color-text-muted);
}

.type-step__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.type-step__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 56px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.type-step__item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.type-step__icon {
  flex-shrink: 0;
  color: var(--color-primary);
}

.type-step__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.type-step__name {
  font-weight: 500;
  color: var(--color-text);
}

.type-step__chevron {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transform: rotate(180deg);
}

.type-step__skeleton {
  height: 56px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: type-step-pulse 1.4s ease-in-out infinite;
}

@keyframes type-step-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.type-step__error,
.type-step__no-results {
  padding: var(--space-6);
  text-align: center;
}
</style>
