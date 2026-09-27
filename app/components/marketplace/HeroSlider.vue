<script setup lang="ts">
// Публичный hero /marketplace как mobile-first swipe-carousel (см. задание
// "Marketplace Hero Slider v1", заменяет прежний статичный
// MarketplaceHero.vue). Этот компонент отвечает ТОЛЬКО за сам slider —
// контент/переходы/pagination (см. задание, секция 16: "не смешивать
// slider logic с marketplace API logic"). Никаких marketplace API-вызовов
// здесь нет и не будет: список заявок/фильтры по-прежнему грузит и хранит
// pages/marketplace/index.vue — этот компонент лишь эмитит 'browse' для
// первого слайда, точно как раньше MarketplaceHero.vue эмитил его же (см.
// index.vue scrollToOpenRequests()). isAuthenticated читается напрямую из
// useAuth() — это общее auth-состояние приложения (тот же источник, что и
// у AuthGate/AppModeNav/ProfileMenu), не marketplace-специфичная логика.
//
// Carousel — CSS scroll-snap (тот же приём, что уже используется в
// MarketplaceBenefits.vue), не кастомный touch-drag JS: нативный swipe на
// мобильном получает правильную физику/инерцию бесплатно от браузера.
// Pagination dots синхронизируются с РЕАЛЬНЫМ scroll (см.
// resolveHeroSlideIndex в utils/marketplaceHeroSlider.ts), а не с отдельным
// "текущий слайд" состоянием, которое могло бы разойтись со свайпом.
import { MARKETPLACE_HERO_SLIDES, resolveHeroSlideHref } from '~/utils/marketplaceHeroSlider'

const emit = defineEmits<{ browse: [] }>()

const { isAuthenticated } = useAuth()
const { t } = useI18n()

const trackRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const slideCount = MARKETPLACE_HERO_SLIDES.length

function scrollToSlide(index: number) {
  const track = trackRef.value
  if (!track) return
  const clamped = Math.min(Math.max(index, 0), slideCount - 1)
  track.scrollTo({ left: track.clientWidth * clamped, behavior: 'smooth' })
}

function syncActiveIndex() {
  const track = trackRef.value
  if (!track) return
  activeIndex.value = resolveHeroSlideIndex(track.scrollLeft, track.clientWidth, slideCount)
}

function handleTrackKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    scrollToSlide(activeIndex.value + 1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    scrollToSlide(activeIndex.value - 1)
  }
}

// Resize (desktop-окно, поворот телефона) может сместить, какой slide
// физически стоит под текущим scrollLeft — пересчитываем dots, ничего не
// скроллим сами (пользователь не просил).
onMounted(() => window.addEventListener('resize', syncActiveIndex))
onUnmounted(() => window.removeEventListener('resize', syncActiveIndex))
</script>

<template>
  <section class="mp-hero-slider" :aria-roledescription="t('marketplace.heroCarouselRole')" :aria-label="t('marketplace.heroAriaLabel')">
    <div
      ref="trackRef"
      class="mp-hero-slider__track"
      tabindex="0"
      :aria-label="t('marketplace.heroTrackAriaLabel')"
      @scroll="syncActiveIndex"
      @keydown="handleTrackKeydown"
    >
      <article v-for="slide in MARKETPLACE_HERO_SLIDES" :key="slide.key" class="mp-hero-slider__slide">
        <span class="mp-hero-slider__icon" aria-hidden="true">
          <UiIcon :name="slide.icon" :size="88" />
        </span>

        <p class="mp-hero-slider__eyebrow">
          {{ t(slide.eyebrowKey) }}
        </p>
        <p class="mp-hero-slider__title">
          {{ t(slide.titleKey) }}
        </p>
        <p class="mp-hero-slider__description">
          {{ t(slide.descriptionKey) }}
        </p>

        <button
          v-if="slide.action.kind === 'browse'"
          type="button"
          class="btn btn-primary mp-hero-slider__cta"
          @click="emit('browse')"
        >
          {{ t(slide.ctaLabelKey) }}
          <UiIcon name="chevron-left" :size="16" class="mp-hero-slider__cta-icon" />
        </button>
        <NuxtLink
          v-else
          :to="resolveHeroSlideHref(slide.action, isAuthenticated) ?? '/marketplace'"
          class="btn btn-primary mp-hero-slider__cta"
        >
          {{ t(slide.ctaLabelKey) }}
          <UiIcon name="chevron-left" :size="16" class="mp-hero-slider__cta-icon" />
        </NuxtLink>
      </article>
    </div>

    <button
      type="button"
      class="mp-hero-slider__arrow mp-hero-slider__arrow--prev"
      :aria-label="t('marketplace.heroPrevSlide')"
      :disabled="activeIndex === 0"
      @click="scrollToSlide(activeIndex - 1)"
    >
      <UiIcon name="chevron-left" :size="18" />
    </button>
    <button
      type="button"
      class="mp-hero-slider__arrow mp-hero-slider__arrow--next"
      :aria-label="t('marketplace.heroNextSlide')"
      :disabled="activeIndex === slideCount - 1"
      @click="scrollToSlide(activeIndex + 1)"
    >
      <UiIcon name="chevron-left" :size="18" class="mp-hero-slider__arrow-icon-next" />
    </button>

    <div class="mp-hero-slider__dots" role="group" :aria-label="t('marketplace.heroDotsAriaLabel')">
      <button
        v-for="(slide, index) in MARKETPLACE_HERO_SLIDES"
        :key="slide.key"
        type="button"
        class="mp-hero-slider__dot"
        :class="{ 'mp-hero-slider__dot--active': index === activeIndex }"
        :aria-current="index === activeIndex ? 'true' : undefined"
        :aria-label="t('marketplace.heroSlideOf', { n: index + 1, total: slideCount, eyebrow: t(slide.eyebrowKey) })"
        @click="scrollToSlide(index)"
      />
    </div>
  </section>
</template>

<style scoped>
.mp-hero-slider {
  position: relative;
  border-radius: var(--radius-card-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.mp-hero-slider__track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  scroll-behavior: smooth;
}

.mp-hero-slider__track::-webkit-scrollbar {
  display: none;
}

.mp-hero-slider__track:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.mp-hero-slider__slide {
  position: relative;
  flex: 0 0 100%;
  scroll-snap-align: start;
  min-width: 0;
  padding: var(--space-5) var(--space-5) var(--space-8);
  overflow: hidden;
}

/* Декоративная крупная иконка-иллюстрация в углу — "в стиле самого
   сайта" (см. задание, секция 6), не фото и не отдельная зона, съедающая
   высоту слайда (см. секция 3: "высота должна быть умеренной"). */
.mp-hero-slider__icon {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  color: var(--color-primary-subtle);
  opacity: 0.9;
  pointer-events: none;
}

.mp-hero-slider__eyebrow {
  position: relative;
  margin: 0 0 4px;
  max-width: 75%;
  font-size: var(--font-caption-size);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.mp-hero-slider__title {
  position: relative;
  margin: 0 0 var(--space-2);
  max-width: 80%;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--color-graphite);
}

.mp-hero-slider__description {
  position: relative;
  margin: 0 0 var(--space-4);
  max-width: 42ch;
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
  line-height: var(--font-small-line);
}

.mp-hero-slider__cta {
  position: relative;
  width: 100%;
  min-height: 48px;
  padding: 0 var(--space-5);
}

.mp-hero-slider__cta-icon {
  transform: rotate(180deg);
}

.mp-hero-slider__arrow {
  display: none;
}

.mp-hero-slider__dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: 0 0 var(--space-4);
}

.mp-hero-slider__dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: var(--color-border-strong);
  cursor: pointer;
  /* min 44px touch target без визуально огромной точки — прозрачная
     "подушка" вокруг маленькой видимой точки. */
  position: relative;
}

.mp-hero-slider__dot::before {
  content: '';
  position: absolute;
  inset: -18px;
}

.mp-hero-slider__dot:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Активная точка — не только цвет (см. задание, секция 12: "не полагаться
   только на цвет"), но и форма/ширина: превращается в вытянутую "таблетку". */
.mp-hero-slider__dot--active {
  width: 20px;
  border-radius: 999px;
  background: var(--color-primary);
}

@media (min-width: 640px) {
  /* Боковой padding 64px — не токен spacing-шкалы, а точный расчёт под
     стрелки (см. .mp-hero-slider__arrow ниже: left/right: var(--space-3)=12px,
     width:36px -> правый край стрелки на 48px от края слайда); без этого
     текст слайда заходил под левую стрелку (замерено: 8px overlap). */
  .mp-hero-slider__slide {
    padding: var(--space-8) 64px;
  }

  .mp-hero-slider__icon {
    top: var(--space-5);
    right: var(--space-5);
  }

  .mp-hero-slider__title {
    font-size: 28px;
    max-width: 60%;
  }

  .mp-hero-slider__cta {
    width: auto;
  }

  .mp-hero-slider__arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid var(--color-border-strong);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    z-index: 1;
  }

  .mp-hero-slider__arrow:hover:not(:disabled) {
    background: var(--color-surface-subtle);
  }

  .mp-hero-slider__arrow:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .mp-hero-slider__arrow:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .mp-hero-slider__arrow--prev {
    left: var(--space-3);
  }

  .mp-hero-slider__arrow--next {
    right: var(--space-3);
  }

  .mp-hero-slider__arrow-icon-next {
    transform: rotate(180deg);
  }
}
</style>
