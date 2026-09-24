<script setup lang="ts">
// Screen 6 card. Статус меняется только через backend (PATCH .../status) —
// локально до успешного ответа НЕ меняется (см. задание, секция STATUS):
// статус, который показывает карточка, — всегда props.status, не локальная
// копия. ⋮-меню — тот же паттерн popover, что и ProfileMenu.vue.
import type { MarketplaceRequest, Order, QuantityMode, WorkStatus, WorkUnit } from '~/api/types'

const props = defineProps<{
  title: string
  icon: 'wall' | 'layers' | 'grid' | 'ceiling' | 'bolt' | 'faucet' | 'door' | 'window' | 'hammer' | 'roller' | 'room'
  quantity: number
  unit: WorkUnit
  quantityMode: QuantityMode
  status: WorkStatus
  statusUpdating: boolean
  deleting: boolean
  // undefined — ещё не проверяли (см. useMarketplace.checkWorkRequest,
  // вызывается лениво при первом открытии меню, не для всех карточек сразу);
  // 'none' — точно нет заявки (404); объект — есть заявка любого статуса
  // (включая 'draft' — см. Draft → Publish v1).
  marketplaceRequest?: MarketplaceRequest | 'none'
  // busy-индикатор именно для publish этой карточки (см. useMarketplace.ts
  // requestActionId === work.id) — тот же паттерн, что statusUpdating/deleting
  // выше, отдельным полем, а не выводится из marketplaceRequest.status.
  publishing?: boolean
  // Заказ, созданный из этой заявки, если marketplaceRequest.status ===
  // 'closed' — резолвится снаружи (см. pages/projects/[id]/works.vue
  // useOrders().findOrderByRequestId), может быть null, если заявка закрыта,
  // но заказ ещё не подгружен/не найден (честно показываем нейтральный
  // статус вместо выдуманной ссылки, см. задание, секция MARKETPLACE
  // REQUEST DETAIL).
  order?: Order | null
}>()

const emit = defineEmits<{
  'update-status': [status: WorkStatus]
  delete: []
  'menu-opened': []
  'find-contractor': []
  'view-marketplace-request': [requestId: string]
  'view-order': [orderId: string]
  'publish-request': []
}>()

const menuOpen = ref(false)
const confirmOpen = ref(false)
const rootEl = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) emit('menu-opened')
}

function closeMenu() {
  menuOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (menuOpen.value && rootEl.value && !rootEl.value.contains(event.target as Node)) closeMenu()
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

function handleStatusPick(status: WorkStatus) {
  closeMenu()
  if (status !== props.status) emit('update-status', status)
}

function handleDeleteRequest() {
  closeMenu()
  confirmOpen.value = true
}

function handleDeleteConfirm() {
  confirmOpen.value = false
  emit('delete')
}

const sourceHint = computed(() => (props.quantityMode === 'automatic' ? 'Рассчитано по плану' : 'Введено вручную'))

// "Заявка размещена"/"Найти мастера"/"Заказ" — см. интеграцию Marketplace в
// pages/projects/[id]/works.vue. Статус заявки проверяется лениво (только
// при первом открытии меню конкретной карточки, см. emit('menu-opened')),
// а не для всех работ проекта сразу при загрузке страницы.
//
// 'cancelled' — заявку можно разместить заново (заказ не создавался);
// 'closed' — заказ уже создан, "Найти мастера" здесь показывать нельзя (см.
// задание, секция MARKETPLACE REQUEST DETAIL) — вместо этого "Заказ", если
// он уже резолвлен снаружи (props.order), иначе нейтральный статус без действия.
// 'draft' (Draft → Publish v1) — заявка уже создана, но ещё не опубликована:
// "Найти мастера" здесь не показываем (заявка уже существует, создавать
// вторую не нужно) — вместо этого отдельная ветка ниже с "Опубликовать".
const showFindContractor = computed(() => props.marketplaceRequest === 'none' || (typeof props.marketplaceRequest === 'object' && props.marketplaceRequest.status === 'cancelled'))
const isDraftRequest = computed(() => typeof props.marketplaceRequest === 'object' && props.marketplaceRequest.status === 'draft')
const showViewRequest = computed(() => typeof props.marketplaceRequest === 'object' && props.marketplaceRequest.status === 'open')
const isClosedRequest = computed(() => typeof props.marketplaceRequest === 'object' && props.marketplaceRequest.status === 'closed')
const showViewOrder = computed(() => isClosedRequest.value && !!props.order)

function handleFindContractor() {
  closeMenu()
  emit('find-contractor')
}

function handlePublishRequest() {
  if (props.publishing) return
  closeMenu()
  emit('publish-request')
}

function handleViewRequest() {
  closeMenu()
  if (typeof props.marketplaceRequest === 'object') emit('view-marketplace-request', props.marketplaceRequest.id)
}

function handleViewOrder() {
  closeMenu()
  if (props.order) emit('view-order', props.order.id)
}
</script>

<template>
  <div ref="rootEl" class="work-card" :class="{ 'work-card--busy': deleting }">
    <UiIcon :name="icon" :size="20" class="work-card__icon" />

    <div class="work-card__info">
      <p class="work-card__title">
        {{ title }}
      </p>
      <p class="text-caption text-muted">
        {{ formatQuantity(quantity, unit) }} · {{ sourceHint }}
      </p>
    </div>

    <span class="work-card__status" :class="`work-card__status--${status}`">
      {{ statusUpdating ? '…' : statusLabel(status) }}
    </span>

    <div class="work-card__menu">
      <button type="button" class="work-card__menu-btn" aria-label="Действия" :aria-expanded="menuOpen" @click="toggleMenu">
        <UiIcon name="more" :size="16" />
      </button>

      <div v-if="menuOpen" class="work-card__panel" role="menu">
        <p class="text-caption text-muted work-card__panel-label">
          Изменить статус
        </p>
        <button
          v-for="option in WORK_STATUS_OPTIONS"
          :key="option"
          type="button"
          class="work-card__panel-item"
          role="menuitem"
          :class="{ 'work-card__panel-item--active': option === status }"
          @click="handleStatusPick(option)"
        >
          {{ statusLabel(option) }}
        </button>
        <div class="work-card__panel-divider" />

        <button
          v-if="showFindContractor"
          type="button"
          class="work-card__panel-item"
          role="menuitem"
          @click="handleFindContractor"
        >
          <UiIcon name="store" :size="14" />
          Найти мастера
        </button>
        <button
          v-else-if="isDraftRequest"
          type="button"
          class="work-card__panel-item"
          role="menuitem"
          :disabled="publishing"
          @click="handlePublishRequest"
        >
          <UiIcon name="store" :size="14" />
          {{ publishing ? 'Публикуем…' : 'Черновик · опубликовать' }}
        </button>
        <button
          v-else-if="showViewRequest"
          type="button"
          class="work-card__panel-item"
          role="menuitem"
          @click="handleViewRequest"
        >
          <UiIcon name="store" :size="14" />
          Заявка размещена · посмотреть
        </button>
        <button
          v-else-if="showViewOrder"
          type="button"
          class="work-card__panel-item"
          role="menuitem"
          @click="handleViewOrder"
        >
          <UiIcon name="check" :size="14" />
          Заказ · посмотреть
        </button>
        <p v-else-if="isClosedRequest" class="text-caption text-muted work-card__panel-loading">
          Заказ создан
        </p>
        <p v-else class="text-caption text-muted work-card__panel-loading">
          Проверяем биржу…
        </p>

        <div class="work-card__panel-divider" />
        <button type="button" class="work-card__panel-item work-card__panel-item--danger" role="menuitem" @click="handleDeleteRequest">
          <UiIcon name="trash" :size="14" />
          Удалить
        </button>
      </div>
    </div>

    <UiConfirmDialog
      :open="confirmOpen"
      title="Удалить работу?"
      :message="`«${title}» будет удалена из плана работ проекта.`"
      confirm-text="Удалить"
      danger
      @confirm="handleDeleteConfirm"
      @cancel="confirmOpen = false"
    />
  </div>
</template>

<style scoped>
.work-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.work-card--busy {
  opacity: 0.6;
}

.work-card__icon {
  flex-shrink: 0;
  color: var(--color-primary);
}

.work-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.work-card__title {
  margin: 0;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-card__status {
  flex-shrink: 0;
  font-size: var(--font-caption-size);
  padding: 2px var(--space-2);
  border-radius: 999px;
  white-space: nowrap;
}

.work-card__status--planned { color: var(--color-text-secondary); background: var(--color-surface-subtle); }
.work-card__status--in_progress { color: var(--color-warning); background: var(--color-warning-subtle); }
.work-card__status--completed { color: var(--color-success); background: var(--color-success-subtle); }

.work-card__menu {
  position: relative;
  flex-shrink: 0;
}

.work-card__menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: -12px -8px;
  border: none;
  background: none;
  border-radius: var(--radius-input);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.work-card__menu-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-subtle);
}

.work-card__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  min-width: 190px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-modal);
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.work-card__panel-label {
  margin: var(--space-1) var(--space-2) 0;
}

.work-card__panel-loading {
  margin: 0;
  padding: var(--space-2);
}

.work-card__panel-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: 0 var(--space-2);
  border: none;
  background: none;
  border-radius: var(--radius-input);
  font-family: var(--font-family);
  font-size: var(--font-small-size);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.work-card__panel-item:hover {
  background: var(--color-surface-subtle);
}

.work-card__panel-item:disabled {
  opacity: 0.6;
  cursor: default;
}

.work-card__panel-item:disabled:hover {
  background: none;
}

.work-card__panel-item--active {
  color: var(--color-primary);
  font-weight: 500;
}

.work-card__panel-item--danger {
  color: var(--color-error);
}

.work-card__panel-divider {
  height: 1px;
  margin: var(--space-1) 0;
  background: var(--color-border);
}
</style>
