// Guest Work Builder — persistence списка выбранных работ ТОЛЬКО в
// localStorage, НЕ backend (см. задание "Guest Work Builder", секция GUEST
// SAVE / BACK НАВИГАЦИЯ). Тот же паттерн, что и utils/builderDraft.ts —
// module-level STORAGE_KEY, window-guard, простые функции, без общего
// storage-wrapper ради одного потребителя.
//
// Хранится весь список GuestWorkItem — ровно то, что нужно для
// восстановления списка работ на /projects/draft/works после hard refresh,
// ДО того как гость нажал "Сохранить проект" и прошёл авторизацию; после
// успешного saveSessionAfterAuth() вызывающий код сам чистит этот ключ.
import type { GuestWorkItem } from '~/composables/useGuestWorkBuilder'

const STORAGE_KEY = 'ishonchliusta:guest-works'

export function saveGuestWorksToStorage(items: GuestWorkItem[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // localStorage недоступен (приватный режим/квота) — список просто не
    // переживёт refresh, не критично (см. задание: "не усложнять").
  }
}

export function loadGuestWorksFromStorage(): GuestWorkItem[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GuestWorkItem[]
  } catch {
    return null
  }
}

export function clearGuestWorksStorage(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
