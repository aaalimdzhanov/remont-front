// Типизированные методы для Order — см. remont-back
// internal/interfaces/http/order_handler.go. ВАЖНО (реальная форма backend'а,
// не то, что можно было бы предположить): Order создаётся из ПРИНЯТОГО
// MarketplaceOffer, путь — /api/v1/marketplace-offers/{offer_id}/order
// (POST, пустое тело), а НЕ из marketplace-request. Три остальных route —
// GET /api/v1/orders (ListMine — и как client, и как contractor, слитые в
// один список), GET /api/v1/orders/{id}, PATCH /api/v1/orders/{id}/status.
import { apiFetch } from './client'
import type { Order, OrderDto, OrderStatus } from './types'

// contractor — только в ответе GET /orders/{id} (см. api/types.ts,
// OrderContractorSummaryDto) — у ListMine/Create/UpdateStatus этого поля в
// JSON нет вообще (dto.contractor === undefined), здесь это нормализуется
// в null единообразно, чтобы вызывающему коду не нужно было различать
// undefined/null — только "есть объект" или "нет".
function toOrder(dto: OrderDto): Order {
  return {
    id: dto.id,
    marketplaceOfferId: dto.marketplace_offer_id,
    marketplaceRequestId: dto.marketplace_request_id,
    projectWorkId: dto.project_work_id,
    clientUserId: dto.client_user_id,
    contractorId: dto.contractor_id,
    price: dto.price,
    quantity: dto.quantity,
    unit: dto.unit,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    contractor: dto.contractor
      ? {
          id: dto.contractor.id,
          name: dto.contractor.name,
          description: dto.contractor.description,
          // rating отсутствует в JSON (omitempty), а не null, ровно когда
          // reviews_count === 0 — см. api/types.ts.
          rating: dto.contractor.rating ?? null,
          reviewsCount: dto.contractor.reviews_count,
        }
      : null,
  }
}

// offerId — id принятого MarketplaceOffer, не marketplace request. Тело
// запроса всегда пустое: backend резолвит price/quantity/unit/contractor_id/
// client_user_id сам (см. contractorapp.CreateFromAcceptedOffer) — фронтенд
// ничего из этого не передаёт и не может передать.
export async function createOrder(offerId: string): Promise<Order> {
  const dto = await apiFetch<OrderDto>(`/api/v1/marketplace-offers/${encodeURIComponent(offerId)}/order`, { method: 'POST' })
  return toOrder(dto)
}

// Возвращает все заказы, видимые вызывающему — и как client, и как
// contractor (одному User может принадлежать оба сразу, см. ListMine на
// backend) — отсортированы backend'ом по created_at desc.
export async function listOrders(): Promise<Order[]> {
  const items = await apiFetch<OrderDto[]>('/api/v1/orders')
  return items.map(toOrder)
}

export async function getOrder(id: string): Promise<Order> {
  const dto = await apiFetch<OrderDto>(`/api/v1/orders/${encodeURIComponent(id)}`)
  return toOrder(dto)
}

// status: 'in_progress' | 'completed' | 'cancelled' — 'planned' не
// принимается backend'ом как целевой статус (нет пути "переоткрыть заказ",
// см. order_handler.go UpdateStatus: default-case возвращает invalid_order_status).
// Допустимость конкретного перехода (planned→in_progress и т.д.) проверяет
// ИСКЛЮЧИТЕЛЬНО backend (409 invalid_order_transition) — этот метод не
// дублирует state machine, только передаёт запрошенный статус.
export async function updateOrderStatus(id: string, status: Exclude<OrderStatus, 'planned'>): Promise<Order> {
  const dto = await apiFetch<OrderDto>(`/api/v1/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status },
  })
  return toOrder(dto)
}
