<script setup lang="ts">
// Builder Hero /marketplace — заменяет прежний promo-carousel (PromoBanner.vue
// + utils/marketplacePromoSlides.ts, удалены отдельной задачей). Один
// статичный блок, без autoplay/dots/carousel state.
//
// Layout v2 (см. задание "ДОРАБОТАТЬ Builder Hero — композиция reference"):
// раньше преимущества лежали ВНУТРИ текстовой колонки (текст → кнопка →
// 3 преимущества → большой preview под всем этим — высокий вертикальный
// блок). Теперь ровно 2 зоны + отдельная нижняя строка:
//   .builder-hero__top (текст слева | preview справа, ряд с 768px) +
//   .builder-hero__features (отдельная full-width строка под обеими
//   колонками, не часть текстовой колонки). На mobile __top остаётся
//   колонкой (текст, потом компактный preview), __features — ниже.
//
// Единственный живой API-запрос этой страницы (/marketplace) по-прежнему не
// трогается — блок не грузит ничего асинхронно, вся геометрия ниже статична.
//
// Builder preview — НЕ фото и НЕ generic-иллюстрация дома, а настоящий
// рендер через уже существующий Geometry Engine (app/geometry/preview.ts
// buildBuildingPreview — та же функция, что ProjectPreview.vue на Dashboard
// и RoomPreviewThumb.vue в Work Builder используют для любого реального
// Building JSON). demoBuilding ниже — обычный валидный Building (room/wall/
// opening) с демонстрационными комнатами, просто не сохранённый ни в один
// проект. Подписи комнат (название + площадь) рисуются поверх тех же
// SVG-rect отдельными <text> в одном и том же viewBox — координаты те же
// самые, что у rect'ов, доп. совмещения не требуется.
//
// Вкладки "2D план"/"3D вид", вертикальный toolbar и курсор-индикатор — чисто
// декоративная "рамка приложения" вокруг plan (см. задание, секция "ВАЖНЫЙ
// МОМЕНТ": "можно показать небольшие UI элементы... но это ТОЛЬКО
// визуальный preview"). Это <span>/aria-hidden, без @click и без hover-
// состояний, намекающих на интерактивность — ничего не переключает и не
// отправляет, весь блок помечен aria-hidden="true" целиком.
//
// CTA ведёт на /projects/draft — публичный Builder entry point (см. задание
// "РАЗРЕШИТЬ НЕАВТОРИЗОВАННОМУ ПОЛЬЗОВАТЕЛЮ ИСПОЛЬЗОВАТЬ BUILDER",
// app/pages/projects/draft/index.vue), БЕЗ middleware:'auth' — гость сразу
// попадает в Builder, а не на /auth/login. Было /projects/new
// (authenticated-only форма создания) — эта задача сознательно сменила
// целевой route именно здесь, не трогая сам /projects/new (он остаётся для
// других входных точек, например "+ Новый проект" на /projects).
//
// "Продолжить план" (см. задание "УПРОСТИТЬ ВЫХОД ИЗ GUEST BUILDER") —
// draftSummary читается ТОЛЬКО на клиенте (onMounted, не SSR: localStorage
// недоступен на сервере, а эта страница и так ssr:false, см. nuxt.config
// routeRules) из уже существующего guest-draft механизма (utils/
// builderDraft.ts — тот же, что /projects/draft использует для
// hard-refresh-резистентности, не второй). Если draft есть — CTA ведёт на
// тот же /projects/draft (draft.vue сам восстановит его из localStorage,
// никакого отдельного query-параметра не нужно); "Начать новый план" явно
// чистит localStorage ПЕРЕД переходом на тот же route — тогда draft.vue
// увидит пустой storage и откроет чистый Builder. Единственное место во
// всём guest-flow, где остаётся confirm — здесь, и только потому что это
// единственное реально деструктивное действие (безвозвратно удаляет
// существующий draft), в отличие от обычного ухода через ←/logo в
// Builder (см. DraftHeader.vue — там confirm сознательно убран).
import type { Building } from '~/types/building'
import { buildBuildingPreview } from '~/geometry/preview'
import type { DraftSummary } from '~/utils/builderDraft'

const { t } = useI18n()

const draftSummary = ref<DraftSummary | null>(null)
const showStartNewConfirm = ref(false)

onMounted(() => {
  draftSummary.value = loadDraftSummary()
})

function handleStartNew() {
  clearDraftStorage()
  showStartNewConfirm.value = false
  navigateTo('/projects/draft')
}

interface DemoRoomLabel {
  nameKey: string
  area: number
  cx: number
  cy: number
}

// 5 комнат, сетка 8×7 м — тот же принцип планировки, что на reference image
// (гостиная + спальня в одном ряду, кухня/прихожая/санузел в другом), только
// собранная из обычных Building-примитивов, а не нарисованная как картинка.
const demoBuilding: Building = {
  id: 'demo',
  type: 'apartment',
  dimensions: { width: 8, length: 7 },
  floors: [{ id: 'f1', number: 0, elevation: 0, height: 3 }],
  rooms: [
    { id: 'living', floor_id: 'f1', name: 'Гостиная', type: 'living_room', geometry: { type: 'rectangle', width: 4.6, length: 4.2, position: { x: 0, z: 0 }, rotation: 0 } },
    { id: 'bedroom', floor_id: 'f1', name: 'Спальня', type: 'bedroom', geometry: { type: 'rectangle', width: 3.4, length: 4.2, position: { x: 4.6, z: 0 }, rotation: 0 } },
    { id: 'kitchen', floor_id: 'f1', name: 'Кухня', type: 'kitchen', geometry: { type: 'rectangle', width: 3.2, length: 2.8, position: { x: 0, z: 4.2 }, rotation: 0 } },
    { id: 'hallway', floor_id: 'f1', name: 'Прихожая', type: 'hallway', geometry: { type: 'rectangle', width: 2.4, length: 2.8, position: { x: 3.2, z: 4.2 }, rotation: 0 } },
    { id: 'bathroom', floor_id: 'f1', name: 'С/У', type: 'bathroom', geometry: { type: 'rectangle', width: 2.4, length: 2.8, position: { x: 5.6, z: 4.2 }, rotation: 0 } },
  ],
  walls: [
    { id: 'wall-ext-top', floor_id: 'f1', type: 'exterior', start: { x: 0, z: 0 }, end: { x: 8, z: 0 }, height: 3, thickness: 0.2, room_ids: ['living', 'bedroom'] },
    { id: 'wall-ext-bottom', floor_id: 'f1', type: 'exterior', start: { x: 0, z: 7 }, end: { x: 8, z: 7 }, height: 3, thickness: 0.2, room_ids: ['kitchen', 'hallway', 'bathroom'] },
    { id: 'wall-ext-left', floor_id: 'f1', type: 'exterior', start: { x: 0, z: 0 }, end: { x: 0, z: 7 }, height: 3, thickness: 0.2, room_ids: ['living', 'kitchen'] },
    { id: 'wall-ext-right', floor_id: 'f1', type: 'exterior', start: { x: 8, z: 0 }, end: { x: 8, z: 7 }, height: 3, thickness: 0.2, room_ids: ['bedroom', 'bathroom'] },
    { id: 'wall-int-row1', floor_id: 'f1', type: 'interior', start: { x: 4.6, z: 0 }, end: { x: 4.6, z: 4.2 }, height: 3, thickness: 0.2, room_ids: ['living', 'bedroom'] },
    { id: 'wall-int-split', floor_id: 'f1', type: 'interior', start: { x: 0, z: 4.2 }, end: { x: 8, z: 4.2 }, height: 3, thickness: 0.2, room_ids: ['living', 'bedroom', 'kitchen', 'hallway', 'bathroom'] },
    { id: 'wall-int-row2a', floor_id: 'f1', type: 'interior', start: { x: 3.2, z: 4.2 }, end: { x: 3.2, z: 7 }, height: 3, thickness: 0.2, room_ids: ['kitchen', 'hallway'] },
    { id: 'wall-int-row2b', floor_id: 'f1', type: 'interior', start: { x: 5.6, z: 4.2 }, end: { x: 5.6, z: 7 }, height: 3, thickness: 0.2, room_ids: ['hallway', 'bathroom'] },
  ],
  openings: [
    { id: 'door-entrance', type: 'door', wall_id: 'wall-ext-bottom', dimensions: { width: 0.9, height: 2.1 }, position: { offset: 3.6, bottom: 0 } },
    { id: 'door-living-kitchen', type: 'door', wall_id: 'wall-int-split', dimensions: { width: 0.9, height: 2.1 }, position: { offset: 1.6, bottom: 0 } },
    { id: 'door-living-bedroom', type: 'door', wall_id: 'wall-int-row1', dimensions: { width: 0.9, height: 2.1 }, position: { offset: 1.5, bottom: 0 } },
    { id: 'window-living', type: 'window', wall_id: 'wall-ext-left', dimensions: { width: 1.6, height: 1.4 }, position: { offset: 1.5, bottom: 0.9 } },
    { id: 'window-bedroom', type: 'window', wall_id: 'wall-ext-top', dimensions: { width: 1.4, height: 1.4 }, position: { offset: 5.6, bottom: 0.9 } },
    { id: 'window-bathroom', type: 'window', wall_id: 'wall-ext-right', dimensions: { width: 1, height: 1.4 }, position: { offset: 5, bottom: 0.9 } },
  ],
  stairs: [],
  roof: null,
  elements: [],
}

const MARGIN = 0.3
const preview = buildBuildingPreview(demoBuilding)
const viewBox = `${-MARGIN} ${-MARGIN} ${preview.viewBoxWidth + MARGIN * 2} ${preview.viewBoxHeight + MARGIN * 2}`

const roomLabels: DemoRoomLabel[] = demoBuilding.rooms.map((room) => {
  const g = room.geometry as Extract<typeof room.geometry, { type: 'rectangle' }>
  const nameKeyByRoomId: Record<string, string> = {
    living: 'marketplace.builderHeroRoomLiving',
    bedroom: 'marketplace.builderHeroRoomBedroom',
    kitchen: 'marketplace.builderHeroRoomKitchen',
    hallway: 'marketplace.builderHeroRoomHallway',
    bathroom: 'marketplace.builderHeroRoomBathroom',
  }
  return {
    nameKey: nameKeyByRoomId[room.id] ?? room.id,
    area: g.width * g.length,
    cx: g.position.x + g.width / 2,
    cy: g.position.z + g.length / 2,
  }
})

// Декоративный toolbar вдоль левого края preview (см. doc comment выше) —
// те же иконки, что уже есть в существующем Work Builder (app/components/
// ui/Icon.vue), просто статично перечисленные, без второго набора SVG-путей.
const toolbarIcons = ['select', 'edit', 'wall', 'door', 'window', 'dimension'] as const
</script>

<template>
  <section class="builder-hero" :aria-label="t('marketplace.builderHeroTitle')">
    <div class="builder-hero__top">
      <div class="builder-hero__text">
        <p class="builder-hero__eyebrow">
          {{ t('marketplace.builderHeroEyebrow') }}
        </p>
        <h2 class="builder-hero__title">
          {{ t('marketplace.builderHeroTitle') }}
        </h2>
        <p class="builder-hero__description">
          {{ t('marketplace.builderHeroDescription') }}
        </p>
        <NuxtLink to="/projects/draft" class="btn btn-primary builder-hero__cta">
          {{ draftSummary ? t('marketplace.builderHeroContinueCta') : t('marketplace.builderHeroCta') }}
          <UiIcon name="chevron-left" :size="16" class="builder-hero__cta-icon" />
        </NuxtLink>

        <div v-if="draftSummary" class="builder-hero__draft-row">
          <span class="builder-hero__draft-summary">
            {{ t('marketplace.builderHeroDraftRooms', { count: draftSummary.roomCount }, draftSummary.roomCount) }}
            · {{ draftSummary.areaM2.toFixed(1) }} {{ t('builder.unit.m2') }}
          </span>
          <button type="button" class="builder-hero__draft-start-new" @click="showStartNewConfirm = true">
            {{ t('marketplace.startNewPlan') }}
          </button>
        </div>
      </div>

      <div class="builder-hero__preview" aria-hidden="true">
        <div class="builder-hero__tabs">
          <span class="builder-hero__tab builder-hero__tab--active">{{ t('marketplace.builderHeroTab2d') }}</span>
          <span class="builder-hero__tab">{{ t('marketplace.builderHeroTab3d') }}</span>
        </div>

        <div class="builder-hero__canvas">
          <div class="builder-hero__toolbar">
            <span
              v-for="(icon, index) in toolbarIcons"
              :key="icon"
              class="builder-hero__tool"
              :class="{ 'builder-hero__tool--active': index === 0 }"
            >
              <UiIcon :name="icon" :size="13" />
            </span>
          </div>

          <svg :viewBox="viewBox" preserveAspectRatio="xMidYMid meet" class="builder-hero__plan">
            <rect v-for="(r, i) in preview.roomRects" :key="`room-${i}`" :x="r.x" :y="r.y" :width="r.width" :height="r.height" class="builder-hero__room" />
            <rect v-for="(r, i) in preview.wallRects" :key="`wall-${i}`" :x="r.x" :y="r.y" :width="r.width" :height="r.height" class="builder-hero__wall" />
            <rect v-for="(r, i) in preview.windowRects" :key="`window-${i}`" :x="r.x" :y="r.y" :width="r.width" :height="r.height" class="builder-hero__window" />
            <rect v-for="(r, i) in preview.doorRects" :key="`door-${i}`" :x="r.x" :y="r.y" :width="r.width" :height="r.height" class="builder-hero__door" />
            <template v-for="label in roomLabels" :key="label.nameKey">
              <text :x="label.cx" :y="label.cy - 0.18" text-anchor="middle" class="builder-hero__room-name">{{ t(label.nameKey) }}</text>
              <text :x="label.cx" :y="label.cy + 0.3" text-anchor="middle" class="builder-hero__room-area">{{ label.area.toFixed(1) }} {{ t('builder.unit.m2') }}</text>
            </template>
            <path
              d="M2.3 1.3 L2.3 1.9 L2.47 1.75 L2.6 2.08 L2.75 2.02 L2.62 1.69 L2.84 1.65 Z"
              class="builder-hero__cursor"
            />
          </svg>
        </div>
      </div>
    </div>

    <ul class="builder-hero__features">
      <li class="builder-hero__feature">
        <span class="builder-hero__feature-icon"><UiIcon name="grid-2d" :size="16" /></span>
        {{ t('marketplace.builderHeroFeature1') }}
      </li>
      <li class="builder-hero__feature">
        <span class="builder-hero__feature-icon"><UiIcon name="dimension" :size="16" /></span>
        {{ t('marketplace.builderHeroFeature2') }}
      </li>
      <li class="builder-hero__feature">
        <span class="builder-hero__feature-icon"><UiIcon name="hammer" :size="16" /></span>
        {{ t('marketplace.builderHeroFeature3') }}
      </li>
    </ul>
  </section>

  <UiConfirmDialog
    :open="showStartNewConfirm"
    :title="t('marketplace.startNewPlanTitle')"
    :message="t('marketplace.startNewPlanMessage')"
    :confirm-text="t('marketplace.startNewPlan')"
    :cancel-text="t('common.cancel')"
    @confirm="handleStartNew"
    @cancel="showStartNewConfirm = false"
  />
</template>

<style scoped>
.builder-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.builder-hero__top {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.builder-hero__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.builder-hero__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.builder-hero__title {
  margin: 0;
  /* 13ch — "Создайте план" ровно, перенос на "своего дома" второй строкой
     (см. задание: "ОБЯЗАТЕЛЬНО повторить перенос из reference", "не в одну
     строку"). ch — не px/em: держит тот же перенос при смене font-size по
     breakpoint'ам без отдельных переопределений, а для uz-строки (длиннее
     ru) просто переносит по ближайшей границе слова — всё ещё 2 строки, а
     не 1. */
  max-width: 13ch;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 700;
  color: var(--color-graphite);
}

.builder-hero__description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
  line-height: 1.5;
}

.builder-hero__cta {
  align-self: flex-start;
  margin-top: var(--space-1);
  min-height: 44px;
}

.builder-hero__cta-icon {
  transform: rotate(180deg);
}

/* "Продолжить план" — компактная строка под CTA (см. задание "УПРОСТИТЬ
   ВЫХОД ИЗ GUEST BUILDER", секция 20: "не огромный блок только ради
   draft") — короткая сводка + secondary text-action, не вторая карточка. */
.builder-hero__draft-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  margin-top: var(--space-1);
}

.builder-hero__draft-summary {
  font-size: var(--font-caption-size);
  color: var(--color-text-secondary);
}

.builder-hero__draft-start-new {
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-caption-size);
  font-weight: 500;
  color: var(--color-primary);
  text-decoration: underline;
  cursor: pointer;
}

/* Нижняя строка преимуществ — ВНЕ текстовой колонки (см. doc comment в
   script: Layout v2), отдельный full-width ряд под обеими зонами. Grid с
   фиксированными 3 колонками (не flex-wrap) — ровно ОДНА строка на любой
   ширине, включая mobile (см. задание: "НЕ делать 2 сверху + 1 снизу" —
   flex-wrap расползался на 2+1 уже на ~390px, repeat(3,1fr) не разъезжается
   никогда, узкий текст внутри ячейки просто переносится на 2 строки сам). */
.builder-hero__features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) 0 0;
  border-top: 1px solid var(--color-border);
  list-style: none;
}

.builder-hero__feature {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  min-width: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
  line-height: 1.3;
}

.builder-hero__feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

/* ---- Builder preview — "рамка приложения": вкладки + toolbar + plan ---- */
.builder-hero__preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  padding: var(--space-2);
}

.builder-hero__tabs {
  align-self: flex-start;
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  background: var(--color-border);
}

.builder-hero__tab {
  padding: 3px var(--space-2);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.builder-hero__tab--active {
  background: var(--color-surface);
  color: var(--color-graphite);
}

.builder-hero__canvas {
  display: flex;
  gap: var(--space-2);
  flex: 1;
  min-height: 0;
  padding: var(--space-2);
  border-radius: var(--radius-input);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.builder-hero__toolbar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: var(--space-2);
  border-right: 1px solid var(--color-border);
}

.builder-hero__tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: var(--color-text-muted);
}

.builder-hero__tool--active {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.builder-hero__plan {
  display: block;
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 170px;
}

.builder-hero__room { fill: #F2EFE9; }
.builder-hero__wall { fill: var(--color-graphite); }
.builder-hero__door { fill: #EDE3D3; }
.builder-hero__window { fill: #E3EEF1; }
.builder-hero__cursor { fill: var(--color-graphite); stroke: var(--color-surface); stroke-width: 0.03; }

.builder-hero__room-name {
  font-size: 0.32px;
  font-weight: 600;
  fill: var(--color-graphite);
}

.builder-hero__room-area {
  font-size: 0.26px;
  fill: var(--color-text-secondary);
}

/* Builder Hero: desktop/tablet — текст слева / preview справа в ряд (см.
   задание "ЖЕЛАЕМАЯ КОМПОЗИЦИЯ"), тот же breakpoint, что и у остальной
   /marketplace страницы (.marketplace-page__hero, .marketplace-page__grid). */
@media (min-width: 768px) {
  .builder-hero {
    padding: var(--space-5);
  }

  .builder-hero__top {
    flex-direction: row;
    align-items: stretch;
    gap: var(--space-6);
  }

  .builder-hero__text {
    flex: 0 1 44%;
    justify-content: center;
    gap: var(--space-3);
  }

  .builder-hero__title {
    font-size: 30px;
  }

  .builder-hero__preview {
    flex: 1 1 56%;
    padding: var(--space-3);
  }

  .builder-hero__plan {
    height: 230px;
  }

  .builder-hero__features {
    gap: var(--space-4);
  }
}

@media (min-width: 1024px) {
  .builder-hero {
    padding: var(--space-6) var(--space-8);
    border-radius: 22px;
  }

  .builder-hero__title {
    font-size: 36px;
  }

  .builder-hero__description {
    font-size: var(--font-body-lg-size);
  }

  .builder-hero__plan {
    height: 280px;
  }
}
</style>
