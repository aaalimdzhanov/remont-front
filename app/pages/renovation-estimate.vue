<script setup lang="ts">
// /renovation-estimate — целевая страница CTA "Рассчитать стоимость" с
// /marketplace (см. RenovationEstimateCard.vue). Публичный 5-шаговый wizard
// → POST /api/v1/renovation-estimates (см. doc comment в
// app/api/renovationEstimate.ts) → экран результата с CTA в Guest Builder.
// Ровно 5 вопросов, без города/района/бюджета — backend-pricing модель их
// сейчас не поддерживает (см. remont-back
// internal/domain/renovationestimate). Порядок/состав вопросов не менять.
//
// Без middleware:'auth' — карточка явно обещает "Без регистрации", сам
// backend-эндпоинт тоже полностью публичный/stateless (не читает
// Authorization, ничего не сохраняет) — см. app/api/renovationEstimate.ts.
definePageMeta({ layout: 'app' })

import type { RenovationCondition, RenovationFinishLevel, RenovationPropertyType, RenovationWorkType } from '~/api/types'
import { useRenovationEstimateFlow, RENOVATION_ESTIMATE_STEP_COUNT } from '~/composables/useRenovationEstimateFlow'
import { isValidRenovationArea, formatRenovationMillions } from '~/utils/renovationEstimate'

const { t, locale } = useI18n()
useHead({ title: computed(() => t('marketplace.renovationEstimatePageTitle')) })

const STEP_COUNT = RENOVATION_ESTIMATE_STEP_COUNT
const {
  step, propertyType, area, condition, finishLevel, works,
  areaTouched, worksTouched, submitting, submitError, result,
  canProceed, toggleWork, goBack, goNext, restart, dispose,
} = useRenovationEstimateFlow()

onBeforeUnmount(dispose)

const PROPERTY_TYPES: { value: RenovationPropertyType, labelKey: string }[] = [
  { value: 'apartment', labelKey: 'renovationEstimate.propertyTypeApartment' },
  { value: 'house', labelKey: 'renovationEstimate.propertyTypeHouse' },
]

const CONDITIONS: { value: RenovationCondition, labelKey: string, hintKey: string }[] = [
  { value: 'shell', labelKey: 'renovationEstimate.conditionShell', hintKey: 'renovationEstimate.conditionShellHint' },
  { value: 'pre_finish', labelKey: 'renovationEstimate.conditionPreFinish', hintKey: 'renovationEstimate.conditionPreFinishHint' },
  { value: 'secondary', labelKey: 'renovationEstimate.conditionSecondary', hintKey: 'renovationEstimate.conditionSecondaryHint' },
  { value: 'major_repair', labelKey: 'renovationEstimate.conditionMajorRepair', hintKey: 'renovationEstimate.conditionMajorRepairHint' },
]

const FINISH_LEVELS: { value: RenovationFinishLevel, labelKey: string }[] = [
  { value: 'economy', labelKey: 'renovationEstimate.finishLevelEconomy' },
  { value: 'standard', labelKey: 'renovationEstimate.finishLevelStandard' },
  { value: 'premium', labelKey: 'renovationEstimate.finishLevelPremium' },
]

// Иконки — фиксированный маленький набор под ровно эти backend-значения
// (не переиспользует slug-эвристику app/utils/work.ts workTypeIcon(): та
// писана под реальные Work Catalog slug'и вроде "floor-tiles"/"outlet", а
// не под этот отдельный fixed enum калькулятора).
// 'other' НАМЕРЕННО не в этом списке (v2): backend его по-прежнему
// принимает (RenovationWorkType не меняли), но сейчас на backend он связан
// с демонтажем напольного покрытия — показывать его как общий "Другое"
// вводило бы пользователя в заблуждение. Временная мера до отдельной
// задачи на backend.
const WORK_OPTIONS: { value: RenovationWorkType, labelKey: string, icon: 'wall' | 'layers' | 'ceiling' | 'bolt' | 'faucet' | 'door' }[] = [
  { value: 'walls', labelKey: 'renovationEstimate.workWalls', icon: 'wall' },
  { value: 'floor', labelKey: 'renovationEstimate.workFloor', icon: 'layers' },
  { value: 'ceiling', labelKey: 'renovationEstimate.workCeiling', icon: 'ceiling' },
  { value: 'electricity', labelKey: 'renovationEstimate.workElectricity', icon: 'bolt' },
  { value: 'plumbing', labelKey: 'renovationEstimate.workPlumbing', icon: 'faucet' },
  { value: 'doors', labelKey: 'renovationEstimate.workDoors', icon: 'door' },
]

const areaError = computed(() => {
  if (!areaTouched.value || isValidRenovationArea(area.value)) return null
  return area.value === null ? t('renovationEstimate.areaErrorRequired') : t('renovationEstimate.areaErrorRange')
})

const currencyLabel = computed(() => t('common.currency'))
</script>

<template>
  <main class="estimate-page">
    <!-- Экран результата — заменяет весь wizard, не ещё один "шаг" (step
         state больше не нужен). -->
    <section v-if="result" class="estimate-result" :aria-label="t('renovationEstimate.resultTitle')">
      <span class="estimate-result__icon"><UiIcon name="calculator" :size="26" /></span>
      <h1 class="text-h2 estimate-result__title">
        {{ t('renovationEstimate.resultTitle') }}
      </h1>
      <p class="estimate-result__range">
        ≈ {{ t('renovationEstimate.resultRange', {
          min: formatRenovationMillions(result.minAmount, locale),
          max: formatRenovationMillions(result.maxAmount, locale),
          currency: currencyLabel,
        }) }}
      </p>
      <p class="estimate-result__m2">
        {{ t('renovationEstimate.resultPerM2Label') }}: ≈ {{ t('renovationEstimate.resultPerM2Range', {
          min: formatRenovationMillions(result.minAmountPerM2, locale),
          max: formatRenovationMillions(result.maxAmountPerM2, locale),
          currency: currencyLabel,
        }) }}
      </p>

      <!-- LABOR/MATERIALS breakdown (v2) — те же суммы из того же ответа,
           не отдельный запрос. -->
      <div class="estimate-breakdown">
        <div class="estimate-breakdown__item">
          <span class="estimate-breakdown__label">{{ t('renovationEstimate.laborLabel') }}</span>
          <span class="estimate-breakdown__value">
            {{ t('renovationEstimate.resultRange', {
              min: formatRenovationMillions(result.labor.minAmount, locale),
              max: formatRenovationMillions(result.labor.maxAmount, locale),
              currency: currencyLabel,
            }) }}
          </span>
        </div>
        <div class="estimate-breakdown__item">
          <span class="estimate-breakdown__label">{{ t('renovationEstimate.materialsLabel') }}</span>
          <span class="estimate-breakdown__value">
            {{ t('renovationEstimate.resultRange', {
              min: formatRenovationMillions(result.materials.minAmount, locale),
              max: formatRenovationMillions(result.materials.maxAmount, locale),
              currency: currencyLabel,
            }) }}
          </span>
        </div>
      </div>

      <p class="text-secondary estimate-result__disclaimer">
        {{ t('renovationEstimate.resultDisclaimer') }}
      </p>
      <p class="text-caption text-muted estimate-result__testPricing">
        {{ t('renovationEstimate.resultTestPricingNote') }}
      </p>
      <NuxtLink to="/projects/draft" class="btn btn-primary estimate-result__cta">
        {{ t('renovationEstimate.resultCtaBuilder') }}
        <UiIcon name="chevron-left" :size="16" class="estimate-result__cta-icon" />
      </NuxtLink>
      <button type="button" class="btn btn-ghost" @click="restart">
        {{ t('renovationEstimate.resultRestart') }}
      </button>
    </section>

    <!-- Wizard — ровно 5 шагов, см. doc comment в script. -->
    <section v-else class="estimate-wizard">
      <div class="estimate-wizard__header">
        <button
          v-if="step > 1"
          type="button"
          class="btn btn-icon btn-secondary"
          :aria-label="t('common.back')"
          @click="goBack"
        >
          <UiIcon name="chevron-left" :size="18" />
        </button>
        <NuxtLink v-else to="/marketplace" class="btn btn-icon btn-secondary" :aria-label="t('common.back')">
          <UiIcon name="chevron-left" :size="18" />
        </NuxtLink>
        <div class="estimate-wizard__progress">
          <span class="text-caption text-muted">{{ t('renovationEstimate.stepLabel', { current: step, total: STEP_COUNT }) }}</span>
          <div class="estimate-wizard__bar">
            <div class="estimate-wizard__bar-fill" :style="{ width: `${(step / STEP_COUNT) * 100}%` }" />
          </div>
        </div>
      </div>

      <div class="estimate-wizard__body">
        <template v-if="step === 1">
          <h1 class="text-h2 estimate-wizard__question">
            {{ t('renovationEstimate.step1Question') }}
          </h1>
          <div class="estimate-wizard__options">
            <button
              v-for="opt in PROPERTY_TYPES"
              :key="opt.value"
              type="button"
              class="estimate-option"
              :class="{ 'estimate-option--active': propertyType === opt.value }"
              @click="propertyType = opt.value"
            >
              {{ t(opt.labelKey) }}
            </button>
          </div>
        </template>

        <template v-else-if="step === 2">
          <h1 class="text-h2 estimate-wizard__question">
            {{ t('renovationEstimate.step2Question') }}
          </h1>
          <div class="field estimate-wizard__area-field">
            <div class="estimate-area-input">
              <input
                v-model.number="area"
                type="number"
                inputmode="decimal"
                min="1"
                max="1000"
                step="0.1"
                class="input"
                :class="{ 'input--error': areaError }"
                :placeholder="t('renovationEstimate.areaPlaceholder')"
                @blur="areaTouched = true"
              >
              <span class="estimate-area-input__unit">{{ t('builder.unit.m2') }}</span>
            </div>
            <span v-if="areaError" class="field__error">{{ areaError }}</span>
            <span v-else class="text-caption text-muted">{{ t('renovationEstimate.areaHint') }}</span>
          </div>
        </template>

        <template v-else-if="step === 3">
          <h1 class="text-h2 estimate-wizard__question">
            {{ t('renovationEstimate.step3Question') }}
          </h1>
          <div class="estimate-wizard__options">
            <button
              v-for="opt in CONDITIONS"
              :key="opt.value"
              type="button"
              class="estimate-option"
              :class="{ 'estimate-option--active': condition === opt.value }"
              @click="condition = opt.value"
            >
              <span class="estimate-option__label">{{ t(opt.labelKey) }}</span>
              <span class="estimate-option__hint">{{ t(opt.hintKey) }}</span>
            </button>
          </div>
        </template>

        <template v-else-if="step === 4">
          <h1 class="text-h2 estimate-wizard__question">
            {{ t('renovationEstimate.step4Question') }}
          </h1>
          <div class="estimate-wizard__options">
            <button
              v-for="opt in FINISH_LEVELS"
              :key="opt.value"
              type="button"
              class="estimate-option"
              :class="{ 'estimate-option--active': finishLevel === opt.value }"
              @click="finishLevel = opt.value"
            >
              {{ t(opt.labelKey) }}
            </button>
          </div>
        </template>

        <template v-else>
          <h1 class="text-h2 estimate-wizard__question">
            {{ t('renovationEstimate.step5Question') }}
          </h1>
          <p class="text-caption text-muted estimate-wizard__hint">
            {{ t('renovationEstimate.step5Hint') }}
          </p>
          <div class="estimate-wizard__chips">
            <button
              v-for="opt in WORK_OPTIONS"
              :key="opt.value"
              type="button"
              class="estimate-chip"
              :class="{ 'estimate-chip--active': works.includes(opt.value) }"
              :aria-pressed="works.includes(opt.value)"
              @click="toggleWork(opt.value)"
            >
              <UiIcon :name="opt.icon" :size="16" />
              {{ t(opt.labelKey) }}
            </button>
          </div>
          <span v-if="worksTouched && works.length === 0" class="field__error">{{ t('renovationEstimate.worksErrorRequired') }}</span>
        </template>

        <p v-if="submitError" class="field__error estimate-wizard__submit-error">
          {{ submitError }}
        </p>
      </div>

      <div class="estimate-wizard__footer">
        <button
          type="button"
          class="btn btn-primary estimate-wizard__next"
          :disabled="submitting"
          @click="goNext"
        >
          <span v-if="submitting">{{ t('renovationEstimate.calculating') }}</span>
          <span v-else-if="step === STEP_COUNT">{{ t('marketplace.renovationEstimateCta') }}</span>
          <span v-else>{{ t('renovationEstimate.nextButton') }}</span>
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.estimate-page {
  max-width: 560px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

/* ---- Wizard ---- */
.estimate-wizard {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.estimate-wizard__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.estimate-wizard__progress {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.estimate-wizard__bar {
  height: 4px;
  border-radius: 999px;
  background: var(--color-border);
  overflow: hidden;
}

.estimate-wizard__bar-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--transition-base);
}

.estimate-wizard__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 220px;
}

.estimate-wizard__question {
  margin: 0;
}

.estimate-wizard__hint {
  margin: calc(var(--space-2) * -1) 0 0;
}

.estimate-wizard__options {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.estimate-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  min-height: 56px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  font-family: var(--font-family);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}

.estimate-option__label {
  font-size: var(--font-body-lg-size);
  font-weight: 500;
  color: var(--color-text);
}

.estimate-option__hint {
  font-size: var(--font-caption-size);
  color: var(--color-text-muted);
}

.estimate-option--active {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.estimate-option--active .estimate-option__label {
  color: var(--color-primary-hover);
  font-weight: 700;
}

.estimate-option--active .estimate-option__hint {
  color: var(--color-primary-hover);
  opacity: 0.8;
}

.estimate-area-input {
  position: relative;
  display: flex;
  align-items: center;
}

.estimate-area-input .input {
  padding-right: var(--space-10);
}

.estimate-area-input__unit {
  position: absolute;
  right: var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--font-body-size);
  pointer-events: none;
}

.estimate-wizard__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.estimate-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}

.estimate-chip--active {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
  color: var(--color-primary-hover);
}

.estimate-wizard__submit-error {
  text-align: center;
}

.estimate-wizard__footer {
  position: sticky;
  bottom: 0;
}

.estimate-wizard__next {
  width: 100%;
  min-height: 52px;
}

/* ---- Result ---- */
.estimate-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  padding: var(--space-10) 0;
}

.estimate-result__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  margin-bottom: var(--space-2);
}

.estimate-result__title {
  margin: 0;
  max-width: 24ch;
}

.estimate-result__range {
  margin: 0;
  font-size: var(--font-display-size);
  line-height: var(--font-display-line);
  font-weight: 700;
  color: var(--color-graphite);
}

.estimate-result__m2 {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-body-lg-size);
}

/* LABOR/MATERIALS (v2) — тот же "карточный" язык, что .estimate-option,
   но read-only (не кнопки): 2 колонки на любой ширине — сумма короткая
   ("≈67–86 млн сум"), перенос на 2 строки на узком экране не нужен. */
.estimate-breakdown {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  width: 100%;
  margin-top: var(--space-2);
}

.estimate-breakdown__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.estimate-breakdown__label {
  font-size: var(--font-caption-size);
  color: var(--color-text-muted);
}

.estimate-breakdown__value {
  font-size: var(--font-body-lg-size);
  font-weight: 700;
  color: var(--color-graphite);
  /* Длинные суммы ("≈123–456 млн сум") не должны ломать 2-колоночную
     карточку на узких экранах (см. задание, секция Responsive QA). */
  word-break: break-word;
}

.estimate-result__disclaimer {
  max-width: 44ch;
  margin: var(--space-2) 0 0;
}

.estimate-result__testPricing {
  max-width: 44ch;
  margin: 0 0 var(--space-4);
}

.estimate-result__cta {
  min-width: 260px;
  min-height: 52px;
}

.estimate-result__cta-icon {
  transform: rotate(180deg);
}
</style>
