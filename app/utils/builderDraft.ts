// Anonymous Builder draft — persistence ТОЛЬКО в localStorage, НЕ backend
// (см. задание "РАЗРЕШИТЬ НЕАВТОРИЗОВАННОМУ ПОЛЬЗОВАТЕЛЮ ИСПОЛЬЗОВАТЬ
// BUILDER", секция SCENARIO 3 / SECURITY). Единственная цель — пережить hard
// refresh на /projects/draft ДО того, как гость нажал «Сохранить проект» и
// прошёл авторизацию; после успешного createProjectFromDraft() вызывающий
// код сам чистит это через clearDraftStorage().
//
// Тот же паттерн, что и utils/userMode.ts (module-level STORAGE_KEY,
// window-guard, простые функции) — не вводим новый общий storage-wrapper
// ради одного потребителя.
//
// Хранится весь BuildingDocument целиком (building JSON + project.name) —
// ровно то, что нужно для восстановления Builder. НЕ секрет и НЕ access
// token (тот этим модулем не трогается вообще).
import type { BuildingDocument } from '~/types/building'

const STORAGE_KEY = 'ishonchliusta:builder-draft'

export function saveDraftToStorage(doc: BuildingDocument): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
  } catch {
    // localStorage недоступен (приватный режим/квота) — черновик просто не
    // переживёт refresh, не критично для MVP (см. задание: "не усложнять").
  }
}

export function loadDraftFromStorage(): BuildingDocument | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BuildingDocument
  } catch {
    return null
  }
}

export function clearDraftStorage(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// "Достаточно содержательный, чтобы предлагать 'Продолжить план'" — см.
// задание "УПРОСТИТЬ ВЫХОД ИЗ GUEST BUILDER", Case A: гость открыл Builder
// и ничего не менял → не создавать бессмысленный draft. Порог — хотя бы
// одна комната: только building.dimensions без единой комнаты (пользователь
// дошёл до экрана "Создать здание", но дальше не продвинулся) — всё ещё не
// то, что стоит предлагать восстановить.
export function isMeaningfulDraft(doc: BuildingDocument): boolean {
  return doc.building.rooms.length > 0
}

// Пишет draft только если он содержательный (см. isMeaningfulDraft) —
// иначе чистит ключ. Единая точка вызова и для фоновой синхронизации
// (draft.vue, на каждую мутацию), и для явного ухода (DraftHeader.vue
// handleBack()) — так "гость создал и тут же удалил единственную комнату"
// не оставляет пустой draft висеть в localStorage.
export function syncDraftToStorage(doc: BuildingDocument): void {
  if (isMeaningfulDraft(doc)) saveDraftToStorage(doc)
  else clearDraftStorage()
}

export interface DraftSummary {
  roomCount: number
  areaM2: number
}

// Для карточки "Продолжить план" на /marketplace (см. задание, секция 20) —
// короткая сводка без десериализации всего документа на вызывающей стороне.
// null — либо черновика нет вообще, либо он не прошёл isMeaningfulDraft
// (не должно происходить в норме, т.к. syncDraftToStorage сам чистит такие,
// но проверяем явно — не полагаемся на то, что ничего другого в этот же
// ключ не запишет).
export function loadDraftSummary(): DraftSummary | null {
  const doc = loadDraftFromStorage()
  if (!doc || !isMeaningfulDraft(doc)) return null
  return { roomCount: doc.building.rooms.length, areaM2: doc.calculated.areas.floor }
}
