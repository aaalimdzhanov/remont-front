// Guest Work Builder — локальный (не-ProjectWork) список выбранных работ для
// неавторизованного пользователя на /projects/draft/works. Шаговый
// UI/selection-flow (room → category → type → calculation) остаётся в
// useWorkBuilder() НЕ ИЗМЕНЁННЫМ и переиспользуется как есть — этот
// composable знает только о второй половине: как работа добавляется/удаляется/
// пересчитывается без backend-проекта, и как весь guest-сеанс "повышается" до
// настоящего Project+ProjectWork[] после авторизации (см. задание, секция
// GUEST SAVE). quantity для quantity_mode='automatic' считает ТОЛЬКО backend
// (POST /api/v1/work-calculations, см. api/workCalculations.ts) — здесь нет
// никакой geometry-математики, тем же принципом, что и в useWorkBuilder.ts.
import { calculateWorkQuantity } from '~/api/workCalculations'
import { createProjectWork } from '~/api/projectWorks'
import { isApiError, toApiError } from '~/api/client'
import { useProjectPersistence } from '~/composables/useProjectPersistence'
import {
  clearGuestWorksStorage,
  loadGuestWorksFromStorage,
  saveGuestWorksToStorage,
} from '~/utils/guestWorkDraft'
import type { ApiError, QuantityMode, WorkType, WorkUnit } from '~/api/types'
import type { BuildingDocument } from '~/types/building'

export interface GuestWorkItem {
  id: string
  workTypeId: string
  roomId: string | null
  quantity: number
  unit: WorkUnit
  quantityMode: QuantityMode
}

// Результат guest → authenticated promotion (см. saveSessionAfterAuth):
// projectId===null — сам Project не создался (ничего не потеряно, guest
// state не трогается, вызывающая страница остаётся на /projects/draft/works
// и показывает ошибку). projectId задан — Project+Building сохранены,
// failedCount — сколько guest-работ НЕ удалось прикрепить как ProjectWork
// (после retry), о чём вызывающая страница обязана явно сообщить
// пользователю (см. задание, секция AUTH TRANSITION — "НЕ терять молча").
export interface SaveSessionResult {
  projectId: string | null
  failedCount: number
}

function nextGuestWorkId(existing: GuestWorkItem[]): string {
  const pattern = /^guest-work-(\d+)$/
  let max = 0
  for (const item of existing) {
    const match = pattern.exec(item.id)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `guest-work-${String(max + 1).padStart(3, '0')}`
}

export function useGuestWorkBuilder() {
  const items = useState<GuestWorkItem[]>('guest-work-builder-items', () => [])
  const isCreating = useState<boolean>('guest-work-builder-creating', () => false)
  const createError = useState<ApiError | null>('guest-work-builder-create-error', () => null)
  const isRecalculating = useState<boolean>('guest-work-builder-recalculating', () => false)
  const recalculateError = useState<ApiError | null>('guest-work-builder-recalculate-error', () => null)
  const deletingId = useState<string | null>('guest-work-builder-deleting-id', () => null)

  function setApiError(target: typeof createError, err: unknown) {
    target.value = isApiError(err) ? err : toApiError(err)
  }

  function persist(): void {
    saveGuestWorksToStorage(items.value)
  }

  // Восстановление после hard refresh (см. задание, секция SCENARIO 7) —
  // вызывается один раз при заходе на /projects/draft/works. Не трогает
  // список, если он уже непустой (обычная client-side навигация Plan ↔ Works
  // уже сохраняет его в памяти через useState — localStorage нужен только
  // для hard refresh, тем же принципом, что builderDraft.ts).
  function hydrateFromStorage(): void {
    if (items.value.length > 0) return
    const stored = loadGuestWorksFromStorage()
    if (stored && stored.length > 0) items.value = stored
  }

  // Quantity для 'automatic' получает ТОЛЬКО backend (POST
  // /work-calculations) — для 'manual' сетевой вызов не делается вовсе (он
  // гарантированно вернул бы 400 manual_quantity_required, см. задание), ввод
  // пользователя используется как есть, тем же принципом, что
  // useWorkBuilder.addWork() для authenticated-работ.
  async function addWork(
    building: BuildingDocument,
    workType: WorkType,
    roomId: string | null,
    quantity?: number,
  ): Promise<{ quantity: number, unit: WorkUnit } | null> {
    if (isCreating.value) return null
    isCreating.value = true
    createError.value = null
    try {
      let result: { quantity: number, unit: WorkUnit, quantityMode: QuantityMode }
      if (workType.quantityMode === 'manual') {
        result = { quantity: quantity ?? 0, unit: workType.unit, quantityMode: 'manual' }
      } else {
        result = await calculateWorkQuantity({ building, workTypeId: workType.id, roomId })
      }
      const item: GuestWorkItem = {
        id: nextGuestWorkId(items.value),
        workTypeId: workType.id,
        roomId,
        quantity: result.quantity,
        unit: result.unit,
        quantityMode: result.quantityMode,
      }
      items.value = [...items.value, item]
      persist()
      return { quantity: item.quantity, unit: item.unit }
    } catch (err) {
      setApiError(createError, err)
      return null
    } finally {
      isCreating.value = false
    }
  }

  function removeWork(id: string): void {
    if (deletingId.value) return
    deletingId.value = id
    items.value = items.value.filter(i => i.id !== id)
    persist()
    deletingId.value = null
  }

  // Пересчёт ВСЕХ guest-работ по актуальному Building (см. задание, секция
  // 14/9 — "Перед calculation всегда брать АКТУАЛЬНЫЙ Building", никогда не
  // устаревший snapshot). Manual-работы не трогаются — backend их тоже не
  // пересчитывает (см. useWorkBuilder.recalculate doc comment). Одна ошибка
  // не должна отбрасывать уже успешно пересчитанные работы — применяем
  // результаты по мере готовности, ошибку собираем одну (как и
  // authenticated recalculateError в useWorkBuilder.ts).
  async function recalculateAll(building: BuildingDocument): Promise<boolean> {
    if (isRecalculating.value) return false
    isRecalculating.value = true
    recalculateError.value = null
    let hadError = false
    try {
      const updated = [...items.value]
      for (let i = 0; i < updated.length; i++) {
        const item = updated[i]!
        if (item.quantityMode === 'manual') continue
        try {
          const result = await calculateWorkQuantity({ building, workTypeId: item.workTypeId, roomId: item.roomId })
          updated[i] = { ...item, quantity: result.quantity, unit: result.unit }
        } catch (err) {
          hadError = true
          setApiError(recalculateError, err)
        }
      }
      items.value = updated
      persist()
      return !hadError
    } finally {
      isRecalculating.value = false
    }
  }

  function clearGuestWorks(): void {
    items.value = []
  }

  async function tryCreateProjectWork(projectId: string, item: GuestWorkItem): Promise<boolean> {
    const payload = {
      work_type_id: item.workTypeId,
      room_id: item.roomId,
      quantity: item.quantityMode === 'manual' ? item.quantity : undefined,
    }
    try {
      await createProjectWork(projectId, payload)
      return true
    } catch {
      // Один retry — покрывает самый частый реальный случай (единичный
      // transient network blip прямо после только что созданного Project),
      // не полноценная backoff-стратегия.
      try {
        await createProjectWork(projectId, payload)
        return true
      } catch {
        return false
      }
    }
  }

  // Guest → Authenticated (см. задание, секция GUEST SAVE / AUTH TRANSITION).
  // Backend не предоставляет транзакционный "создать Project + N ProjectWork
  // одним запросом" эндпоинт (и эта задача явно не создаёт новый) — поэтому
  // настоящего atomic rollback здесь нет и быть не может без backend-изменений.
  // Выбранная стратегия (явно, не "best effort молча"):
  //  1) Project+Building создаются первыми (createProjectFromDraft) — это и
  //     так единственный "дорогой" шаг; если он не удался, НИЧЕГО не создано
  //     и guest state остаётся нетронутым (как и раньше) — пользователь
  //     ничего не теряет, просто повторяет "Сохранить".
  //  2) Каждый guest work пытаемся прикрепить как ProjectWork с одним retry
  //     (см. tryCreateProjectWork) — покрывает транзиентные сетевые сбои
  //     без усложнения до полноценного backoff.
  //  3) Guest state (память+localStorage) очищается ВСЕГДА после попытки, а
  //     не только при полном успехе — к этому моменту пользователь уже на
  //     /projects/{id}/works (Project реально сохранён), и "оставить
  //     неудавшиеся работы висеть" в localStorage было бы хуже: они бы
  //     протекли как мусор в СЛЕДУЮЩИЙ, не связанный guest-сеанс (другое
  //     здание), и всё равно не имели бы механизма повторной отправки оттуда.
  //     Вместо этого — явный, видимый пользователю результат прямо сейчас
  //     (failedCount), а повторное добавление делается тремя кликами через
  //     обычный "Добавить работу" authenticated-flow, с тем же каталогом.
  //  4) failedCount возвращается вызывающей странице, которая ОБЯЗАНА
  //     показать его пользователю не как тихий console.warn, а как видимый
  //     баннер (см. pages/projects/[id]/works.vue — ?saveIssues=N).
  async function saveSessionAfterAuth(document: BuildingDocument): Promise<SaveSessionResult> {
    const { createProjectFromDraft } = useProjectPersistence()
    const projectId = await createProjectFromDraft(document)
    if (!projectId) return { projectId: null, failedCount: 0 }

    let failedCount = 0
    for (const item of items.value) {
      const ok = await tryCreateProjectWork(projectId, item)
      if (!ok) failedCount++
    }

    clearGuestWorks()
    clearGuestWorksStorage()
    return { projectId, failedCount }
  }

  function cleanup(): void {
    isCreating.value = false
    createError.value = null
    isRecalculating.value = false
    recalculateError.value = null
    deletingId.value = null
  }

  return {
    items,
    isCreating,
    createError,
    isRecalculating,
    recalculateError,
    deletingId,
    hydrateFromStorage,
    addWork,
    removeWork,
    recalculateAll,
    clearGuestWorks,
    saveSessionAfterAuth,
    cleanup,
  }
}
