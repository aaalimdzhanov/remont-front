<script setup lang="ts">
// /orders/{id} — детали заказа. Order response (см. api/types.ts) содержит
// только IDs — ни названия работы, ни имени клиента/мастера backend не
// отдаёт (нет публичного "get user/contractor by id"). workTitle —
// best-effort из requestTitleCache (см. useMarketplace.ts), может быть null.
// 404 — честное "Заказ не найден", НИКОГДА не переинтерпретируется как 403
// (см. задание, секция SECURITY/OWNERSHIP) — GET /orders/{id} на backend
// сам решает видимость (Client ИЛИ Contractor), фронтенд не проверяет
// ownership самостоятельно.
import type { OrderActionConfig } from '~/utils/order'
import type { Review } from '~/api/types'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const orderId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

const { user } = useAuth()
const { contractor, requestTitleCache, loadContractor } = useMarketplace()
const { isContractor } = useUserMode()
const {
  currentOrder, currentOrderLoading, currentOrderError,
  statusActionId, statusActionError,
  fetchOrder, updateStatus,
} = useOrders()
const {
  orderReviews, orderReviewsLoading, orderReviewsError,
  isCreatingReview, createReviewError,
  loadOrderReviews, createReview,
} = useReviews()

const { t, locale } = useI18n()
useHead({ title: computed(() => t('orders.title')) })

onMounted(() => {
  void fetchOrder(orderId.value)
  if (contractor.value === undefined) void loadContractor()
})

// Отзывы разрешены только для completed Order (см. задание, секция REVIEW &
// RATING — "Review разрешён только для completed Order") — грузим список
// лениво, как только currentOrder реально становится completed (а не для
// каждого статуса подряд).
watch(currentOrder, (order) => {
  if (order && order.status === 'completed') void loadOrderReviews(orderId.value)
}, { immediate: true })

const workTitle = computed(() => {
  const order = currentOrder.value
  if (!order) return null
  return requestTitleCache.value[order.marketplaceRequestId]?.workType ?? null
})

// Только контекст, не access control — сама видимость страницы уже решена
// backend'ом (см. шапку файла). Просто честная подпись "вы — клиент/мастер",
// если это можно определить по уже известным реальным id.
const viewerRole = computed<'client' | 'contractor' | null>(() => {
  const order = currentOrder.value
  if (!order) return null
  if (user.value && order.clientUserId === user.value.id) return 'client'
  if (contractor.value && order.contractorId === contractor.value.id) return 'contractor'
  return null
})

const availableActions = computed(() => (currentOrder.value ? getAvailableOrderActions(currentOrder.value.status) : []))

const pendingAction = ref<OrderActionConfig | null>(null)
const successMessage = ref<string | null>(null)

function handleActionClick(action: OrderActionConfig) {
  successMessage.value = null
  // "Начать работу" — обратимо (дальше всё равно есть Отменить/Завершить),
  // confirm нужен только для необратимых действий (см. задание, секция
  // STATUS ACTION UX) — Cancel/Complete всегда идут через pendingAction.
  if (action.action === 'start') {
    void runAction(action)
  } else {
    pendingAction.value = action
  }
}

async function runAction(action: OrderActionConfig) {
  if (!currentOrder.value) return
  const ok = await updateStatus(currentOrder.value.id, action.targetStatus)
  if (ok) successMessage.value = t('orders.statusChanged', { status: orderStatusLabel(action.targetStatus, t) })
}

async function confirmPendingAction() {
  const action = pendingAction.value
  pendingAction.value = null
  if (action) await runAction(action)
}

// ---- Reviews (см. задание "Marketplace Review & Rating Frontend v1") ----
// Роль для CTA-текста ("...мастеру"/"...клиенту") — предпочитаем реальный
// viewerRole (вычислен из Order.clientUserId/contractorId, см. выше), а не
// голый useUserMode(): mode — это просто UI-переключатель, который может
// не совпадать с фактической ролью пользователя в ЭТОМ конкретном заказе
// (например, пользователь в режиме «Клиент», но смотрит заказ, где он сам —
// мастер) — используем mode только как fallback, пока viewerRole ещё не
// определён (contractor профиль подгружается).
const effectiveReviewRole = computed<'client' | 'contractor'>(
  () => viewerRole.value ?? (isContractor.value ? 'contractor' : 'client'),
)

const reviewCtaLabel = computed(() => t(effectiveReviewRole.value === 'client' ? 'orders.reviewCtaClient' : 'orders.reviewCtaContractor'))

const myReview = computed(() => findMyReview(orderReviews.value, user.value?.id))
const otherReviews = computed(() => orderReviews.value.filter(r => r.id !== myReview.value?.id))

function authorLabelFor(review: Review): string | null {
  if (!currentOrder.value) return null
  const role = resolveReviewAuthorRole(review, currentOrder.value)
  return reviewRoleLabel(role, t, currentOrder.value.contractor?.name)
}

const showReviewSheet = ref(false)
const reviewSuccessMessage = ref(false)

async function handleReviewSubmit(rating: number, comment: string) {
  if (!currentOrder.value) return
  const created = await createReview(currentOrder.value.id, { rating, comment: comment || null })
  if (created) {
    showReviewSheet.value = false
    reviewSuccessMessage.value = true
    // Обновляем Order Detail — contractor.rating/reviews_count пересчитаны
    // backend'ом на лету (см. задание, секция AFTER REVIEW), без full reload.
    void fetchOrder(orderId.value)
  } else if (createReviewError.value?.code === 'review_already_exists') {
    // Гонка/повторный сабмит — отзыв уже реально существует на backend;
    // перезагружаем настоящий список, чтобы честно перейти в состояние "Вы
    // оставили отзыв" (см. задание, секция DUPLICATE REVIEW), а не просто
    // показать ошибку и оставить кнопку создания доступной.
    showReviewSheet.value = false
    void loadOrderReviews(currentOrder.value.id)
  }
}
</script>

<template>
  <main class="order-page">
    <div class="order-page__header">
      <NuxtLink to="/orders" class="order-page__back">
        <UiIcon name="chevron-left" :size="18" />
        {{ t('orders.listTitle') }}
      </NuxtLink>
      <AppProfileMenu />
    </div>

    <div v-if="currentOrderLoading && currentOrder === undefined" class="order-page__status">
      <div class="order-page__spinner" aria-hidden="true" />
      <p class="text-secondary">
        {{ t('orders.loading') }}
      </p>
    </div>

    <div v-else-if="currentOrder === null" class="order-page__status">
      <UiIcon name="alert" :size="28" class="order-page__status-icon" />
      <p class="text-h3">
        {{ t('orders.notFoundTitle') }}
      </p>
      <NuxtLink to="/orders" class="btn btn-secondary">
        {{ t('orders.backToOrders') }}
      </NuxtLink>
    </div>

    <div v-else-if="currentOrderError" class="order-page__status">
      <UiIcon name="alert" :size="28" class="order-page__status-icon" />
      <p class="text-secondary">
        {{ currentOrderError.message }}
      </p>
      <button type="button" class="btn btn-secondary" @click="fetchOrder(orderId)">
        {{ t('common.retry') }}
      </button>
    </div>

    <template v-else-if="currentOrder">
      <div class="order-page__title-row">
        <h1 class="text-h1 order-page__title">
          {{ workTitle ?? t('orders.title') }}
        </h1>
        <span class="order-page__status-pill" :class="`order-page__status-pill--${orderStatusClass(currentOrder.status)}`">
          {{ orderStatusLabel(currentOrder.status, t) }}
        </span>
      </div>
      <p v-if="viewerRole" class="text-caption text-muted order-page__role">
        {{ viewerRole === 'client' ? t('orders.roleClient') : t('orders.roleContractor') }}
      </p>

      <section class="order-page__card">
        <div class="order-page__field">
          <span class="text-caption text-muted">{{ t('orders.quantity') }}</span>
          <span class="text-body">{{ formatQuantity(currentOrder.quantity, currentOrder.unit, t) }}</span>
        </div>
        <div class="order-page__field">
          <span class="text-caption text-muted">{{ t('orders.price') }}</span>
          <span class="order-page__price">{{ formatPrice(currentOrder.price, locale, t('common.currency')) }}</span>
        </div>
        <div class="order-page__field">
          <span class="text-caption text-muted">{{ t('orders.createdAt') }}</span>
          <span class="text-body">{{ formatMarketplaceDate(currentOrder.createdAt, locale) }}</span>
        </div>
        <div class="order-page__field">
          <span class="text-caption text-muted">{{ t('orders.updatedAt') }}</span>
          <span class="text-body">{{ formatMarketplaceDate(currentOrder.updatedAt, locale) }}</span>
        </div>
      </section>

      <OrderContractorCard :contractor="currentOrder.contractor" />

      <p v-if="successMessage" class="order-page__success">
        <UiIcon name="check" :size="16" />
        {{ successMessage }}
      </p>
      <p v-if="statusActionError" class="order-page__error">
        {{ statusActionError.message }}
      </p>

      <div v-if="availableActions.length > 0" class="order-page__actions">
        <button
          v-for="action in availableActions"
          :key="action.action"
          type="button"
          class="btn"
          :class="action.danger ? 'btn-danger' : 'btn-primary'"
          :disabled="statusActionId === currentOrder.id"
          @click="handleActionClick(action)"
        >
          {{ statusActionId === currentOrder.id ? t('common.saving') : t(action.labelKey) }}
        </button>
      </div>
      <p v-else class="text-caption text-muted order-page__terminal-note">
        {{ t('orders.terminalNote') }}
      </p>

      <section v-if="currentOrder.status === 'completed'" class="order-page__reviews">
        <h2 class="text-h3 order-page__reviews-title">
          {{ t('orders.reviewsTitle') }}
        </h2>

        <p v-if="reviewSuccessMessage" class="order-page__success">
          <UiIcon name="check" :size="16" />
          {{ t('orders.reviewSuccessMessage') }}
        </p>

        <div v-if="myReview" class="order-page__my-review">
          <p class="text-caption text-muted order-page__my-review-label">
            {{ t('orders.myReviewLabel') }}
          </p>
          <ReviewCard :review="myReview" />
        </div>
        <button v-else type="button" class="btn btn-secondary order-page__review-cta" @click="showReviewSheet = true">
          {{ reviewCtaLabel }}
        </button>

        <div v-if="orderReviewsLoading" class="order-page__skeletons">
          <div class="order-page__skeleton" />
        </div>
        <p v-else-if="orderReviewsError" class="order-page__error">
          {{ orderReviewsError.message }}
        </p>

        <div v-if="otherReviews.length > 0" class="order-page__other-reviews">
          <ReviewCard
            v-for="review in otherReviews"
            :key="review.id"
            :review="review"
            :author-label="authorLabelFor(review)"
          />
        </div>
      </section>
    </template>

    <UiConfirmDialog
      :open="pendingAction !== null"
      :title="pendingAction ? t(pendingAction.confirmTitleKey) : ''"
      :message="pendingAction ? t(pendingAction.confirmMessageKey) : ''"
      :confirm-text="pendingAction ? t(pendingAction.labelKey) : t('common.confirm')"
      :danger="pendingAction?.danger ?? false"
      @confirm="confirmPendingAction"
      @cancel="pendingAction = null"
    />

    <ReviewCreateReviewSheet
      :open="showReviewSheet"
      :title="reviewCtaLabel"
      :submitting="isCreatingReview"
      :error="createReviewError?.message ?? null"
      @submit="handleReviewSubmit"
      @cancel="showReviewSheet = false"
    />
  </main>
</template>

<style scoped>
.order-page {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

.order-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.order-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.order-page__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  min-height: 50vh;
  text-align: center;
}

.order-page__status-icon {
  color: var(--color-warning);
}

.order-page__spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  animation: order-page-spin 0.7s linear infinite;
}

@keyframes order-page-spin {
  to { transform: rotate(360deg); }
}

.order-page__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.order-page__title {
  margin: 0;
}

.order-page__status-pill {
  flex-shrink: 0;
  margin-top: var(--space-2);
  font-size: var(--font-small-size);
  font-weight: 500;
  padding: 4px var(--space-3);
  border-radius: 999px;
  white-space: nowrap;
}

.order-page__status-pill--planned { color: var(--color-text-secondary); background: var(--color-surface-subtle); }
.order-page__status-pill--in_progress { color: var(--color-warning); background: var(--color-warning-subtle); }
.order-page__status-pill--completed { color: var(--color-success); background: var(--color-success-subtle); }
.order-page__status-pill--cancelled { color: var(--color-text-muted); background: var(--color-surface-subtle); }

.order-page__role {
  margin: var(--space-1) 0 0;
}

.order-page__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-5);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.order-page__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.order-page__price {
  font-weight: 700;
  font-size: var(--font-h3-size);
  color: var(--color-text);
}

.order-page__success {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-4) 0 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-success-subtle);
  color: var(--color-success);
  font-size: var(--font-small-size);
}

.order-page__error {
  margin: var(--space-4) 0 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}

.order-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.order-page__actions .btn {
  flex: 1;
  min-width: 140px;
  height: 48px;
}

.order-page__terminal-note {
  margin-top: var(--space-6);
  text-align: center;
}

.order-page__reviews {
  margin-top: var(--space-8);
}

.order-page__reviews-title {
  margin: 0 0 var(--space-4);
}

.order-page__my-review {
  margin-bottom: var(--space-4);
}

.order-page__my-review-label {
  margin: 0 0 var(--space-2);
}

.order-page__review-cta {
  width: 100%;
  height: 48px;
  margin-bottom: var(--space-4);
}

.order-page__other-reviews {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.order-page__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.order-page__skeleton {
  height: 80px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: order-page-reviews-pulse 1.4s ease-in-out infinite;
}

@keyframes order-page-reviews-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
