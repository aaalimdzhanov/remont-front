<script setup lang="ts">
// Screen 3 — категории работ. Загружаются с backend (GET /api/v1/work-categories),
// НЕ hardcode — если backend добавит 9-ю категорию, она появится сама.
import type { WorkCategory } from '~/api/types'

defineProps<{
  categories: WorkCategory[]
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{ select: [categoryId: string], retry: [] }>()
</script>

<template>
  <div class="category-step">
    <p class="text-h3 category-step__title">
      Категория работ
    </p>

    <div v-if="loading" class="category-step__grid" aria-busy="true">
      <div v-for="n in 6" :key="n" class="category-step__skeleton" />
    </div>

    <div v-else-if="error" class="category-step__error">
      <p class="text-secondary">
        {{ error }}
      </p>
      <button type="button" class="btn btn-secondary" @click="emit('retry')">
        Повторить
      </button>
    </div>

    <div v-else class="category-step__grid">
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        class="category-step__card"
        @click="emit('select', category.id)"
      >
        <UiIcon :name="categoryIcon(category.slug)" :size="24" class="category-step__icon" />
        <span>{{ category.name }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.category-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.category-step__title {
  margin: 0;
}

.category-step__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.category-step__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  aspect-ratio: 1.3;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: var(--font-small-size);
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.category-step__card:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.category-step__icon {
  color: var(--color-primary);
}

.category-step__skeleton {
  aspect-ratio: 1.3;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: category-step-pulse 1.4s ease-in-out infinite;
}

@keyframes category-step-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.category-step__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  text-align: center;
}

@media (min-width: 1200px) {
  .category-step__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
