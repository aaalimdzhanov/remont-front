<script setup lang="ts">
// Screen 5 — расчёт количества. КРИТИЧНО (см. задание): quantity для
// quantity_mode='automatic' НИКОГДА не считается здесь — до нажатия
// "Добавить работу" номер вообще не показывается, только информационный
// баннер. Реальное число появляется единственный раз — из ответа backend на
// POST (result prop, который передаёт родитель после успешного addWork()).
// Для 'manual' — наоборот: quantity здесь исключительно пользовательский
// ввод, backend его не пересчитывает.
import type { Building } from '~/types/building'
import type { WorkType, WorkUnit } from '~/api/types'
import { calculateRoomArea } from '~/geometry/calculations'

// result — ТОЛЬКО quantity/unit (не весь ProjectWork): Guest Work Builder
// передаёт сюда локальный объект без status/id/timestamps (см.
// useGuestWorkBuilder.addWork) — ProjectWork по-прежнему структурно подходит
// (authenticated-вызывающая сторона не меняется), просто тип сузили до того,
// что этот компонент реально читает.
const props = defineProps<{
  workType: WorkType
  building: Building
  roomId: string | null
  isProjectLevel: boolean
  isCreating: boolean
  createError: string | null
  result: { quantity: number, unit: WorkUnit } | null
}>()

const emit = defineEmits<{ confirm: [quantity?: number], done: [] }>()

const { t } = useI18n()

const room = computed(() => (props.roomId ? props.building.rooms.find(r => r.id === props.roomId) ?? null : null))
const contextLabel = computed(() => {
  if (props.isProjectLevel) return t('builder.workBuilder.wholeProject')
  return room.value ? t('builder.workBuilder.roomAreaLabel', { name: room.value.name, area: calculateRoomArea(room.value).toFixed(1) }) : ''
})

const isManual = computed(() => props.workType.quantityMode === 'manual')
// ref('') стартует строкой, но Vue у <input type="number"> кастит v-model в
// число автоматически при любом реальном вводе (см. рантайм vModelText —
// el.type==='number' включает castToNumber ВСЕГДА, даже без модификатора
// .number) — то есть после ввода это уже number, не string. Валидация ниже
// работает с обоими вариантами, не полагаясь на конкретный тип.
const manualQuantity = ref<string | number>('')
const manualQuantityEmpty = computed(() => manualQuantity.value === '' || manualQuantity.value === null)
const manualQuantityInvalid = computed(() => {
  if (!isManual.value) return false
  if (manualQuantityEmpty.value) return true
  const n = Number(manualQuantity.value)
  return Number.isNaN(n) || n < 0
})

function handleSubmit() {
  if (props.isCreating) return
  if (isManual.value) {
    if (manualQuantityInvalid.value) return
    emit('confirm', Number(manualQuantity.value))
  } else {
    emit('confirm')
  }
}

// См. resolveCalcSubmitLabel() в utils/work.ts — до этой правки подпись не
// менялась при ошибке, оставаясь "Добавить работу" даже после явного сбоя
// (задание, секция "КНОПКА 'ДОБАВИТЬ РАБОТУ'": loading/success/error — 3
// разные подписи, не 2).
const submitLabel = computed(() => resolveCalcSubmitLabel(props.isCreating, !!props.createError, t))
</script>

<template>
  <div class="calc-step">
    <p class="text-h2 calc-step__name">
      {{ workType.name }}
    </p>
    <p v-if="contextLabel" class="text-secondary calc-step__context">
      {{ contextLabel }}
    </p>

    <template v-if="!result">
      <div v-if="!isManual" class="calc-step__info-banner">
        <UiIcon name="alert" :size="16" />
        <span>{{ t('builder.workBuilder.autoCalcBanner', { source: measurementSourceLabel(workType.measurementSource, t) }) }}</span>
      </div>

      <div v-else class="calc-step__manual">
        <label class="field">
          <span class="field__label">{{ t('builder.workBuilder.quantity') }}</span>
          <div class="field__unit-input">
            <input
              v-model="manualQuantity"
              type="number"
              min="0"
              step="any"
              inputmode="decimal"
              class="input"
              :class="{ 'input--error': !manualQuantityEmpty && manualQuantityInvalid }"
              placeholder="0"
              :disabled="isCreating"
            >
            <span class="field__unit">{{ unitLabel(workType.unit, t) }}</span>
          </div>
        </label>
        <p class="text-caption text-muted">
          {{ t('builder.workBuilder.manualQuantityHint') }}
        </p>
      </div>

      <div class="calc-step__preview">
        <WorkRoomPreviewThumb :building="building" :room-id="isProjectLevel ? null : roomId" />
      </div>

      <p v-if="createError" class="calc-step__error">
        {{ createError }}
      </p>

      <button
        type="button"
        class="btn btn-primary calc-step__submit"
        :disabled="isCreating || (isManual && manualQuantityInvalid)"
        @click="handleSubmit"
      >
        {{ submitLabel }}
      </button>
    </template>

    <template v-else>
      <p class="text-caption text-muted calc-step__field-label">
        {{ measurementSourceLabel(workType.measurementSource, t) }}
      </p>
      <p class="calc-step__quantity">
        {{ formatQuantity(result.quantity, result.unit, t) }}
      </p>

      <div class="calc-step__preview">
        <WorkRoomPreviewThumb :building="building" :room-id="isProjectLevel ? null : roomId" />
      </div>

      <p class="calc-step__success">
        <UiIcon name="check" :size="16" />
        <span v-if="!isManual">{{ t('builder.workBuilder.autoCalcSuccess') }}</span>
        <span v-else>{{ t('builder.workBuilder.manualQuantitySet') }}</span>
      </p>

      <button type="button" class="btn btn-primary calc-step__submit" @click="emit('done')">
        {{ t('common.done') }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.calc-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.calc-step__name {
  margin: 0;
}

.calc-step__context {
  margin: calc(-1 * var(--space-2)) 0 var(--space-2);
}

.calc-step__info-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-primary-subtle);
  color: var(--color-text);
  font-size: var(--font-small-size);
}

.calc-step__info-banner :deep(svg) {
  flex-shrink: 0;
  color: var(--color-primary);
  margin-top: 1px;
}

.calc-step__manual {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.calc-step__preview {
  width: 100%;
  height: 180px;
  margin: var(--space-2) 0;
}

.calc-step__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}

.calc-step__submit {
  width: 100%;
  height: 48px;
  margin-top: var(--space-2);
}

.calc-step__field-label {
  margin: 0;
}

.calc-step__quantity {
  margin: 0 0 var(--space-2);
  font-size: 40px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--color-text);
}

.calc-step__success {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin: 0;
  color: var(--color-success);
  font-size: var(--font-small-size);
}

.calc-step__success :deep(svg) {
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
