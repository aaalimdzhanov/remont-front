<script setup lang="ts">
// Сетка портфолио — переиспользуется и в owner-виде ("Мои работы",
// editable=true: удаление + drag-reorder), и в публичном профиле мастера
// (editable=false: только просмотр). Один компонент вместо двух почти
// одинаковых сеток (см. задание, секция 15: "не создавай новые компоненты
// без необходимости").
//
// Drag-reorder — Pointer Events (не HTML5 Drag&Drop): HTML5 DnD не
// работает на touch-устройствах без полифилла, а аудитория проекта
// mobile-first (см. задание, секция 20/13). Перетаскивание начинается
// только с ручки-грипа (иконка 'grip'), не с самой карточки — иначе клик
// по фото для просмотра (see @open) конфликтовал бы с драгом. Во время
// драга позиция пересчитывается локально (localOrder) по ближайшей соседней
// карточке (nearest-center), PATCH уходит только один раз, на pointerup —
// не на каждый pointermove (см. задание, секция 13: "не отправлять PATCH на
// каждый mousemove").
import type { PortfolioItem } from '~/api/types'
import { moveItem, portfolioImageAlt } from '~/utils/portfolio'

// Общая по форме и с PortfolioItem (owner), и с PublicPortfolioItem
// (публичный профиль) — структурная совместимость, второй тип пропа не
// заводим.
interface GridItem {
  id: string
  imageUrl: string
  title: string
  description: string
  sortOrder: number
}

const props = withDefaults(defineProps<{
  items: GridItem[]
  editable?: boolean
  deletingId?: string | null
  reordering?: boolean
}>(), {
  editable: false,
  deletingId: null,
  reordering: false,
})

const emit = defineEmits<{
  delete: [id: string]
  reorder: [items: PortfolioItem[]]
  open: [item: GridItem]
}>()

const gridEl = ref<HTMLElement | null>(null)
const draggingId = ref<string | null>(null)
const localOrder = ref<GridItem[]>([...props.items])

watch(() => props.items, (next) => {
  if (!draggingId.value) localOrder.value = [...next]
})

function handlePointerDown(event: PointerEvent, id: string) {
  if (!props.editable || props.reordering || props.deletingId) return
  draggingId.value = id
  ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!draggingId.value || !gridEl.value) return
  const cards = Array.from(gridEl.value.querySelectorAll<HTMLElement>('[data-portfolio-card-id]'))
  let closestId: string | null = null
  let closestDist = Infinity
  for (const card of cards) {
    const rect = card.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.hypot(event.clientX - cx, event.clientY - cy)
    if (dist < closestDist) {
      closestDist = dist
      closestId = card.dataset.portfolioCardId ?? null
    }
  }
  const fromIndex = localOrder.value.findIndex(i => i.id === draggingId.value)
  const toIndex = closestId ? localOrder.value.findIndex(i => i.id === closestId) : -1
  if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
    localOrder.value = moveItem(localOrder.value, fromIndex, toIndex)
  }
}

function handlePointerUp() {
  if (!draggingId.value) return
  draggingId.value = null
  const changed = localOrder.value.some((item, idx) => item.id !== props.items[idx]?.id)
  if (changed) emit('reorder', localOrder.value as PortfolioItem[])
}

function handleOpen(item: GridItem) {
  if (draggingId.value) return
  emit('open', item)
}
</script>

<template>
  <div
    ref="gridEl"
    class="portfolio-grid"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
  >
    <div
      v-for="item in localOrder"
      :key="item.id"
      :data-portfolio-card-id="item.id"
      class="portfolio-grid__card"
      :class="{
        'portfolio-grid__card--busy': deletingId === item.id,
        'portfolio-grid__card--dragging': draggingId === item.id,
      }"
    >
      <button type="button" class="portfolio-grid__image-btn" @click="handleOpen(item)">
        <img
          :src="item.imageUrl"
          :alt="portfolioImageAlt(item.title)"
          class="portfolio-grid__image"
          loading="lazy"
        >
      </button>

      <div v-if="item.title || item.description" class="portfolio-grid__body">
        <p v-if="item.title" class="portfolio-grid__title">
          {{ item.title }}
        </p>
        <p v-if="item.description" class="portfolio-grid__description">
          {{ item.description }}
        </p>
      </div>

      <div v-if="editable" class="portfolio-grid__actions">
        <button
          type="button"
          class="portfolio-grid__handle"
          aria-label="Изменить порядок"
          :disabled="reordering"
          @pointerdown="handlePointerDown($event, item.id)"
        >
          <UiIcon name="grip" :size="16" />
        </button>
        <button
          type="button"
          class="portfolio-grid__delete"
          aria-label="Удалить работу"
          :disabled="deletingId === item.id"
          @click="emit('delete', item.id)"
        >
          <UiIcon name="trash" :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.portfolio-grid__card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  overflow: hidden;
  min-width: 0;
}

.portfolio-grid__card--busy {
  opacity: 0.6;
  pointer-events: none;
}

.portfolio-grid__card--dragging {
  opacity: 0.5;
}

.portfolio-grid__image-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.portfolio-grid__image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
  background: var(--color-surface-subtle);
}

.portfolio-grid__body {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.portfolio-grid__title {
  margin: 0;
  font-weight: 500;
  font-size: var(--font-small-size);
  color: var(--color-text);
  overflow-wrap: break-word;
  word-break: break-word;
}

.portfolio-grid__description {
  margin: 0;
  font-size: var(--font-caption-size);
  color: var(--color-text-secondary);
  overflow-wrap: break-word;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.portfolio-grid__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
  padding: 0 var(--space-2) var(--space-2);
  margin-top: auto;
}

.portfolio-grid__handle,
.portfolio-grid__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-input);
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  touch-action: none;
}

.portfolio-grid__handle:hover,
.portfolio-grid__delete:hover {
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
}

.portfolio-grid__delete:hover {
  color: var(--color-error);
}

.portfolio-grid__handle {
  cursor: grab;
}

@media (min-width: 600px) {
  .portfolio-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }
}

@media (min-width: 768px) {
  .portfolio-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
