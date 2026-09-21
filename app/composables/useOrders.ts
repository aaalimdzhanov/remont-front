// Order — состояние + API-вызовы, тот же useState-паттерн, что и
// useMarketplace.ts/useWorkBuilder.ts (НЕ Pinia/Vuex). Ничего не считает —
// price/quantity/unit — backend-снапшот, взятый как есть (см. api/orders.ts).
// Building JSON/ProjectWork/WorkType здесь не читаются и не дублируются:
// Order — самостоятельный слой ПОСЛЕ принятого Offer (см. финальный отчёт,
// Architecture) — единственная связь с более ранними слоями это ссылочные
// id (marketplaceRequestId/projectWorkId), используемые только для
// best-effort сопоставления на странице, а не для повторного чтения их данных.
import {
  createOrder as apiCreateOrder,
  getOrder as apiGetOrder,
  listOrders as apiListOrders,
  updateOrderStatus as apiUpdateOrderStatus,
} from '~/api/orders'
import { isApiError, toApiError } from '~/api/client'
import type { ApiError, Order, OrderStatus } from '~/api/types'

export function useOrders() {
  const orders = useState<Order[]>('orders-list', () => [])
  const ordersLoading = useState<boolean>('orders-list-loading', () => false)
  const ordersError = useState<ApiError | null>('orders-list-error', () => null)

  // null — точно не найден (404, см. fetchOrder); undefined — ещё не грузили.
  const currentOrder = useState<Order | null | undefined>('orders-current', () => undefined)
  const currentOrderLoading = useState<boolean>('orders-current-loading', () => false)
  const currentOrderError = useState<ApiError | null>('orders-current-error', () => null)

  const isCreatingOrder = useState<boolean>('orders-creating', () => false)
  const createOrderError = useState<ApiError | null>('orders-create-error', () => null)

  const statusActionId = useState<string | null>('orders-status-action-id', () => null)
  const statusActionError = useState<ApiError | null>('orders-status-action-error', () => null)

  function setErr(target: { value: ApiError | null }, err: unknown) {
    target.value = isApiError(err) ? err : toApiError(err)
  }

  async function fetchOrders(): Promise<void> {
    ordersLoading.value = true
    ordersError.value = null
    try {
      orders.value = await apiListOrders()
    } catch (err) {
      setErr(ordersError, err)
    } finally {
      ordersLoading.value = false
    }
  }

  async function fetchOrder(id: string): Promise<void> {
    currentOrderLoading.value = true
    currentOrderError.value = null
    try {
      currentOrder.value = await apiGetOrder(id)
    } catch (err) {
      // 404 — честное "не найдено" (см. задание, секция SECURITY/OWNERSHIP:
      // "Если API возвращает 404 — показывать Not Found. Не превращать 404
      // в 403"), не app-ошибка — остальные статусы остаются в currentOrderError.
      if (isApiError(err) && err.status === 404) {
        currentOrder.value = null
      } else {
        setErr(currentOrderError, err)
      }
    } finally {
      currentOrderLoading.value = false
    }
  }

  // offerId — id ПРИНЯТОГО MarketplaceOffer (см. api/orders.ts) — вызывается
  // сразу после успешного Accept на requests/[id].vue. 409
  // order_already_exists (двойной клик/повторный визит) — не ошибка для
  // пользователя: реальный заказ уже существует, находим его через
  // настоящий GET /orders вместо того, чтобы показать ошибку (см. задание,
  // секция CREATE ORDER: "не превращать в ошибку, если можно определить из API").
  async function createOrder(offerId: string): Promise<Order | null> {
    if (isCreatingOrder.value) return null
    isCreatingOrder.value = true
    createOrderError.value = null
    try {
      const created = await apiCreateOrder(offerId)
      orders.value = [created, ...orders.value]
      return created
    } catch (err) {
      if (isApiError(err) && err.code === 'order_already_exists') {
        await fetchOrders()
        const existing = orders.value.find(o => o.marketplaceOfferId === offerId) ?? null
        if (existing) return existing
      }
      setErr(createOrderError, err)
      return null
    } finally {
      isCreatingOrder.value = false
    }
  }

  // status — 'in_progress'|'completed'|'cancelled' (см. api/orders.ts).
  // Никакого optimistic update (см. задание, секция STATUS ACTION UX):
  // orders/currentOrder обновляются только ответом backend, после успеха.
  async function updateStatus(id: string, status: Exclude<OrderStatus, 'planned'>): Promise<boolean> {
    if (statusActionId.value) return false
    statusActionId.value = id
    statusActionError.value = null
    try {
      const updated = await apiUpdateOrderStatus(id, status)
      orders.value = orders.value.map(o => (o.id === id ? updated : o))
      if (currentOrder.value && currentOrder.value.id === id) currentOrder.value = updated
      return true
    } catch (err) {
      setErr(statusActionError, err)
      return false
    } finally {
      statusActionId.value = null
    }
  }

  // Best-effort сопоставление заказа конкретной заявке (см.
  // pages/marketplace/requests/[id].vue, ProjectWorkCard.vue) — работает
  // только если orders уже загружены (fetchOrders()); ничего не выдумывает,
  // просто ищет в уже полученном от backend списке.
  function findOrderByRequestId(requestId: string): Order | undefined {
    return orders.value.find(o => o.marketplaceRequestId === requestId)
  }

  function cleanup(): void {
    orders.value = []
    ordersError.value = null
    currentOrder.value = undefined
    currentOrderError.value = null
    createOrderError.value = null
    statusActionError.value = null
  }

  return {
    orders,
    ordersLoading,
    ordersError,
    currentOrder,
    currentOrderLoading,
    currentOrderError,
    isCreatingOrder,
    createOrderError,
    statusActionId,
    statusActionError,
    fetchOrders,
    fetchOrder,
    createOrder,
    updateStatus,
    findOrderByRequestId,
    cleanup,
  }
}
