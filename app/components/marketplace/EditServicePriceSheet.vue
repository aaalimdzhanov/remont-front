<script setup lang="ts">
// Sheet "Изменить цену" — редактирует ТОЛЬКО price_from/price_to.
// work_type_id иммутабелен после создания (backend не принимает его в PUT,
// см. updateContractorServiceRequest в contractor_service_dto.go) — здесь
// показывается только как read-only подпись, поля для его смены нет вообще.
import type { ContractorService } from '~/api/types'

const props = defineProps<{
  open: boolean
  service: ContractorService | null
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  submit: [payload: { priceFrom: number | null, priceTo: number | null }]
  cancel: []
}>()

const priceFromInput = ref<string | number>('')
const priceToInput = ref<string | number>('')

watch(() => props.open, (isOpen) => {
  if (isOpen && props.service) {
    priceFromInput.value = props.service.priceFrom ?? ''
    priceToInput.value = props.service.priceTo ?? ''
  }
})

const priceFromEmpty = computed(() => isPriceInputEmpty(priceFromInput.value))
const priceToEmpty = computed(() => isPriceInputEmpty(priceToInput.value))
const priceFromNumber = computed<number | null>(() => (priceFromEmpty.value ? null : normalizePriceInput(priceFromInput.value)))
const priceToNumber = computed<number | null>(() => (priceToEmpty.value ? null : normalizePriceInput(priceToInput.value)))

const priceFromValid = computed(() => priceFromEmpty.value || isValidPriceValue(priceFromInput.value))
const priceToValid = computed(() => priceToEmpty.value || isValidPriceValue(priceToInput.value))
const rangeValid = computed(() => isPriceRangeValid(priceFromNumber.value, priceToNumber.value))

const isValid = computed(() => priceFromValid.value && priceToValid.value && rangeValid.value)

function handleSubmit() {
  if (!isValid.value || props.submitting) return
  emit('submit', { priceFrom: priceFromNumber.value, priceTo: priceToNumber.value })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="edit-price-sheet__overlay" @click.self="emit('cancel')">
      <div class="edit-price-sheet__panel" role="dialog" aria-modal="true" aria-label="Изменить цену">
        <div class="edit-price-sheet__handle" aria-hidden="true" />
        <h3 class="edit-price-sheet__title">
          Изменить цену
        </h3>
        <p v-if="service" class="text-secondary edit-price-sheet__hint">
          {{ service.workType }} · {{ unitLabel(service.unit) }}
        </p>

        <form class="edit-price-sheet__form" @submit.prevent="handleSubmit">
          <div class="edit-price-sheet__price-row">
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
                :disabled="submitting"
                autofocus
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
                :disabled="submitting"
              >
            </label>
          </div>

          <p v-if="!rangeValid" class="edit-price-sheet__error-text">
            Цена «до» не может быть меньше цены «от».
          </p>

          <p v-if="error" class="edit-price-sheet__error">
            {{ error }}
          </p>

          <button type="submit" class="btn btn-primary edit-price-sheet__submit" :disabled="!isValid || submitting">
            {{ submitting ? 'Сохраняем…' : 'Сохранить' }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.edit-price-sheet__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.edit-price-sheet__panel {
  width: 100%;
  max-width: 480px;
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

.edit-price-sheet__handle {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  margin-bottom: var(--space-3);
}

.edit-price-sheet__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.edit-price-sheet__hint {
  margin: var(--space-1) 0 var(--space-4);
}

.edit-price-sheet__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.edit-price-sheet__price-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.edit-price-sheet__error-text {
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-caption-size);
}

.edit-price-sheet__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}

.edit-price-sheet__submit {
  width: 100%;
  height: 48px;
}

@media (min-width: 768px) {
  .edit-price-sheet__overlay {
    align-items: center;
  }

  .edit-price-sheet__panel {
    border-radius: var(--radius-modal);
    padding-bottom: var(--space-6);
  }
}
</style>
