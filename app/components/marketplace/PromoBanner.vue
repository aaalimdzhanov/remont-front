<script setup lang="ts">
// Промо-баннер /marketplace. Promo Banner Carousel v1 (см. задание "НУЖНО
// ВЕРНУТЬ SLIDER / CAROUSEL В PROMOTIONAL BANNER"): автоплей-carousel из 3
// слайдов (app/utils/marketplacePromoSlides.ts) БЕЗ видимых controls —
// никаких dots/arrows/CTA, переключение полностью автоматическое через
// crossfade (opacity-transition), визуально это по-прежнему один статичный
// premium-баннер, а не "стандартный carousel UI" (см. задание, секция
// "КРИТИЧЕСКИ ВАЖНО"). Дизайн/разметка одного слайда не менялись — тот же
// .mp-promo__media (img + .mp-promo__scrim градиент) + .mp-promo__text, что
// и в предыдущей static-версии; сейчас это просто повторяется на каждый
// слайд внутри .mp-promo__slide (position:absolute — все 3 слайда лежат
// друг на друге, .mp-promo сохраняет фиксированную height, поэтому высота
// баннера НЕ прыгает при переключении).
//
// Почему carousel был убран раньше и почему сейчас снова добавлен — оба
// раза по явной прямой просьбе пользователя в этой же сессии (сначала
// "полностью удалить slider", затем "верни carousel, не меняя текущий
// визуальный дизайн"): второй раз реализован НЕ как откат к прежнему
// MarketplaceHeroSlider.vue (тот был CSS scroll-snap с видимыми dots/
// стрелками/CTA на каждом слайде — сознательно НЕ возвращается), а как
// autoplay-only carousel поверх уже одобренного premium-дизайна.
//
// Автоплей — обычный setInterval (в проекте нет carousel-библиотеки и
// задание прямо просит не устанавливать новую без необходимости, см.
// секцию "USER INTERACTION"): activeIndex меняется через
// nextPromoSlideIndex() каждые AUTOPLAY_INTERVAL_MS. Пауза на
// hover/focus — та же логика, что задание описывает опционально
// ("можно остановить... можно продолжить"), реализована через
// mouseenter/mouseleave + focusin/focusout на самой ссылке.
//
// Клик по всему баннеру (независимо от активного слайда) по-прежнему
// ведёт на /projects/new — реальный существующий route создания нового
// проекта (см. pages/projects/index.vue handleNew() — та же кнопка
// "+ Новый проект"), не выдуманный "создать заявку" endpoint. Guest
// получает стандартный redirect на /auth/login от уже существующего
// middleware:'auth' — тот же механизм, что и для любой другой защищённой
// ссылки в приложении.
import { MARKETPLACE_PROMO_SLIDES, nextPromoSlideIndex } from '~/utils/marketplacePromoSlides'

const { t } = useI18n()

const slides = MARKETPLACE_PROMO_SLIDES
const activeIndex = ref(0)

const AUTOPLAY_INTERVAL_MS = 5500
let timer: ReturnType<typeof setInterval> | null = null

function stopAutoplay() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function startAutoplay() {
  stopAutoplay()
  timer = setInterval(() => {
    activeIndex.value = nextPromoSlideIndex(activeIndex.value, slides.length)
  }, AUTOPLAY_INTERVAL_MS)
}

onMounted(startAutoplay)
onUnmounted(stopAutoplay)
</script>

<template>
  <NuxtLink
    to="/projects/new"
    class="mp-promo"
    :aria-label="t('marketplace.promoAriaLabel')"
    @mouseenter="stopAutoplay"
    @mouseleave="startAutoplay"
    @focusin="stopAutoplay"
    @focusout="startAutoplay"
  >
    <div
      v-for="(slide, index) in slides"
      :key="slide.key"
      class="mp-promo__slide"
      :class="{ 'mp-promo__slide--active': index === activeIndex }"
      :aria-hidden="index === activeIndex ? undefined : 'true'"
    >
      <div class="mp-promo__media">
        <img :src="slide.image" :alt="t(slide.imageAltKey)" class="mp-promo__img">
        <div class="mp-promo__scrim" aria-hidden="true" />
      </div>

      <div class="mp-promo__text">
        <p class="mp-promo__eyebrow">
          {{ t(slide.eyebrowKey) }}
        </p>
        <p class="mp-promo__title">
          {{ t(slide.titleKey) }}
        </p>
        <p class="mp-promo__description">
          {{ t(slide.descriptionKey) }}
        </p>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.mp-promo {
  position: relative;
  display: block;
  /* Компактнее desktop (см. задание: "не делать чрезмерно высокий mobile
     баннер"), но горизонтальная композиция (текст слева/фото справа)
     сохраняется той же, просто в мельчайшем масштабе. Фиксированная
     height — гарантия, что баннер не "прыгает" при смене слайдов (см.
     задание, секция CAROUSEL BEHAVIOR: "высота banner не должна
     меняться"). */
  height: 300px;
  border-radius: 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color var(--transition-fast);
}

.mp-promo:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Слайды лежат друг на друге (absolute inset:0 внутри уже
   position:relative .mp-promo) — crossfade через opacity, не через
   layout/scroll (см. задание, секция TRANSITION: "opacity transition /
   crossfade... старый слайд постепенно исчезает, новый постепенно
   появляется"). */
.mp-promo__slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 900ms ease;
}

.mp-promo__slide--active {
  opacity: 1;
  z-index: 1;
}

.mp-promo__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.mp-promo__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Center на любой ширине: при узком/почти квадратном соотношении
     mobile-карточки cover и так показывает только среднюю вертикальную
     полосу широкого исходника — именно там, где на фото мастер. */
  object-position: center;
  display: block;
}

/* Горизонтальный градиент на ЛЮБОЙ ширине — непрозрачно слева (текстовая
   безопасная зона), фото открывается справа. Короткий/слабый fade (см.
   задание "gradient слишком сильный"): solid зона короче (48%) и fade
   завершается к 76% — правая четверть карточки показывает фото/мастера в
   оригинальной яркости, не разбавленно. */
.mp-promo__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    var(--color-surface) 0%,
    var(--color-surface) 48%,
    rgba(255, 255, 255, 0.55) 58%,
    rgba(255, 255, 255, 0.15) 68%,
    rgba(255, 255, 255, 0) 76%
  );
}

.mp-promo__text {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-2);
  height: 100%;
  max-width: 68%;
  padding: var(--space-5) var(--space-4);
}

.mp-promo__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.mp-promo__title {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--color-graphite);
}

.mp-promo__description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.4;
}

@media (min-width: 768px) {
  /* Desktop: та же техника, градиент горизонтальный (см. doc comment в
     script и reference image). Высота/radius/padding — по заданию. */
  .mp-promo {
    border-radius: 22px;
    height: 340px;
  }

  .mp-promo__scrim {
    /* Solid до 38%, полностью чистое фото уже с 64%. */
    background: linear-gradient(
      90deg,
      var(--color-surface) 0%,
      var(--color-surface) 38%,
      rgba(255, 255, 255, 0.6) 48%,
      rgba(255, 255, 255, 0.2) 56%,
      rgba(255, 255, 255, 0) 64%
    );
  }

  .mp-promo__text {
    max-width: 50%;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-10);
  }

  .mp-promo__eyebrow {
    font-size: 19px;
  }

  .mp-promo__title {
    font-size: 36px;
    line-height: 1.1;
    /* Подобрано под точный перенос reference image: "Найдите мастера" на
       первой строке, "для своей задачи" на второй (только у слайда 1 —
       остальные слайды переносятся естественно при этой же ширине). */
    max-width: 16ch;
  }

  .mp-promo__description {
    font-size: 19px;
    line-height: 1.45;
    max-width: 27ch;
  }
}
</style>
