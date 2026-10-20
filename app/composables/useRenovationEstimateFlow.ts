// Вся состояние/валидация/API-вызов 5-шагового wizard'а /renovation-estimate
// — вынесено из страницы в composable по одной причине: в проекте нет
// прецедента unit-тестирования page-компонентов (только composables/api/
// utils — см. tests/composables/*, tests/api/*), а задание explicitly просит
// тесты на сохранение ответов при переходах назад, валидацию, double-submit
// guard и т.п. app/pages/renovation-estimate.vue — тонкий template-слой
// поверх этого composable, вся логика здесь. НЕ useState (в отличие от
// useReviews.ts/useOrders.ts) — это состояние НЕ переиспользуется между
// страницами/компонентами (единственный потребитель — эта одна страница),
// useState здесь был бы лишней абстракцией.
import { isApiError } from '~/api/client'
import { estimateRenovationCost } from '~/api/renovationEstimate'
import type { RenovationCondition, RenovationEstimateResult, RenovationFinishLevel, RenovationPropertyType, RenovationWorkType } from '~/api/types'
import { isValidRenovationArea } from '~/utils/renovationEstimate'

export const RENOVATION_ESTIMATE_STEP_COUNT = 5
export type RenovationEstimateStep = 1 | 2 | 3 | 4 | 5

export function useRenovationEstimateFlow() {
  const step = ref<RenovationEstimateStep>(1)

  const propertyType = ref<RenovationPropertyType | null>(null)
  const area = ref<number | null>(null)
  const condition = ref<RenovationCondition | null>(null)
  const finishLevel = ref<RenovationFinishLevel | null>(null)
  const works = ref<RenovationWorkType[]>([])

  const areaTouched = ref(false)
  const worksTouched = ref(false)
  const submitting = ref(false)
  // Уже локализованное сообщение (toApiError() резолвит i18n-ключ внутри
  // себя, см. app/api/client.ts) — composable не вызывает useI18n() сам,
  // чтобы оставаться тестируемым без Nuxt app context.
  const submitError = ref<string | null>(null)
  const result = ref<RenovationEstimateResult | null>(null)

  const canProceed = computed(() => {
    switch (step.value) {
      case 1: return propertyType.value !== null
      case 2: return isValidRenovationArea(area.value)
      case 3: return condition.value !== null
      case 4: return finishLevel.value !== null
      case 5: return works.value.length > 0
      default: return false
    }
  })

  function toggleWork(value: RenovationWorkType) {
    works.value = works.value.includes(value)
      ? works.value.filter(w => w !== value)
      : [...works.value, value]
  }

  function goBack() {
    if (step.value > 1) step.value = (step.value - 1) as RenovationEstimateStep
  }

  // Двойная защита от повторной отправки (см. задание, секция 7): кнопка в
  // шаблоне уже :disabled="submitting", но это защита "на глаз" — реальная
  // защита от гонки (двойной Enter/клик до перерисовки DOM) — ранний return
  // по тому же флагу здесь. submitAbort отменяет предыдущий ещё летящий
  // запрос, если submit() всё же вызвали повторно (а не создаёт второй).
  let submitAbort: AbortController | null = null

  async function submit(): Promise<void> {
    if (submitting.value) return
    if (!propertyType.value || !isValidRenovationArea(area.value) || !condition.value || !finishLevel.value || works.value.length === 0) return
    submitAbort?.abort()
    submitAbort = new AbortController()
    submitting.value = true
    submitError.value = null
    try {
      result.value = await estimateRenovationCost({
        property_type: propertyType.value,
        area: area.value,
        condition: condition.value,
        finish_level: finishLevel.value,
        works: works.value,
      }, { signal: submitAbort.signal })
    } catch (error) {
      submitError.value = isApiError(error) ? error.message : String(error)
    } finally {
      submitting.value = false
    }
  }

  // Запрос к backend уходит ТОЛЬКО с последнего шага (см. задание, секция 5:
  // "не отправляй запрос на каждом шаге") — goNext() на шагах 1-4 просто
  // двигает step, submit() вызывается исключительно отсюда на шаге 5.
  async function goNext(): Promise<void> {
    if (step.value === 2) areaTouched.value = true
    if (step.value === 5) worksTouched.value = true
    if (!canProceed.value) return
    if (step.value < RENOVATION_ESTIMATE_STEP_COUNT) {
      step.value = (step.value + 1) as RenovationEstimateStep
      return
    }
    await submit()
  }

  function restart() {
    submitAbort?.abort()
    step.value = 1
    propertyType.value = null
    area.value = null
    condition.value = null
    finishLevel.value = null
    works.value = []
    areaTouched.value = false
    worksTouched.value = false
    submitError.value = null
    result.value = null
  }

  function dispose() {
    submitAbort?.abort()
  }

  return {
    step,
    propertyType,
    area,
    condition,
    finishLevel,
    works,
    areaTouched,
    worksTouched,
    submitting,
    submitError,
    result,
    canProceed,
    toggleWork,
    goBack,
    goNext,
    submit,
    restart,
    dispose,
  }
}
