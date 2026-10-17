<script setup lang="ts">
// Sheet "Добавить услугу" — та же оболочка overlay/panel, что и
// CreateOfferSheet.vue/ContractorProfileSheet.vue. Категория/вид работы —
// реальный Work Catalog (см. useMarketplace().catalogCategories/
// catalogWorkTypes, загружается один раз на странице профиля), НЕ хардкод.
// При смене категории несовместимый выбранный WorkType сбрасывается (см.
// задание, секция WorkType selection: "Если категория изменена — сбросить
// несовместимый WorkType").
import type { ContractorService, WorkCategory, WorkType } from '~/api/types'
import { availableWorkTypesForCategory, findInactiveServiceForWorkType } from '~/utils/contractorService'

const props = defineProps<{
  open: boolean
  categories: WorkCategory[]
  workTypes: WorkType[]
  // work_type_id уже ВКЛЮЧЁННЫХ услуг — исключаются из списка выбора: для
  // них backend вернёт 409 contractor_service_already_exists, добавлять
  // нечего.
  activeWorkTypeIds: string[]
  // Уже добавленные, но ОТКЛЮЧЁННЫЕ услуги — наоборот, показываются в
  // списке (раньше скрывались вместе с активными, и вид работ выглядел
  // "навсегда недоступным"). Выбор такой услуги переводит sheet в режим
  // реактивации: тот же POST включит её обратно, сохранив прежние цены,
  // поэтому поля цены в этом режиме не показываются.
  inactiveServices: ContractorService[]
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  submit: [payload: { workTypeId: string, priceFrom: number | null, priceTo: number | null }]
  reactivate: [service: ContractorService]
  cancel: []
}>()

const { t, locale } = useI18n()

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

const availableWorkTypes = computed(() => availableWorkTypesForCategory(props.workTypes, selectedCategoryId.value, props.activeWorkTypeIds))

// Выбран вид работы, который уже есть у мастера в отключённом состоянии →
// режим "Включить" вместо "Добавить" (цены сохранятся на backend).
const reactivatingService = computed<ContractorService | null>(
  () => findInactiveServiceForWorkType(props.inactiveServices, selectedWorkTypeId.value),
)

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

// В режиме реактивации поля цены вообще не показываются, поэтому их
// валидность не участвует в проверке — достаточно выбранного вида работы.
const isValid = computed(() => {
  if (selectedWorkTypeId.value === '') return false
  if (reactivatingService.value) return true
  return priceFromValid.value && priceToValid.value && rangeValid.value
})

function handleSubmit() {
  if (!isValid.value || props.submitting) return
  if (reactivatingService.value) {
    emit('reactivate', reactivatingService.value)
    return
  }
  emit('submit', { workTypeId: selectedWorkTypeId.value, priceFrom: priceFromNumber.value, priceTo: priceToNumber.value })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="add-service-sheet__overlay" @click.self="emit('cancel')">
      <div class="add-service-sheet__panel" role="dialog" aria-modal="true" :aria-label="t('contractorProfile.addServiceTitle')">
        <div class="add-service-sheet__handle" aria-hidden="true" />
        <h3 class="add-service-sheet__title">
          {{ t('contractorProfile.addServiceTitle') }}
        </h3>

        <form class="add-service-sheet__form" @submit.prevent="handleSubmit">
          <label class="field">
            <span class="field__label">{{ t('contractorProfile.categoryLabel') }}</span>
            <select class="input" :value="selectedCategoryId" :disabled="submitting" @change="handleCategoryChange">
              <option value="" disabled>
                {{ t('contractorProfile.selectCategory') }}
              </option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span class="field__label">{{ t('contractorProfile.workTypeLabel') }}</span>
            <select v-model="selectedWorkTypeId" class="input" :disabled="submitting || !selectedCategoryId">
              <option value="" disabled>
                {{ selectedCategoryId ? t('contractorProfile.selectWorkType') : t('contractorProfile.selectCategoryFirst') }}
              </option>
              <option v-for="workType in availableWorkTypes" :key="workType.id" :value="workType.id">
                {{ findInactiveServiceForWorkType(inactiveServices, workType.id) ? t('contractorProfile.workTypeDisabledOption', { workType: workType.name }) : workType.name }}
              </option>
            </select>
            <span v-if="selectedCategoryId && availableWorkTypes.length === 0" class="text-caption text-muted">
              {{ t('contractorProfile.allWorkTypesAdded') }}
            </span>
          </label>

          <p v-if="selectedWorkType" class="text-caption text-muted add-service-sheet__unit">
            {{ t('contractorProfile.unitLabel', { unit: unitLabel(selectedWorkType.unit, t) }) }}
          </p>

          <!-- Режим реактивации: цены не редактируются — backend при
               включении сохраняет уже сохранённые значения (см. doc comment
               в script), поэтому показываем их read-only, а не поля ввода. -->
          <p v-if="reactivatingService" class="add-service-sheet__reactivate-note">
            {{ t('contractorProfile.reactivateHint', {
              price: formatPriceRange(reactivatingService.priceFrom, reactivatingService.priceTo, t, locale, t('common.currency')),
            }) }}
          </p>

          <div v-if="!reactivatingService" class="add-service-sheet__price-row">
            <label class="field">
              <span class="field__label">{{ t('contractorProfile.priceFromLabel') }}</span>
              <input
                v-model="priceFromInput"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                class="input"
                :class="{ 'input--error': !priceFromEmpty && !priceFromValid }"
                :placeholder="t('contractorProfile.priceFromPlaceholder')"
                :disabled="submitting"
              >
            </label>
            <label class="field">
              <span class="field__label">{{ t('contractorProfile.priceToLabel') }}</span>
              <input
                v-model="priceToInput"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                class="input"
                :class="{ 'input--error': !priceToEmpty && (!priceToValid || !rangeValid) }"
                :placeholder="t('contractorProfile.priceToPlaceholder')"
                :disabled="submitting"
              >
            </label>
          </div>

          <p v-if="!reactivatingService && !rangeValid" class="add-service-sheet__hint">
            {{ t('errors.invalid_price_range') }}
          </p>

          <p v-if="error" class="add-service-sheet__error">
            {{ error }}
          </p>

          <button type="submit" class="btn btn-primary add-service-sheet__submit" :disabled="!isValid || submitting">
            <template v-if="submitting">
              {{ reactivatingService ? t('common.saving') : t('common.adding') }}
            </template>
            <template v-else>
              {{ reactivatingService ? t('contractorProfile.enableServiceSubmit') : t('contractorProfile.addServiceSubmit') }}
            </template>
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

.add-service-sheet__reactivate-note {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-primary-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
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
