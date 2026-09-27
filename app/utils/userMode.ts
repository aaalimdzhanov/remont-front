// User Mode — frontend-only UI preference ('client' | 'contractor'), NOT an
// authorization role (см. app/composables/useUserMode.ts). Это единственный
// модуль в проекте, который трогает localStorage — до этой задачи проект
// сознательно обходился без browser storage (см. комментарии в
// projectNavigation.ts/ProjectNavigation.vue/pages/projects/[id]/index.vue).
// Здесь это оправдано: единственное состояние, которое должно пережить
// закрытие вкладки браузера (не только refresh — см. задание, секция
// PERSISTENCE), не являющееся auth-секретом (access token по-прежнему живёт
// только в module-level ref в api/client.ts, никогда не здесь).
import type { Contractor } from '~/api/types'

export type UserMode = 'client' | 'contractor'

const STORAGE_KEY = 'ishonchliusta:user-mode'

function isUserMode(value: unknown): value is UserMode {
  return value === 'client' || value === 'contractor'
}

// import.meta.client — falsy под чистым Vitest (нет window, см. tests/setup.ts)
// и на сервере при SSR; localStorage при этом безопасно не трогается вообще.
export function readStoredUserMode(): UserMode | null {
  if (!import.meta.client) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return isUserMode(raw) ? raw : null
  } catch {
    // Приватный режим браузера/заблокированный storage — не ошибка
    // приложения, просто персистентность недоступна в этой вкладке.
    return null
  }
}

export function writeStoredUserMode(mode: UserMode): void {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // См. readStoredUserMode — молча игнорируем, mode всё равно работает
    // в рамках текущей вкладки через useState, просто не переживёт reload.
  }
}

export function clearStoredUserMode(): void {
  if (!import.meta.client) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // См. выше.
  }
}

// ---- AppHeader / marketplace pages: mode-aware nav (см. задание, секция
// APP HEADER). Только реальные существующие routes — никаких выдуманных
// "глобальных Работ" без проекта (их не существует, см. финальный отчёт,
// Known limitations) и никаких /client/* или /contractor/* (секция ROUTING).
export interface UserModeNavItem {
  // i18n-ключ (namespace navigation.*), не готовая строка — резолвится через
  // t() в AppModeNav.vue, самом месте, где рендерится (этот файл — чистый
  // TS-util без доступа к useI18n()).
  labelKey: string
  to: string
  icon: 'folder' | 'store' | 'coins' | 'hammer' | 'list' | 'star'
}

// "Заказы" (/orders, см. задание "Marketplace Order Frontend v1") — одна
// страница для обоих режимов (см. pages/orders/index.vue), не /client/*
// или /contractor/* (см. задание, секция ROUTING). "Отзывы" (/reviews, см.
// задание "Marketplace Review & Rating Frontend v1") — та же логика: одна
// страница, набор табов "Мои"/"Полученные" не зависит от client/contractor
// режима (см. pages/reviews/index.vue) — mode влияет только на то, попадает
// ли пункт "Отзывы" в client- или contractor-набор навигации, не на
// содержимое самой страницы.
const CLIENT_NAV_ITEMS: UserModeNavItem[] = [
  { labelKey: 'navigation.projects', to: '/projects', icon: 'folder' },
  { labelKey: 'navigation.marketplace', to: '/marketplace', icon: 'store' },
  { labelKey: 'navigation.orders', to: '/orders', icon: 'list' },
  { labelKey: 'navigation.reviews', to: '/reviews', icon: 'star' },
]

const CONTRACTOR_NAV_ITEMS: UserModeNavItem[] = [
  { labelKey: 'navigation.requests', to: '/marketplace', icon: 'store' },
  { labelKey: 'navigation.offers', to: '/marketplace/offers', icon: 'coins' },
  { labelKey: 'navigation.orders', to: '/orders', icon: 'list' },
  { labelKey: 'navigation.services', to: '/marketplace/contractor', icon: 'hammer' },
  { labelKey: 'navigation.reviews', to: '/reviews', icon: 'star' },
]

export function getUserModeNavItems(mode: UserMode): UserModeNavItem[] {
  return mode === 'client' ? CLIENT_NAV_ITEMS : CONTRACTOR_NAV_ITEMS
}

// ---- Contractor Profile Gate (см. задание, секция 7 и 17) ----
// mode==='contractor' НИКОГДА не доказывает существование Contractor-профиля
// — backend остаётся единственным источником истины. undefined = ещё не
// проверяли (см. useMarketplace().contractor) — в этом состоянии рано
// показывать onboarding, это не то же самое, что "профиля точно нет".
export function shouldShowContractorOnboarding(mode: UserMode, contractor: Contractor | null | undefined): boolean {
  return mode === 'contractor' && contractor === null
}
