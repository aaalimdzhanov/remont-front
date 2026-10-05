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
// Header nav label "Биржа" -> "Заявки" (navigation.requests — тот же ключ,
// что раньше использовал и CONTRACTOR_NAV_ITEMS для /marketplace, до
// Navigation split v2 ниже, который убрал оттуда этот пункт целиком; не
// изменение navigation.marketplace, см. история этого файла).
//
// Navigation split v1: у CLIENT "Заявки" вело на /marketplace, где заодно
// показывало "Мои заявки" вперемешку с чужими открытыми — теперь ведёт на
// /my-requests, отдельную личную страницу ТОЛЬКО своих заявок (см.
// pages/my-requests.vue).
const CLIENT_NAV_ITEMS: UserModeNavItem[] = [
  { labelKey: 'navigation.projects', to: '/projects', icon: 'folder' },
  { labelKey: 'navigation.requests', to: '/my-requests', icon: 'store' },
  { labelKey: 'navigation.orders', to: '/orders', icon: 'list' },
  { labelKey: 'navigation.reviews', to: '/reviews', icon: 'star' },
]

// Navigation split v2: у CONTRACTOR пункт "Заявки" (-> /marketplace) убран —
// он дублировал назначение логотипа (тот уже ведёт на /marketplace для
// любого пользователя, см. AppHeader.vue), создавая две точки входа на
// один и тот же route рядом друг с другом. /marketplace остаётся
// единственным местом, где мастер смотрит открытые заявки — просто
// достижимым через логотип, а не ещё и через отдельный nav item.
const CONTRACTOR_NAV_ITEMS: UserModeNavItem[] = [
  { labelKey: 'navigation.offers', to: '/marketplace/offers', icon: 'coins' },
  { labelKey: 'navigation.orders', to: '/orders', icon: 'list' },
  { labelKey: 'navigation.services', to: '/marketplace/contractor', icon: 'hammer' },
  { labelKey: 'navigation.reviews', to: '/reviews', icon: 'star' },
]

export function getUserModeNavItems(mode: UserMode): UserModeNavItem[] {
  return mode === 'client' ? CLIENT_NAV_ITEMS : CONTRACTOR_NAV_ITEMS
}

// ---- Mode ↔ Route consistency (см. задание "Header/body mode desync
// bugfix") ----
// Единственный source of truth для "главной страницы" каждого режима —
// переключатель режима (useUserMode.setMode) переходит именно сюда, чтобы
// header (mode из useState) и body (текущий route) никогда не расходились.
// /projects — главная точка входа клиента, /marketplace — мастера (см.
// задание, секция ПРАВИЛО НАВИГАЦИИ); НЕ /marketplace/offers и не
// CONTRACTOR_NAV_ITEMS[0].to — тот пункт меню сознательно убран из nav
// (см. Navigation split v2 выше), но /marketplace как публичная биржа
// остаётся главной точкой входа мастера независимо от этого.
const MODE_HOME_ROUTE: Record<UserMode, string> = {
  client: '/projects',
  contractor: '/marketplace',
}

export function getModeHomeRoute(mode: UserMode): string {
  return MODE_HOME_ROUTE[mode]
}

// ---- Contractor Profile Gate (см. задание, секция 7 и 17) ----
// mode==='contractor' НИКОГДА не доказывает существование Contractor-профиля
// — backend остаётся единственным источником истины. undefined = ещё не
// проверяли (см. useMarketplace().contractor) — в этом состоянии рано
// показывать onboarding, это не то же самое, что "профиля точно нет".
export function shouldShowContractorOnboarding(mode: UserMode, contractor: Contractor | null | undefined): boolean {
  return mode === 'contractor' && contractor === null
}
