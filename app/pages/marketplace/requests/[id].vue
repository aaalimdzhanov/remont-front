<script setup lang="ts">
// /marketplace/requests/{id} — детали заявки (Marketplace Request Detail
// v2). ГЛАВНЫЙ источник "что это за заявка" (вид работы/количество/
// единица/статус/дата) теперь один для ВСЕХ зрителей — публичный
// GET /api/v1/marketplace-requests/{id} (см. useMarketplace.ts
// loadRequestDetail(), api/marketplace.ts getPublicMarketplaceRequest()):
// любой статус, 404 только если заявки с таким id нет вообще. Раньше
// (Public Marketplace v1) такого эндпоинта не было — страница угадывала
// вид и данные, сканируя уже загруженные myRequests/openRequests, из-за
// чего: (а) владелец видел в заголовке только количество — MarketplaceRequest
// (приватная форма) никогда не содержала work_type; (б) заявка, переставшая
// быть "open" (закрыта после Order, отменена), пропадала из openRequests —
// мастер с реальным своим оффером на неё видел "не найдено" вместо статуса
// своего оффера. Оба случая исправлены здесь этим новым эндпоинтом — см.
// backend: internal/interfaces/http/marketplace_request_handler.go GetPublic.
//
// "Кто смотрит" по-прежнему определяется не самим requestDetail (в нём
// нет owner_id — backend его сознательно не отдаёт), а членством в уже
// загруженных приватных списках:
//   - id встречается в myRequests (ListMine, все статусы) → owner-вид;
//   - иначе → публичный вид (гость ИЛИ мастер — общий для обоих: разница
//     только в том, что показывается вместо кнопки "Предложить цену").
// Cancel/Close самой заявки по-прежнему не здесь: тем эндпоинтам нужны
// project_id/work_id, которых ни приватный, ни публичный ответ заявки не
// содержит — эти действия остаются на ProjectWorkCard.vue.
//
// layout:'public' (Footer v1) — эта страница не использует layout:'app'
// (свой inline back-link-header, не AppHeader, см. template ниже) — здесь
// только Footer добавлен, никакой другой layout не даёт. См.
// layouts/public.vue.
definePageMeta({ layout: 'public' })

const route = useRoute()
const requestId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

const { isAuthenticated, isInitialized, initialize } = useAuth()

const {
  requestDetail, requestDetailLoading, requestDetailError,
  myRequests,
  myOffers, myOffersLoading,
  requestOffers, requestOffersLoading, requestOffersError,
  contractor, contractorLoading, contractorError,
  isCreatingOffer, createOfferError,
  offerActionId, offerActionError,
  loadRequestDetail, loadMyRequests, loadMyOffers, loadContractor,
  loadOffersForRequest, submitOffer, setOfferStatus, createContractorProfile,
} = useMarketplace()
const {
  isCreatingOrder, createOrderError,
  fetchOrders, createOrder, findOrderByRequestId,
} = useOrders()

// Заказ этой заявки, если он уже существует — нужен и owner-, и
// contractor-виду (Order.ListMine отдаёт заказы обеих сторон, см. заказ
// backend: OrderHandler.ListMine), поэтому грузится независимо от фазы.
const orderForThisRequest = computed(() => findOrderByRequestId(requestId.value))

// location — Project Location в Marketplace v1 (см. api/types.ts
// PublicMarketplaceRequest): coarse city/district, null если у Project нет
// location — тот же formatLocation(), что уже использует OpenRequestCard.vue
// и PublicContractorCard.vue, без второго форматтера.
const { t, locale } = useI18n()

const locationLabel = computed(() => (requestDetail.value ? formatLocation(requestDetail.value.location, locale.value) : null))

useHead({ title: computed(() => t('marketplaceRequest.title')) })

type Phase = 'loading' | 'owner' | 'public' | 'not-found' | 'error'
const phase = ref<Phase>('loading')

const ownerRequest = computed(() => myRequests.value.find(r => r.id === requestId.value) ?? null)
const myOfferForThisRequest = computed(() => myOffers.value.find(o => o.marketplaceRequestId === requestId.value) ?? null)

async function resolve() {
  phase.value = 'loading'
  // Эта страница — публичная (без middleware:'auth'), поэтому в отличие от
  // auth-gated страниц ничто не гарантирует, что restore сессии (refresh
  // cookie -> access token -> /me, см. useAuth().initialize()) уже
  // завершился к моменту onMounted этой страницы — на жёстком
  // reload/прямом переходе по ссылке initialize() из app.vue мог ещё не
  // отработать (Vue монтирует дочерние компоненты раньше родительского
  // onMounted). Без этого isAuthenticated ниже был бы ложно false для
  // реально залогиненного владельца, открывшего свою же заявку напрямую —
  // он увидел бы публичный вид вместо owner-вида с офферами. initialize()
  // идемпотентен (см. useAuth.ts), поэтому безопасно вызывать его здесь
  // же, параллельно с публичным loadRequestDetail().
  const initPromise = isInitialized.value ? Promise.resolve() : initialize()
  await Promise.all([initPromise, loadRequestDetail(requestId.value)])
  if (requestDetailError.value) {
    phase.value = 'error'
    return
  }
  if (requestDetail.value === null) {
    phase.value = 'not-found'
    return
  }
  if (isAuthenticated.value) {
    await loadMyRequests()
    void loadMyOffers()
    void fetchOrders()
  }
  if (ownerRequest.value) {
    phase.value = 'owner'
    void loadOffersForRequest(requestId.value)
    return
  }
  phase.value = 'public'
}

onMounted(resolve)

const showOfferSheet = ref(false)
const showContractorSheet = ref(false)
const showAuthGate = ref(false)

function handleOfferCta() {
  if (!isAuthenticated.value) {
    showAuthGate.value = true
    return
  }
  if (contractor.value === null) {
    showContractorSheet.value = true
    return
  }
  showOfferSheet.value = true
}

async function handleContractorSubmit(name: string, description: string, phone: string) {
  const ok = await createContractorProfile({ name, description, phone })
  if (ok) {
    showContractorSheet.value = false
    showOfferSheet.value = true
  }
}

const offerSubmittedMessage = ref(false)

async function handleOfferSubmit(price: number, comment: string) {
  const created = await submitOffer(requestId.value, { price, comment: comment || null })
  if (created) {
    showOfferSheet.value = false
    offerSubmittedMessage.value = true
  }
}

const acceptedMessage = ref(false)
// offerId запоминается отдельно от offerActionId (который сбрасывается в
// null сразу после ответа backend, см. useMarketplace.ts) — нужен как раз
// в момент "Accept прошёл, теперь надо создать Order", чтобы кнопка
// "Повторить" при сбое createOrder() знала, для какого offer'а повторять.
const acceptedOfferId = ref<string | null>(null)

// Accept Offer и Create Order — два отдельных backend-вызова: PATCH
// /offers/{id}/status ТОЛЬКО принимает оффер (MarketplaceRequest.Status не
// трогает — см. backend application/marketplaceoffer.Accept), request
// остаётся open до отдельного POST /marketplace-offers/{offer_id}/order,
// который и закрывает заявку атомарно вместе с созданием Order (см.
// application/order.CreateFromAcceptedOffer). Если сам Accept уже прошёл,
// а Create Order — нет, оффер остаётся accepted, и повторный клик просто
// пробует создать Order заново (см. handleRetryCreateOrder), а не Accept
// ещё раз.
async function handleAccept(offerId: string) {
  const ok = await setOfferStatus(offerId, 'accepted')
  if (!ok) return
  acceptedMessage.value = true
  acceptedOfferId.value = offerId
  await createOrder(offerId)
}

async function handleRetryCreateOrder() {
  if (!acceptedOfferId.value) return
  await createOrder(acceptedOfferId.value)
}

async function handleReject(offerId: string) {
  await setOfferStatus(offerId, 'rejected')
}

async function handleWithdraw(offerId: string) {
  await setOfferStatus(offerId, 'withdrawn')
}
</script>

<template>
  <main class="request-page">
    <NuxtLink to="/marketplace" class="request-page__back">
      <UiIcon name="chevron-left" :size="18" />
      {{ t('navigation.backToMarketplace') }}
    </NuxtLink>

    <div v-if="phase === 'loading'" class="request-page__status">
      <div class="request-page__spinner" aria-hidden="true" />
      <p class="text-secondary">
        {{ t('marketplaceRequest.loading') }}
      </p>
    </div>

    <div v-else-if="phase === 'error'" class="request-page__status">
      <UiIcon name="alert" :size="28" class="request-page__status-icon" />
      <p class="text-h3">
        {{ t('marketplaceRequest.loadErrorTitle') }}
      </p>
      <p v-if="requestDetailError" class="text-secondary">
        {{ requestDetailError.message }}
      </p>
      <button type="button" class="btn btn-secondary" @click="resolve">
        {{ t('common.retry') }}
      </button>
    </div>

    <div v-else-if="phase === 'not-found'" class="request-page__status">
      <UiIcon name="alert" :size="28" class="request-page__status-icon" />
      <p class="text-h3">
        {{ t('marketplaceRequest.notFoundTitle') }}
      </p>
      <p class="text-secondary">
        {{ t('marketplaceRequest.notFoundText') }}
      </p>
      <NuxtLink to="/marketplace" class="btn btn-secondary">
        {{ t('marketplaceRequest.backToMarketplace') }}
      </NuxtLink>
    </div>

    <template v-else-if="requestDetail">
      <div class="request-page__header">
        <!-- Мини-план проекта — только для владельца: project_id есть
             только в приватной ListMine-форме (см. useMarketplace.ts
             ownerRequest), публичный requestDetail его никогда не содержит
             (сознательная privacy-граница backend). -->
        <div v-if="ownerRequest" class="request-page__thumb">
          <MarketplaceProjectPlanThumbnail :project-id="ownerRequest.projectId" :room-id="ownerRequest.roomId" />
        </div>

        <div class="request-page__header-info">
          <h1 class="text-h1 request-page__title">
            {{ requestDetail.workType }}
          </h1>
          <p class="text-secondary">
            {{ t('marketplaceRequest.quantity', { quantity: formatQuantity(requestDetail.quantity, requestDetail.unit, t) }) }}
          </p>
          <p v-if="locationLabel" class="request-page__location">
            <UiIcon name="pin" :size="14" />
            {{ locationLabel }}
          </p>
          <p class="text-secondary">
            {{ t('marketplaceRequest.publishedAt', { date: formatMarketplaceDate(requestDetail.createdAt, locale) }) }}
            <span class="request-page__status-pill" :class="`request-page__status-pill--${requestDetail.status}`">
              {{ marketplaceRequestStatusLabel(requestDetail.status, t) }}
            </span>
          </p>
        </div>
      </div>

      <template v-if="phase === 'owner'">
        <p v-if="acceptedMessage && !orderForThisRequest" class="request-page__success">
          <UiIcon name="check" :size="16" />
          {{ t('marketplaceRequest.offerAcceptedSuccess') }}
        </p>

        <NuxtLink v-if="orderForThisRequest" :to="`/orders/${orderForThisRequest.id}`" class="request-page__order-banner">
          <UiIcon name="check" :size="18" class="request-page__order-banner-icon" />
          <span class="request-page__order-banner-text">
            <span class="request-page__order-banner-title">{{ t('marketplaceRequest.orderCreatedTitle') }}</span>
            <span class="text-caption text-muted">{{ formatPrice(orderForThisRequest.price, locale, t('common.currency')) }} · {{ orderStatusLabel(orderForThisRequest.status, t) }}</span>
          </span>
          <UiIcon name="chevron-left" :size="16" class="request-page__order-banner-arrow" />
        </NuxtLink>
        <div v-else-if="acceptedOfferId" class="request-page__order-pending">
          <p v-if="isCreatingOrder" class="text-secondary">
            {{ t('marketplaceRequest.creatingOrder') }}
          </p>
          <template v-else-if="createOrderError">
            <p class="request-page__error">
              {{ createOrderError.message }}
            </p>
            <button type="button" class="btn btn-secondary" @click="handleRetryCreateOrder">
              {{ t('marketplaceRequest.retryCreateOrder') }}
            </button>
          </template>
        </div>

        <h2 class="text-h3 request-page__offers-title">
          {{ t('offers.offersFromContractors') }}
        </h2>

        <div v-if="requestOffersLoading" class="request-page__skeletons">
          <div v-for="n in 2" :key="n" class="request-page__skeleton" />
        </div>
        <div v-else-if="requestOffersError" class="request-page__state">
          <p class="text-secondary">
            {{ t('offers.loadError') }}
          </p>
          <button type="button" class="btn btn-secondary" @click="loadOffersForRequest(requestId)">
            {{ t('common.retry') }}
          </button>
        </div>
        <p v-else-if="requestOffers.length === 0" class="text-secondary request-page__empty">
          {{ t('offers.noOffersYet') }}
        </p>
        <div v-else class="request-page__offers">
          <p v-if="offerActionError" class="request-page__error">
            {{ offerActionError.message }}
          </p>
          <MarketplaceOfferCard
            v-for="offer in requestOffers"
            :key="offer.id"
            :offer="offer"
            mode="owner"
            :busy="offerActionId === offer.id"
            :order-id="orderForThisRequest?.id ?? null"
            @accept="handleAccept(offer.id)"
            @reject="handleReject(offer.id)"
          />
        </div>
      </template>

      <template v-else>
        <p v-if="offerSubmittedMessage" class="request-page__success">
          <UiIcon name="check" :size="16" />
          {{ t('offers.sentSuccess') }}
        </p>

        <div v-if="isAuthenticated && (myOffersLoading || contractorLoading)" class="request-page__skeletons">
          <div class="request-page__skeleton" />
        </div>

        <MarketplaceOfferCard
          v-else-if="isAuthenticated && myOfferForThisRequest"
          :offer="myOfferForThisRequest"
          mode="mine"
          :busy="offerActionId === myOfferForThisRequest.id"
          :order-id="orderForThisRequest?.id ?? null"
          class="request-page__my-offer"
          @withdraw="handleWithdraw(myOfferForThisRequest.id)"
        />

        <p v-else-if="requestDetail.status !== 'open'" class="request-page__closed-note">
          {{ t('offers.requestClosedNotice') }}
        </p>

        <MarketplaceAuthGate v-else-if="showAuthGate" :message="t('marketplace.loginToRespond')" class="request-page__auth-gate" />

        <button v-else type="button" class="btn btn-primary request-page__cta" @click="handleOfferCta">
          {{ t('offers.createTitle') }}
        </button>
      </template>
    </template>

    <MarketplaceCreateOfferSheet
      :open="showOfferSheet"
      :submitting="isCreatingOffer"
      :error="createOfferError?.message ?? null"
      @submit="handleOfferSubmit"
      @cancel="showOfferSheet = false"
    />

    <MarketplaceContractorProfileSheet
      :open="showContractorSheet"
      :submitting="contractorLoading"
      :error="contractorError?.message ?? null"
      @submit="handleContractorSubmit"
      @cancel="showContractorSheet = false"
    />
  </main>
</template>

<style scoped>
.request-page {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

.request-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-5);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.request-page__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  min-height: 50vh;
  text-align: center;
}

.request-page__status-icon {
  color: var(--color-warning);
}

.request-page__spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  animation: request-page-spin 0.7s linear infinite;
}

@keyframes request-page-spin {
  to { transform: rotate(360deg); }
}

.request-page__header {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
}

.request-page__header-info {
  flex: 1;
  min-width: 0;
}

/* Второстепенный акцент рядом с заголовком, не рекламный баннер — заметно
   меньше типичной ширины карточки на всех брейкпоинтах (см. задание). */
.request-page__thumb {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-card);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
}

.request-page__title {
  margin: 0 0 var(--space-2);
}

.request-page__location {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  overflow-wrap: break-word;
  word-break: break-word;
  color: var(--color-text-secondary);
}

.request-page__location .icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.request-page__status-pill {
  font-weight: 500;
}

.request-page__status-pill--open { color: var(--color-success); }
.request-page__status-pill--cancelled,
.request-page__status-pill--closed { color: var(--color-text-muted); }

.request-page__success {
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

.request-page__order-banner {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: var(--space-4) 0 0;
  padding: var(--space-4);
  border-radius: var(--radius-card);
  background: var(--color-success-subtle);
  text-decoration: none;
  color: inherit;
}

.request-page__order-banner-icon {
  flex-shrink: 0;
  color: var(--color-success);
}

.request-page__order-banner-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.request-page__order-banner-title {
  font-weight: 600;
  color: var(--color-text);
}

.request-page__order-banner-arrow {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transform: rotate(180deg);
}

.request-page__order-pending {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  margin: var(--space-4) 0 0;
}

.request-page__offers-title {
  margin: var(--space-8) 0 var(--space-4);
}

.request-page__offers {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.request-page__my-offer {
  margin-top: var(--space-4);
}

.request-page__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.request-page__skeleton {
  height: 100px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: request-page-pulse 1.4s ease-in-out infinite;
}

@keyframes request-page-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.request-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
}

.request-page__empty {
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
}

.request-page__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}

.request-page__closed-note {
  margin: var(--space-6) 0 0;
  padding: var(--space-4);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
  text-align: center;
}

.request-page__cta {
  width: 100%;
  height: 48px;
  margin-top: var(--space-6);
}

.request-page__auth-gate {
  margin-top: var(--space-6);
}

@media (min-width: 768px) {
  .request-page__thumb {
    width: 96px;
    height: 96px;
  }
}
</style>
