// Presentation-only хелперы для Order UI: подписи/класс статуса и то, какие
// action-кнопки показать для текущего статуса. НЕ дублирует backend state
// machine (см. domain/order/order.go Start/Complete/Cancel) — только
// предлагает пользователю кнопки, соответствующие текущему status; сам
// переход всегда подтверждает backend (409 invalid_order_transition, если
// он всё же недопустим — см. api/orders.ts).
import type { OrderContractorSummary, OrderStatus } from '~/api/types'

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  planned: 'Запланирован',
  in_progress: 'В работе',
  completed: 'Завершён',
  cancelled: 'Отменён',
}

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status]
}

// Используется как модификатор BEM-класса (`order-card__status--${...}`) —
// тот же паттерн, что и статусы MarketplaceRequest/Offer/WorkStatus в этом
// проекте (см. OfferCard.vue/MyRequestCard.vue) — просто сам статус, без
// дополнительного маппинга (класс и backend-значение совпадают дословно).
export function orderStatusClass(status: OrderStatus): string {
  return status
}

export type OrderAction = 'start' | 'complete' | 'cancel'

export interface OrderActionConfig {
  action: OrderAction
  label: string
  // Конкретный статус, который уйдёт в PATCH .../status (см. api/orders.ts
  // updateOrderStatus — 'planned' туда никогда не передаётся).
  targetStatus: 'in_progress' | 'completed' | 'cancelled'
  danger: boolean
  // Необратимое действие — см. задание, секция STATUS ACTION UX: перед ним
  // нужен confirm dialog.
  confirmTitle: string
  confirmMessage: string
}

const START: OrderActionConfig = {
  action: 'start',
  label: 'Начать работу',
  targetStatus: 'in_progress',
  danger: false,
  confirmTitle: 'Начать работу?',
  confirmMessage: 'Заказ перейдёт в статус «В работе».',
}

const COMPLETE: OrderActionConfig = {
  action: 'complete',
  label: 'Завершить',
  targetStatus: 'completed',
  danger: false,
  confirmTitle: 'Завершить заказ?',
  confirmMessage: 'Заказ будет отмечен как выполненный. Это действие нельзя отменить.',
}

const CANCEL_FROM_PLANNED: OrderActionConfig = {
  action: 'cancel',
  label: 'Отменить',
  targetStatus: 'cancelled',
  danger: true,
  confirmTitle: 'Отменить заказ?',
  confirmMessage: 'После отмены заказ нельзя будет возобновить.',
}

const CANCEL_FROM_IN_PROGRESS: OrderActionConfig = CANCEL_FROM_PLANNED

// planned: Начать работу / Отменить. in_progress: Завершить / Отменить.
// completed/cancelled — терминальные, действий нет (см. задание, секция
// ORDER STATUS: "completed/cancelled: только информация").
export function getAvailableOrderActions(status: OrderStatus): OrderActionConfig[] {
  switch (status) {
    case 'planned': return [START, CANCEL_FROM_PLANNED]
    case 'in_progress': return [COMPLETE, CANCEL_FROM_IN_PROGRESS]
    case 'completed': return []
    case 'cancelled': return []
  }
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === 'completed' || status === 'cancelled'
}

// ---- Order Party Details v1 — presentation logic for OrderContractorCard ----
// Вынесено сюда как чистые функции (а не инлайн в .vue), чтобы поведение
// было тестируемым без монтирования компонента — в этом проекте нет
// @vue/test-utils/jsdom (см. vitest.config.ts: environment 'node',
// сознательный выбор), поэтому SFC не монтируются нигде в тестах; эти
// функции — единственный практичный способ покрыть тестами именно
// display-логику компонента (см. tests/components/order/OrderContractorCard.test.ts).
//
// Обе функции принимают ТОЛЬКО OrderContractorSummary (id/name/description —
// см. api/types.ts) — в самом типе физически нет phone/status/user_id, так
// что "не показывать телефон мастера" — структурная гарантия на уровне
// типов, а не то, что нужно проверять в рантайме.

// Имя — обязательное поле на backend (Contractor.Name никогда не пустой при
// создании профиля, см. remont-back), но здесь всё равно defensive fallback
// на случай пустой строки/whitespace (см. задание: "Если имя отсутствует —
// 'Мастер'").
export function contractorDisplayName(contractor: OrderContractorSummary | null): string {
  const name = contractor?.name?.trim()
  return name ? name : 'Мастер'
}

// null — либо контрактора нет вообще, либо description пустой/whitespace —
// в обоих случаях OrderContractorCard.vue просто не показывает строку
// описания (v-if), а не пустой абзац.
export function contractorDescription(contractor: OrderContractorSummary | null): string | null {
  const description = contractor?.description?.trim()
  return description ? description : null
}
