// Чистая логика AddServiceSheet.vue/ContractorServiceCard.vue, вынесенная
// отдельно по той же причине, что и useRenovationEstimateFlow.ts: в проекте
// нет @vue/test-utils/DOM (vitest.config.ts: environment 'node' — ни один
// SFC нигде не монтируется, см. tests/components/order/OrderContractorCard.
// test.ts), поэтому логика, которую нужно покрыть тестами, должна жить вне
// <script setup> в виде обычных функций.
import type { ContractorService, WorkType } from '~/api/types'

// Виды работ выбранной категории, которых ещё нет среди АКТИВНЫХ услуг
// мастера. Отключённые услуги здесь не исключаются — наоборот, именно они
// остаются в списке с пометкой "отключена", чтобы предложить реактивацию
// вместо того, чтобы выглядеть навсегда недоступными (см. задание, секция 3).
export function availableWorkTypesForCategory(
  workTypes: WorkType[],
  categoryId: string,
  activeWorkTypeIds: string[],
): WorkType[] {
  if (!categoryId) return []
  return workTypes.filter(w => w.categoryId === categoryId && !activeWorkTypeIds.includes(w.id))
}

// Есть ли среди отключённых услуг мастера такая же для этого вида работы —
// если да, выбор этого вида работы должен переключить форму в режим
// "Включить" (реактивация), а не "Добавить".
export function findInactiveServiceForWorkType(
  inactiveServices: ContractorService[],
  workTypeId: string,
): ContractorService | null {
  if (!workTypeId) return null
  return inactiveServices.find(s => s.workTypeId === workTypeId) ?? null
}
