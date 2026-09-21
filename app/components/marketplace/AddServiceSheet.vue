<script setup lang="ts">
// Sheet "Добавить услугу" — та же оболочка overlay/panel, что и
// CreateOfferSheet.vue/ContractorProfileSheet.vue. Категория/вид работы —
// реальный Work Catalog (см. useMarketplace().catalogCategories/
// catalogWorkTypes, загружается один раз на странице профиля), НЕ хардкод.
// При смене категории несовместимый выбранный WorkType сбрасывается (см.
// задание, секция WorkType selection: "Если категория изменена — сбросить
// несовместимый WorkType").
import type { WorkCategory, WorkType } from '~/api/types'

const props = defineProps<{
  open: boolean
  categories: WorkCategory[]
  workTypes: WorkType[]
  // work_type_id уже добавленных услуг — исключаются из списка выбора, чтобы
  // не пытаться создать дубликат, который backend всё равно отклонит 409
  // (см. contractor_service_already_exists) — здесь просто более честный UX.
  existingWorkTypeIds: string[]
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  submit: [payload: { workTypeId: string, priceFrom: number | null, priceTo: number | null }]
  cancel: []
}>()

const selectedCategoryId = ref('')
const selectedWorkTypeId = ref('')
// '' — поле не заполнено (price_from/price_to необязательны на backend).
// Значения ниже могут прийти и строкой, и числом — тот же известный баг
// Vue v-model на <input type="number">, что и в CreateOfferSheet.vue.
const priceFromInput = ref<string | number>('')
const priceToInput = ref<string | number>('')

function resetForm() {
  selectedCategoryId.value = ''
  selectedWorkTypeId.value = ''
  priceFromInput.value = ''
  priceToInput.value = ''
}

watch(() => props.open, (isOpen) => {
  if (isOpen) resetForm()
})

const availableWorkTypesForCategory = computed(() => {
  if (!selectedCategoryId.value) return []
  return props.workTypes.filter(w => w.categoryId === selectedCategoryId.value && !props.existingWorkTypeIds.includes(w.id))
})

function handleCategoryChange(event: Event) {
  selectedCategoryId.value = (event.target as HTMLSelectElement).value
  selectedWorkTypeId.value = ''
}

const selectedWorkType = computed<WorkType | null>(
  () => props.workTypes.find(w => w.id === selectedWorkTypeId.value) ?? null,
)

const priceFromEmpty = computed(() => isPriceInputEmpty(priceFromInput.value))
const priceToEmpty = computed(() => isPriceInputEmpty(priceToInput.value))
const priceFromNumber = computed<number | null>(() => (priceFromEmpty.value ? null : normalizePriceInput(priceFromInput.value)))
const priceToNumber = computed<number | null>(() => (priceToEmpty.value ? null : normalizePriceInput(priceToInput.value)))

const priceFromValid = computed(() => priceFromEmpty.value || isValidPriceValue(priceFromInput.value))
const priceToValid = computed(() => priceToEmpty.value || isValidPriceValue(priceToInput.value))
const rangeValid = computed(() => isPriceRangeValid(priceFromNumber.value, priceToNumber.value))

const isValid = computed(() =>
  selectedWorkTypeId.value !== ''
  && priceFromValid.value
  && priceToValid.value
  && rangeValid.value,
)

function handleSubmit() {
  if (!isValid.value || props.submitting) return
  emit('submit', { workTypeId: selectedWorkTypeId.value, priceFrom: priceFromNumber.value, priceTo: priceToNumber.value })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="add-service-sheet__overlay" @click.self="emit('cancel')">
      <div class="add-service-sheet__panel" role="dialog" aria-modal="true" aria-label="Добавить услугу">
        <div class="add-service-sheet__handle" aria-hidden="true" />
        <h3 class="add-service-sheet__title">
          Добавить услугу
        </h3>

        <form class="add-service-sheet__form" @submit.prevent="handleSubmit">
          <label class="field">
            <span class="field__label">Категория работ</span>
            <select class="input" :value="selectedCategoryId" :disabled="submitting" @change="handleCategoryChange">
              <option value="" disabled>
                Выберите категорию
              </option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span class="field__label">Вид работы</span>
            <select v-model="selectedWorkTypeId" class="input" :disabled="submitting || !selectedCategoryId">
              <option value="" disabled>
                {{ selectedCategoryId ? 'Выберите вид работы' : 'Сначала выберите категорию' }}
              </option>
              <option v-for="workType in availableWorkTypesForCategory" :key="workType.id" :value="workType.id">
                {{ workType.name }}
              </option>
            </select>
            <span v-if="selectedCategoryId && availableWorkTypesForCategory.length === 0" class="text-caption text-muted">
              Все виды работ этой категории уже добавлены.
            </span>
          </label>

          <p v-if="selectedWorkType" class="text-caption text-muted add-service-sheet__unit">
            Единица измерения: {{ unitLabel(selectedWorkType.unit) }}
          </p>

          <div class="add-service-sheet__price-row">
            <label class="field">
              <span class="field__label">Цена от, сум</span>
              <input
                v-model="priceFromInput"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                class="input"
                :class="{ 'input--error': !priceFromEmpty && !priceFromValid }"
                placeholder="Например, 100000"
                :disabled="submitting"
              >
            </label>
            <label class="field">
              <span class="field__label">Цена до, сум</span>
              <input
                v-model="priceToInput"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                class="input"
                :class="{ 'input--error': !priceToEmpty && (!priceToValid || !rangeValid) }"
                placeholder="Например, 200000"
                :disabled="submitting"
              >
            </label>
          </div>

          <p v-if="!rangeValid" class="add-service-sheet__hint">
            Цена «до» не может быть меньше цены «от».
          </p>

          <p v-if="error" class="add-service-sheet__error">
            {{ error }}
          </p>

          <button type="submit" class="btn btn-primary add-service-sheet__submit" :disabled="!isValid || submitting">
            {{ submitting ? 'Добавляем…' : 'Добавить услугу' }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.add-service-sheet__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.add-service-sheet__panel {
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

.add-service-sheet__handle {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  margin-bottom: var(--space-3);
}

.add-service-sheet__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 var(--space-4);
}

.add-service-sheet__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.add-service-sheet__unit {
  margin: calc(var(--space-2) * -1) 0 0;
}

.add-service-sheet__price-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.add-service-sheet__hint {
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-caption-size);
}

.add-service-sheet__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}

.add-service-sheet__submit {
  width: 100%;
  height: 48px;
}

@media (min-width: 768px) {
  .add-service-sheet__overlay {
    align-items: center;
  }

  .add-service-sheet__panel {
    border-radius: var(--radius-modal);
    padding-bottom: var(--space-6);
  }
}
</style>
