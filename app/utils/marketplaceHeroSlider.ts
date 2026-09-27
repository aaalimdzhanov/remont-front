// Presentation-only данные + pure helpers для публичного hero-slider
// /marketplace (см. app/components/marketplace/HeroSlider.vue). Вынесено
// сюда по тому же принципу, что и остальной проект (см. tests/components/
// order/OrderContractorCard.test.ts): здесь нет @vue/test-utils и не
// монтируется ни один SFC, поэтому вся НЕ-визуальная логика компонента
// (какой контент показывать, куда ведёт CTA, как считать активный slide по
// scroll-позиции) живёт в обычных тестируемых функциях, а не внутри
// <script setup>.
//
// Три слайда — статичный маркетинговый контент продукта (см. задание
// "Marketplace Hero Slider v1"), не данные backend'а. Иконки — те же line-
// icons, что и везде в проекте (см. UiIcon.vue), просто крупнее — decorative
// иллюстрация "в стиле самого сайта", а не фотография.

export type HeroSlideIcon = 'hammer' | 'grid-2d' | 'star'

// 'browse' — первый слайд ведёт не на отдельный route, а прокручивает уже
// открытую /marketplace к секции "Открытые заявки" (та же механика, что и у
// старого MarketplaceHero.vue: @browse emit, см. index.vue
// scrollToOpenRequests()) — переход на "/marketplace" не имеет смысла,
// когда мы уже на этой странице.
// 'link' — реальный существующий route. `to` — куда ведёт АВТОРИЗОВАННОГО
// пользователя; для гостя resolveHeroSlideHref() ниже оборачивает его в
// уже существующий auth redirect (?redirect=), не изобретая новую
// auth-логику (см. utils/authRedirect.ts, pages/auth/login.vue).
export type HeroSlideAction =
  | { kind: 'browse' }
  | { kind: 'link', to: string }

// eyebrow/title/description/ctaLabel — i18n-ключи (namespace marketplace.hero*),
// не готовые строки: этот файл — plain TS без гарантированного Vue-контекста
// на момент загрузки модуля, резолвятся через t() в HeroSlider.vue.
export interface HeroSlide {
  key: string
  eyebrowKey: string
  titleKey: string
  descriptionKey: string
  ctaLabelKey: string
  icon: HeroSlideIcon
  action: HeroSlideAction
}

export const MARKETPLACE_HERO_SLIDES: HeroSlide[] = [
  {
    key: 'contractor',
    eyebrowKey: 'marketplace.heroContractorEyebrow',
    titleKey: 'marketplace.heroContractorTitle',
    descriptionKey: 'marketplace.heroContractorDescription',
    ctaLabelKey: 'marketplace.heroContractorCta',
    icon: 'hammer',
    action: { kind: 'browse' },
  },
  {
    key: 'client',
    eyebrowKey: 'marketplace.heroClientEyebrow',
    titleKey: 'marketplace.heroClientTitle',
    descriptionKey: 'marketplace.heroClientDescription',
    ctaLabelKey: 'marketplace.heroClientCta',
    icon: 'grid-2d',
    // Разместить заявку на бирже можно только изнутри проекта (Project ->
    // Work Builder -> "Разместить на бирже", см. ProjectWorkCard.vue) —
    // отдельного "создать заявку без проекта" route в приложении нет (см.
    // задание: "использовать существующий route, не создавать новый
    // endpoint"). /projects — ближайшая реальная точка входа в этот flow.
    action: { kind: 'link', to: '/projects' },
  },
  {
    key: 'profile',
    eyebrowKey: 'marketplace.heroProfileEyebrow',
    titleKey: 'marketplace.heroProfileTitle',
    descriptionKey: 'marketplace.heroProfileDescription',
    ctaLabelKey: 'marketplace.heroProfileCta',
    icon: 'star',
    // /marketplace/contractor — уже существующая приватная страница
    // создания/редактирования СВОЕГО профиля мастера (не путать с публичным
    // /marketplace/contractors/{id}).
    action: { kind: 'link', to: '/marketplace/contractor' },
  },
]

// Guest -> тот же auth flow, что уже использует MarketplaceAuthGate.vue
// (?redirect=<куда вернуться после входа>, см. utils/authRedirect.ts) — не
// новая авторизация, а прокидывание того же query-параметра, который
// pages/auth/login.vue и register.vue уже читают. Возвращает null для
// action.kind === 'browse' (там нет ссылки вообще, только @click).
export function resolveHeroSlideHref(action: HeroSlideAction, isAuthenticated: boolean): string | null {
  if (action.kind !== 'link') return null
  if (isAuthenticated) return action.to
  return `/auth/login?redirect=${encodeURIComponent(action.to)}`
}

// Синхронизация pagination dots с реальной scroll-позицией track'а
// (scroll-snap carousel, см. компонент) — а не с отдельным "текущий слайд"
// состоянием, которое могло бы разойтись с ручным свайпом пользователя.
// clamp на оба края защищает от дробного/overscroll scrollLeft (iOS Safari
// rubber-banding и т.п.) и от деления на 0 до первого layout-пасса.
export function resolveHeroSlideIndex(scrollLeft: number, slideWidth: number, slideCount: number): number {
  if (slideWidth <= 0 || slideCount <= 0) return 0
  const raw = Math.round(scrollLeft / slideWidth)
  return Math.min(Math.max(raw, 0), slideCount - 1)
}
