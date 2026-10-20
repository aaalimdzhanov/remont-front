// Presentation-only хелперы для /renovation-estimate (см. doc comment в
// app/api/renovationEstimate.ts) — чистые функции, тестируются напрямую без
// монтирования компонента, по тому же принципу, что app/utils/marketplace.ts.
import { localeTag } from '~/utils/i18nFormat'

export const RENOVATION_AREA_MIN = 1
export const RENOVATION_AREA_MAX = 1000

// area — число м², backend принимает float (минимум 1, максимум 1000, см.
// RenovationEstimateRequestDto). null — поле ещё не заполнено.
export function isValidRenovationArea(area: number | null): area is number {
  return area !== null && Number.isFinite(area) && area >= RENOVATION_AREA_MIN && area <= RENOVATION_AREA_MAX
}

// amount — целые UZS с backend (min_amount/max_amount/*_per_m2, см.
// RenovationEstimateResult), уже округлённые backend'ом до "дружелюбных"
// шагов (100к/1млн/5млн). Здесь только визуальное сокращение до млн с
// точностью до 1 знака — тот же формат, что "≈ 85–110 млн сум" preview на
// RenovationEstimateCard.vue, не новый стиль.
export function formatRenovationMillions(amount: number, locale = 'ru'): string {
  const millions = Math.round((amount / 1_000_000) * 10) / 10
  const hasFraction = Math.abs(millions % 1) > 1e-9
  return millions.toLocaleString(localeTag(locale), {
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: 1,
  })
}
