// Данные слайдов промо-баннера /marketplace (Promo Banner Carousel v1, см.
// задание "НУЖНО ВЕРНУТЬ SLIDER / CAROUSEL В PROMOTIONAL BANNER"). Тот же
// принцип, что и у прежнего (удалённого несколько итераций назад по явной
// просьбе пользователя) utils/marketplaceHeroSlider.ts — тестируемые
// чистые данные/функции отдельно от компонента (в проекте нет
// @vue/test-utils для монтирования SFC, см. tests/utils/*). eyebrow/title/
// description — i18n-ключи, не готовые строки: резолвятся через t() в
// PromoBanner.vue.
//
// Carousel — БЕЗ видимых controls (без dots/arrows/CTA, см. задание,
// секция "КРИТИЧЕСКИ ВАЖНО": "пользователь не должен видеть стандартный UI
// carousel"): переключение полностью автоматическое, см. PromoBanner.vue
// (setInterval + crossfade через CSS opacity). Три фото — уже загруженные
// пользователем public/banner/banner-{1,2,3}.png, ни одно не создавалось
// заново.
export interface PromoSlide {
  key: string
  eyebrowKey: string
  titleKey: string
  descriptionKey: string
  image: string
  imageAltKey: string
}

export const MARKETPLACE_PROMO_SLIDES: PromoSlide[] = [
  {
    key: 'need-repair',
    eyebrowKey: 'marketplace.promoSlide1Eyebrow',
    titleKey: 'marketplace.promoSlide1Title',
    descriptionKey: 'marketplace.promoSlide1Description',
    image: '/banner/banner-2.png',
    imageAltKey: 'marketplace.promoSlide1ImageAlt',
  },
  {
    key: 'have-work',
    eyebrowKey: 'marketplace.promoSlide2Eyebrow',
    titleKey: 'marketplace.promoSlide2Title',
    descriptionKey: 'marketplace.promoSlide2Description',
    image: '/banner/banner-1.png',
    imageAltKey: 'marketplace.promoSlide2ImageAlt',
  },
  {
    key: 'start-repair',
    eyebrowKey: 'marketplace.promoSlide3Eyebrow',
    titleKey: 'marketplace.promoSlide3Title',
    descriptionKey: 'marketplace.promoSlide3Description',
    image: '/banner/banner-3.png',
    imageAltKey: 'marketplace.promoSlide3ImageAlt',
  },
]

// Циклический переход к следующему слайду — чистая функция (тестируется
// отдельно от таймера/компонента, тот же приём, что resolveHeroSlideIndex
// раньше). total<=0 — defensive, никогда не должно случиться (массив выше
// всегда непустой), но не делить на 0.
export function nextPromoSlideIndex(current: number, total: number): number {
  if (total <= 0) return 0
  return (current + 1) % total
}
