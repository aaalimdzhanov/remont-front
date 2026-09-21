// Review — состояние + API-вызовы, тот же useState-паттерн, что и
// useOrders.ts/useMarketplace.ts (НЕ Pinia/Vuex). Намеренно НЕ смешивается
// с Order state (useOrders) — отдельный composable, отдельные useState-ключи
// (см. задание, секция COMPOSABLE: "Не смешивай Review state с Order
// state") — страница сама решает, когда обновить и то, и другое (см.
// pages/orders/[id].vue: после createReview() дополнительно вызывает
// useOrders().fetchOrder(), чтобы подтянуть обновлённый contractor.rating).
import {
  createReview as apiCreateReview,
  getMyReviews as apiGetMyReviews,
  getOrderReviews as apiGetOrderReviews,
  getReceivedReviews as apiGetReceivedReviews,
} from '~/api/reviews'
import { isApiError, toApiError } from '~/api/client'
import type { ApiError, CreateReviewPayload, Review } from '~/api/types'

export function useReviews() {
  const orderReviews = useState<Review[]>('reviews-order', () => [])
  const orderReviewsLoading = useState<boolean>('reviews-order-loading', () => false)
  const orderReviewsError = useState<ApiError | null>('reviews-order-error', () => null)

  const myReviews = useState<Review[]>('reviews-mine', () => [])
  const myReviewsLoading = useState<boolean>('reviews-mine-loading', () => false)
  const myReviewsError = useState<ApiError | null>('reviews-mine-error', () => null)

  const receivedReviews = useState<Review[]>('reviews-received', () => [])
  const receivedReviewsLoading = useState<boolean>('reviews-received-loading', () => false)
  const receivedReviewsError = useState<ApiError | null>('reviews-received-error', () => null)

  const isCreatingReview = useState<boolean>('reviews-creating', () => false)
  const createReviewError = useState<ApiError | null>('reviews-create-error', () => null)

  function setErr(target: { value: ApiError | null }, err: unknown) {
    target.value = isApiError(err) ? err : toApiError(err)
  }

  async function loadOrderReviews(orderId: string): Promise<void> {
    orderReviewsLoading.value = true
    orderReviewsError.value = null
    try {
      orderReviews.value = await apiGetOrderReviews(orderId)
    } catch (err) {
      setErr(orderReviewsError, err)
    } finally {
      orderReviewsLoading.value = false
    }
  }

  async function loadMyReviews(): Promise<void> {
    myReviewsLoading.value = true
    myReviewsError.value = null
    try {
      myReviews.value = await apiGetMyReviews()
    } catch (err) {
      setErr(myReviewsError, err)
    } finally {
      myReviewsLoading.value = false
    }
  }

  async function loadReceivedReviews(): Promise<void> {
    receivedReviewsLoading.value = true
    receivedReviewsError.value = null
    try {
      receivedReviews.value = await apiGetReceivedReviews()
    } catch (err) {
      setErr(receivedReviewsError, err)
    } finally {
      receivedReviewsLoading.value = false
    }
  }

  // guard против двойного submit — тот же паттерн, что isCreatingOffer/
  // isCreatingOrder в других composables этого проекта. 409
  // review_already_exists не проглатывается здесь (в отличие от
  // useOrders().createOrder, где повторный успех определим через сам
  // Order) — Review иммутабелен и создаётся ровно один раз, поэтому
  // вызывающая страница (orders/[id].vue) сама решает, что делать при
  // дубликате: перезагрузить orderReviews, чтобы честное "уже оставлено"
  // состояние стало видно (см. задание, секция DUPLICATE REVIEW).
  async function createReview(orderId: string, payload: CreateReviewPayload): Promise<Review | null> {
    if (isCreatingReview.value) return null
    isCreatingReview.value = true
    createReviewError.value = null
    try {
      const created = await apiCreateReview(orderId, payload)
      orderReviews.value = [...orderReviews.value, created]
      return created
    } catch (err) {
      setErr(createReviewError, err)
      return null
    } finally {
      isCreatingReview.value = false
    }
  }

  function cleanup(): void {
    orderReviews.value = []
    orderReviewsError.value = null
    createReviewError.value = null
  }

  return {
    orderReviews,
    orderReviewsLoading,
    orderReviewsError,
    myReviews,
    myReviewsLoading,
    myReviewsError,
    receivedReviews,
    receivedReviewsLoading,
    receivedReviewsError,
    isCreatingReview,
    createReviewError,
    loadOrderReviews,
    loadMyReviews,
    loadReceivedReviews,
    createReview,
    cleanup,
  }
}
