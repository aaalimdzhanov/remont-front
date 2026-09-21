<script setup lang="ts">
// Общие поля фильтра — переиспользуются и в мобильном bottom sheet, и в
// desktop inline filter bar (см. MarketplaceFilters.vue), чтобы не держать
// две копии одной и той же формы. Каждое изменение применяется сразу (без
// отдельной кнопки "Применить" внутри самой формы — см. задание, секция
// DESKTOP FILTER UX: фильтры на desktop применяются немедленно; на mobile
// кнопка "Применить" в MarketplaceFilters.vue просто закрывает sheet).
import type { WorkCategory, WorkType } from '~/api/types'
import type { RequestFilters } from '~/utils/marketplace'

// compact=true — горизонтальный desktop filter bar (см. задание, секция
// DESKTOP FILTER UX: "horizontal filter bar", не боковая панель); по
// умолчанию — вертикальный список полей для мобильного bottom sheet.
const props = withDefaults(defineProps<{
  categories: WorkCategory[]
  workTypes: WorkType[]
  filters: RequestFilters
  compact?: boolean
}>(), {
  compact: false,
})

const emit = defineEmits<{ update: [patch: Partial<RequestFilters>] }>()

const workTypesForCategory = computed(() => {
  if (!props.filters.categoryId) return []
  return props.workTypes.filter(w => w.categoryId === props.filters.categoryId)
})

function handleCategoryChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  // Категория изменена — сбрасываем несовместимый выбранный WorkType (см.
  // задание, секция WorkType selection), а не только на форме "Добавить услугу".
  emit('update', { categoryId: value || null, workTypeId: null })
}

function handleWorkTypeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update', { workTypeId: value || null })
}

// quantity — реальное количество (может быть дробным, м²/м), не деньги: не
// используем normalizePriceInput/Math.round здесь, только Number(raw).
function handleQuantityInput(field: 'quantityMin' | 'quantityMax', event: Event) {
  const raw = (event.target as HTMLInputElement).value
  if (raw === '') {
    emit('update', { [field]: null })
    return
  }
  const n = Number(raw)
  emit('update', { [field]: Number.isFinite(n) ? n : null })
}

function handleSortChange(event: Event) {
  emit('update', { sort: (event.target as HTMLSelectElement).value as RequestFilters['sort'] })
}
</script>

<template>
  <div class="filter-fields" :class="{ 'filter-fields--compact': compact }">
    <label class="field">
      <span class="field__label">Категория</span>
      <select class="input" :value="filters.categoryId ?? ''" @change="handleCategoryChange">
        <option value="">
          Все категории
        </option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.name }}
        </option>
      </select>
    </label>

    <label class="field">
      <span class="field__label">Вид работы</span>
      <select class="input" :value="filters.workTypeId ?? ''" :disabled="!filters.categoryId" @change="handleWorkTypeChange">
        <option value="">
          {{ filters.categoryId ? 'Все виды работ' : 'Сначала выберите категорию' }}
        </option>
        <option v-for="workType in workTypesForCategory" :key="workType.id" :value="workType.id">
          {{ workType.name }}
        </option>
      </select>
    </label>

    <div class="filter-fields__quantity-row">
      <label class="field">
        <span class="field__label">Количество от</span>
        <input
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          class="input"
          :value="filters.quantityMin ?? ''"
          @input="handleQuantityInput('quantityMin', $event)"
        >
      </label>
      <label class="field">
        <span class="field__label">Количество до</span>
        <input
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          class="input"
          :value="filters.quantityMax ?? ''"
          @input="handleQuantityInput('quantityMax', $event)"
        >
      </label>
    </div>

    <label class="field">
      <span class="field__label">Сортировка</span>
      <select class="input" :value="filters.sort" @change="handleSortChange">
        <option value="newest">
          Сначала новые
        </option>
        <option value="oldest">
          Сначала старые
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.filter-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.filter-fields__quantity-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.filter-fields--compact {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
}

.filter-fields--compact .field {
  width: 160px;
}

.filter-fields--compact .filter-fields__quantity-row {
  width: 160px;
  grid-template-columns: 1fr;
  gap: var(--space-1);
}
</style>
