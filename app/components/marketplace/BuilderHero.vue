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
// Вертикальный toolbar и курсор-индикатор — чисто декоративная "рамка
// приложения" вокруг plan (см. задание, секция "ВАЖНЫЙ МОМЕНТ": "можно
// показать небольшие UI элементы... но это ТОЛЬКО визуальный preview"). Это
// <span>/aria-hidden, без @click и без hover-состояний, намекающих на
// интерактивность — ничего не переключает и не отправляет.
//
// 3-slide Builder Preview slider (см. задание "Marketplace Builder Preview →
// 3-слайдовый визуальный slider"): раньше тут был один статичный 2D-план с
// чисто декоративной парой текстовых вкладок "2D план"/"3D вид" НАД ним
// (aria-hidden, без @click). Теперь это настоящий 3-слайдовый slider —
// 2D / 3D / реальный проект — и эти же две строки ("2D план"/"3D вид", те же
// существующие i18n-ключи, НЕ новые) стали подписями слайдов 1 и 2 вместо
// статичной пары вкладок. Контент:
//  - Slide 1 (2D) — ТОТ ЖЕ SVG-рендер через buildBuildingPreview(), что и
//    был (см. demoBuilding/preview ниже) — ни одна цифра/геометрия не
//    изменилась, просто теперь это "слайд 1", а не единственный вид;
//  - Slide 2 (3D) — готовый локальный 3D-рендер плана, см. public/banner/
//    (не Three.js, не второй Geometry Engine — просто другой локальный
//    asset, тем же способом, что и slide 3, см. задание "вместо второго
//    слайда подставь public/banner/banner-3d.png"). Оригинал banner-3d.png
//    (1.8 МБ, 1536×1024) оставлен как есть, пересжат офлайн (Pillow,
//    1200×800, JPEG q82) в banner-3d-preview.jpg (~106 КБ). object-fit:
//    contain, не cover (см. CSS) — по периметру изображения подписи комнат,
//    обрезка краёв их бы срезала;
//  - Slide 3 (реальный проект) — локальный JPEG-asset (см. public/banner/),
//    НЕ внешний URL. Оригинал public/banner/room.png (2 МБ, 1672×941)
//    оставлен как есть, пересжат офлайн (Pillow, 1200×675, JPEG q80) в
//    room-preview.jpg (~125 КБ) — см. задание, секция PERFORMANCE: "не
//    грузить огромные оригиналы". (Более ранний вариант этого слайда
//    использовал public/banner/banner-1.png/banner-1-preview.jpg — тот
//    asset остался в репозитории неиспользуемым, не удалён.)
//
// Dots (НЕ arrows, см. задание, секция 5 "СТРЕЛОК НЕ ДОЛЖНО БЫТЬ") — реальные
// <button> с aria-current/aria-label, autoplay 4500ms (приостанавливается
// при prefers-reduced-motion, см. onMounted) и touch-swipe с явным различением
// горизонтального/вертикального жеста (см. onTouchMove) — вертикальный scroll
// страницы никогда не блокируется. Ничего из этого не трогает Building JSON/
// useBuilding/Geometry Engine/Three.js — чисто presentational slider state.
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

// ---- 3-slide Builder Preview slider (см. doc comment выше) ----
const SLIDE_COUNT = 3
const AUTOPLAY_MS = 4500
const slideLabelKeys = ['marketplace.builderHeroTab2d', 'marketplace.builderHeroTab3d', 'marketplace.builderHeroTabReal'] as const

const activeSlide = ref(0)
const prefersReducedMotion = ref(false)

let autoplayTimer: ReturnType<typeof setInterval> | null = null

function stepSlide(delta: number) {
  activeSlide.value = (activeSlide.value + delta + SLIDE_COUNT) % SLIDE_COUNT
}

function stopAutoplay() {
  if (autoplayTimer !== null) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

// prefers-reduced-motion (см. задание, секция ACCESSIBILITY) — ни autoplay,
// ни CSS-transition между слайдами не запускаются вовсе, а не просто
// "ускоряются": сам прыжок между состояниями остаётся, анимация — нет.
function startAutoplay() {
  stopAutoplay()
  if (prefersReducedMotion.value) return
  autoplayTimer = setInterval(() => stepSlide(1), AUTOPLAY_MS)
}

// Ручное взаимодействие (точка/swipe) не "мешает" автоплею (см. задание,
// секция AUTOPLAY), а просто перезапускает тот же таймер с нуля — иначе
// слайд, который пользователь только что выбрал сам, мог бы тут же
// смениться автоматически через долю секунды.
function goToSlide(index: number) {
  activeSlide.value = index
  startAutoplay()
}

// ---- Touch swipe — см. задание, секция SWIPE: "если пользователь скроллит
// страницу вертикально, slider НЕ должен перехватывать вертикальный жест".
// preventDefault() вызывается ТОЛЬКО после того, как горизонтальное
// намерение жеста уже однозначно подтверждено (|dx| ощутимо больше |dy|) —
// до этого момента обычный вертикальный scroll проходит насквозь нетронутым. ----
const SWIPE_INTENT_PX = 10
const SWIPE_COMMIT_PX = 40
let touchStartX = 0
let touchStartY = 0
let isHorizontalSwipe = false

function onTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  isHorizontalSwipe = false
}

function onTouchMove(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  const dx = touch.clientX - touchStartX
  const dy = touch.clientY - touchStartY
  if (!isHorizontalSwipe && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_INTENT_PX) {
    isHorizontalSwipe = true
  }
  if (isHorizontalSwipe) event.preventDefault()
}

function onTouchEnd(event: TouchEvent) {
  if (!isHorizontalSwipe) return
  const touch = event.changedTouches[0]
  if (!touch) return
  const dx = touch.clientX - touchStartX
  if (Math.abs(dx) > SWIPE_COMMIT_PX) stepSlide(dx < 0 ? 1 : -1)
  startAutoplay()
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  startAutoplay()
})

onBeforeUnmount(() => {
  stopAutoplay()
})
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

      <div class="builder-hero__preview">
        <div
          class="builder-hero__slider"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div
            class="builder-hero__track"
            :class="{ 'builder-hero__track--instant': prefersReducedMotion }"
            :style="{ transform: `translateX(-${activeSlide * 100}%)` }"
          >
            <!-- Slide 1 — 2D: тот же SVG-рендер через buildBuildingPreview(), что и был (см. doc comment в script) -->
            <div class="builder-hero__slide" :aria-hidden="activeSlide === 0 ? undefined : 'true'">
              <span class="builder-hero__slide-label">{{ t('marketplace.builderHeroTab2d') }}</span>
              <div class="builder-hero__canvas" aria-hidden="true">
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

            <!-- Slide 2 — 3D: готовый локальный 3D-рендер плана (см. doc comment в script) -->
            <div class="builder-hero__slide" :aria-hidden="activeSlide === 1 ? undefined : 'true'">
              <span class="builder-hero__slide-label">{{ t('marketplace.builderHeroTab3d') }}</span>
              <div class="builder-hero__canvas">
                <img
                  src="/banner/banner-3d-preview.jpg"
                  :alt="t('marketplace.builderHero3dAlt')"
                  class="builder-hero__plan builder-hero__3d-image"
                  width="1200"
                  height="800"
                  loading="lazy"
                >
              </div>
            </div>

            <!-- Slide 3 — реальный проект: локальный asset, см. doc comment в script -->
            <div class="builder-hero__slide" :aria-hidden="activeSlide === 2 ? undefined : 'true'">
              <span class="builder-hero__slide-label">{{ t('marketplace.builderHeroTabReal') }}</span>
              <div class="builder-hero__canvas">
                <img
                  src="/banner/room-preview.jpg"
                  :alt="t('marketplace.builderHeroRealProjectAlt')"
                  class="builder-hero__plan builder-hero__real-image"
                  width="1200"
                  height="675"
                  loading="lazy"
                >
              </div>
            </div>
          </div>
        </div>

        <div class="builder-hero__dots" role="group" :aria-label="t('marketplace.builderHeroSliderAriaLabel')">
          <button
            v-for="(labelKey, index) in slideLabelKeys"
            :key="labelKey"
            type="button"
            class="builder-hero__dot"
            :class="{ 'builder-hero__dot--active': index === activeSlide }"
            :aria-label="t('marketplace.builderHeroGoToSlide', { name: t(labelKey) })"
            :aria-current="index === activeSlide ? 'true' : undefined"
            @click="goToSlide(index)"
          />
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

/* ---- 3-slide slider: track/slides/dots (см. doc comment в script) ---- */
.builder-hero__slider {
  overflow: hidden;
  border-radius: var(--radius-input);
  /* touch-action: pan-y — горизонтальный swipe обрабатывает JS (onTouchMove/
     onTouchEnd), но браузер должен по умолчанию уметь прокручивать страницу
     вертикально ДО того, как JS вообще определит намерение жеста (см.
     задание, секция SWIPE: "вертикальный scroll НЕ должен перехватываться") —
     это объявление, а не замена JS-проверке, оба работают вместе. */
  touch-action: pan-y;
}

.builder-hero__track {
  display: flex;
  transition: transform 380ms ease;
}

.builder-hero__track--instant {
  transition: none;
}

.builder-hero__slide {
  position: relative;
  flex: 0 0 100%;
  min-width: 0;
}

/* Подпись слайда — та же пилюля, что раньше была статичной парой вкладок
   2D/3D НАД preview (см. doc comment в script) — теперь одна на каждый
   слайд, поверх левого верхнего угла, читаема и на фото (slide 3). */
.builder-hero__slide-label {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  z-index: 1;
  padding: 3px var(--space-2);
  border-radius: 999px;
  background: var(--color-surface);
  font-size: 10px;
  font-weight: 600;
  color: var(--color-graphite);
  box-shadow: var(--shadow-card);
}

.builder-hero__dots {
  align-self: center;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.builder-hero__dot {
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.builder-hero__dot::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-border-strong);
  transition: background-color 200ms ease, transform 200ms ease;
}

.builder-hero__dot--active::before {
  background: var(--color-primary);
  transform: scale(1.3);
}

.builder-hero__dot:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 50%;
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

/* Slide 2 (3D) — готовый локальный 3D-рендер плана (см. doc comment в
   script) — object-fit:contain, не cover: в отличие от slide 3 (обычное
   декоративное фото, где обрезка по краям не теряет смысл), здесь по всему
   периметру изображения стоят подписи комнат (Гостиная/Спальня/...) —
   обрезка могла бы их срезать, поэтому вся картинка всегда видна целиком. */
.builder-hero__3d-image {
  display: block;
  object-fit: contain;
  border-radius: var(--radius-input);
}

/* Slide 3 (реальный проект) — ТОТ ЖЕ "canvas"-фрейм (padding/border/радиус),
   что у остальных 2 слайдов (см. .builder-hero__canvas выше) — НЕ убираем
   padding: если бы высота canvas'а здесь отличалась (например, без padding)
   от slide 1/2, общая высота slider'а скакала бы при переключении (см.
   задание, секция 10 "ВСЕ СЛАЙДЫ ОДИНАКОВОГО РАЗМЕРА" — критично). Просто
   нет toolbar/border у самого изображения внутри той же рамки. */
.builder-hero__real-image {
  display: block;
  object-fit: cover;
  border-radius: var(--radius-input);
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

/* См. задание, секция ACCESSIBILITY — помимо JS-проверки (prefersReducedMotion
   отключает сам autoplay/transition через .builder-hero__track--instant),
   это прямая CSS-гарантия на случай, если переключение всё же произойдёт
   (dot click/swipe по-прежнему работают при reduced-motion — отключается
   именно анимация, не сама функциональность). */
@media (prefers-reduced-motion: reduce) {
  .builder-hero__track {
    transition: none;
  }

  .builder-hero__dot::before {
    transition: none;
  }
}
</style>
