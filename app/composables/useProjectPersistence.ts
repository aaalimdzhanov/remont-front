// Persistence-related состояние поверх useBuilding: project lifecycle
// (create/load/save/delete), autosave, save status, dirty synchronization,
// retry. Building JSON остаётся единственным источником истины внутри
// useBuilding — этот composable не хранит вторую копию документа и не
// клонирует его на каждую mutation, только берёт один snapshot в момент
// реальной попытки save.
//
// Навигацию (navigateTo) этот composable больше НЕ выполняет сам — с
// переходом на route-based структуру (/projects, /projects/new,
// /projects/{id}) решение "куда переходить и когда" принимают исключительно
// страницы (pages/projects/*.vue): composable только возвращает результат
// операции (например, canonical id созданного проекта).
import { createEmptyBuildingDocument, useBuilding } from '~/composables/useBuilding'
import { isApiError, toApiError } from '~/api/client'
import {
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
  getProject,
  getProjects,
  updateProject,
} from '~/api/projects'
import type { ApiError, ProjectSummary } from '~/api/types'
import type { BuildingDocument, BuildingType } from '~/types/building'

// Простой способ выключить autosave целиком на время отладки/тестов —
// без UI-переключателя, просто константа (см. секцию 23 задания).
export const AUTOSAVE_ENABLED = true
// 1000-1500мс — пользователь успел закончить серию правок (drag/resize),
// но задержка не ощущается как "зависание".
export const AUTOSAVE_DEBOUNCE_MS = 1200

export type SaveReason = 'manual' | 'autosave'
export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'

// Не реактивное состояние гонок запросов/debounce — намеренно вне useState:
// это чисто техническая защита (таймеры, AbortController, revision-снимки),
// а не часть UI/Building state, сериализовать её в SSR payload незачем.
let loadRequestId = 0
let listRequestId = 0
let loadController: AbortController | null = null
let listController: AbortController | null = null

let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let saveInFlight = false
let saveQueued = false
// Увеличивается всякий раз, когда "текущий проект" меняется НЕ в результате
// обычного save (Open/Delete текущего/выход из editor) — любой pending
// autosave/save, запущенный до этого момента, при завершении должен
// полностью проигнорировать свой результат: ответ относится уже к
// чужому/устаревшему проекту.
let sessionToken = 0

let beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null

// Рантайм-проверка вместо Nuxt-специфичной компиляторной константы
// import.meta.client: тот же эффект (true только там, где реально есть
// window — браузер), но не требует Nuxt/Vite build-плагина, поэтому
// проверяемо в обычном Vitest-юнит-тесте простой подменой globalThis.window,
// без подключения jsdom.
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function useProjectPersistence() {
  const { document: buildingDocument, documentRevision, loadDocument, syncCanonicalProjectId } = useBuilding()

  const projectId = useState<string | null>('project-persistence-id', () => null)
  const projects = useState<ProjectSummary[]>('project-persistence-list', () => [])
  const isLoadingProjects = useState<boolean>('project-persistence-loading-list', () => false)
  const isLoadingProject = useState<boolean>('project-persistence-loading-project', () => false)
  const isCreating = useState<boolean>('project-persistence-creating', () => false)
  const isSaving = useState<boolean>('project-persistence-saving', () => false)
  const isDeleting = useState<boolean>('project-persistence-deleting', () => false)
  const lastSavedAt = useState<string | null>('project-persistence-last-saved', () => null)
  const error = useState<ApiError | null>('project-persistence-error', () => null)
  // Revision документа, которая точно подтверждена backend'ом (последний
  // успешный load/create/save). isDirty/saveStatus — производные от сравнения
  // documentRevision с этим значением, а не отдельный вручную переключаемый
  // флаг: так "save success, но за время запроса появились новые правки"
  // обрабатывается само собой (revision в этот момент уже успела уйти вперёд).
  const savedRevision = useState<number>('project-persistence-saved-revision', () => 0)

  const isDirty = computed(() => documentRevision.value !== savedRevision.value)

  const saveStatus = computed<SaveStatus>(() => {
    if (isSaving.value) return 'saving'
    if (error.value) return 'error'
    if (isDirty.value) return 'unsaved'
    return 'saved'
  })

  function setError(err: unknown) {
    error.value = isApiError(err) ? err : toApiError(err)
  }

  function clearError() {
    error.value = null
  }

  function clearAutosaveTimer() {
    if (autosaveTimer !== null) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
  }

  // Меняем/покидаем "текущий проект" (Open/Delete текущего/выход из editor):
  // любой pending autosave-таймер и любой уже летящий save немедленно
  // перестают быть релевантны — таймер отменяем прямо сейчас, а в случае
  // летящего save просто помечаем его результат неактуальным через
  // sessionToken (сам HTTP-запрос не прерываем — PUT, который уже ушёл на
  // сервер, пусть завершится, мы лишь не применяем его результат).
  function invalidateCurrentSession() {
    sessionToken++
    clearAutosaveTimer()
    saveQueued = false
    saveInFlight = false
    isSaving.value = false
  }

  function scheduleAutosave() {
    if (!AUTOSAVE_ENABLED) return
    if (!projectId.value) return // autosave никогда не создаёт проект — только сохраняет существующий
    clearAutosaveTimer()
    const tokenAtSchedule = sessionToken
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null
      if (tokenAtSchedule !== sessionToken) return
      void requestSave('autosave')
    }, AUTOSAVE_DEBOUNCE_MS)
  }

  // Единый save pipeline — и ручная кнопка "Сохранить", и autosave вызывают
  // именно эту функцию, различаясь только reason. requestSave() ВСЕГДА
  // работает над уже существующим на backend проектом (PUT) — создание
  // происходит отдельно, через createProject() ниже, на странице
  // /projects/new, до того как редактор вообще открывается. requestSave():
  //   1) отменяет pending debounce (ручной save не должен создавать вторую
  //      параллельную попытку поверх запланированной);
  //   2) если save уже летит — не запускает второй, а помечает "нужно ещё
  //      раз после" (saveQueued) и после завершения текущего перепроверяет,
  //      действительно ли документ успел измениться;
  //   3) снимает revision + глубокую копию Building JSON ровно в момент
  //      реальной попытки (не на каждую mutation);
  //   4) по завершении применяет результат, только если сессия не сменилась
  //      (sessionToken) — иначе ответ относится уже к другому/удалённому проекту.
  async function requestSave(reason: SaveReason): Promise<boolean> {
    clearAutosaveTimer()

    if (!projectId.value) return false // редактор всегда открыт над уже существующим проектом

    if (saveInFlight) {
      saveQueued = true
      return false
    }

    // Нечего сохранять — documentRevision уже совпадает с тем, что backend
    // подтвердил. Не шлём холостой PUT ни вручную, ни автосохранением.
    if (!isDirty.value) return true

    const tokenAtStart = sessionToken
    const revisionAtStart = documentRevision.value
    const targetId = projectId.value
    // Глубокая копия — единственная на весь save pipeline, и снимается один
    // раз здесь (не на каждую mutation): дешёво относительно частоты save,
    // и гарантирует, что дальнейшие правки пользователя во время HTTP-запроса
    // не "утекут" в уже отправленный snapshot. JSON.parse(JSON.stringify())
    // вместо structuredClone(): document.value — reactive-прокси Vue, а не
    // structured-cloneable объект (structuredClone бросает DataCloneError на
    // Proxy в Node); Building JSON — по определению чистый JSON-документ, так
    // что этот способ и корректен, и заодно "снимает" реактивность.
    const snapshot = JSON.parse(JSON.stringify(buildingDocument.value)) as BuildingDocument

    saveInFlight = true
    isSaving.value = true
    error.value = null
    try {
      const input = { name: snapshot.project.name, status: snapshot.project.status, building: snapshot }
      const result = await updateProject(targetId, input)
      if (tokenAtStart !== sessionToken) return false // проект сменился, пока летел запрос — результат неактуален

      lastSavedAt.value = result.updatedAt
      savedRevision.value = revisionAtStart
      return true
    } catch (err) {
      if (tokenAtStart !== sessionToken) return false
      setError(err)
      return false
    } finally {
      if (tokenAtStart === sessionToken) {
        saveInFlight = false
        isSaving.value = false
        if (saveQueued) {
          saveQueued = false
          if (isDirty.value && projectId.value) {
            void requestSave('autosave')
          }
        }
      }
    }
  }

  // Мутации Building JSON (через useBuilding) планируют autosave. watch()
  // регистрируется в теле composable — вызывается из EditorHeader.vue/
  // pages/projects/[id].vue (владельцы persistence UI на странице editor'а),
  // поэтому автоматически живёт и умирает вместе с этим route; explicit
  // cleanup() ниже — подстраховка на случай явного unmount/теста без Vue
  // component instance. flush: 'sync' — планирование debounce-таймера
  // должно происходить сразу в момент мутации, а не после следующего
  // Vue-тика: иначе немедленный ручной save()/cleanup() сразу после mutation
  // мог бы не увидеть ещё не запланированный таймер.
  watch(documentRevision, () => {
    scheduleAutosave()
  }, { flush: 'sync' })

  if (isBrowser() && !beforeUnloadHandler) {
    beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      if (documentRevision.value === savedRevision.value) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnloadHandler)
  }

  // Полная остановка/сброс текущей editor-сессии: вызывается при уходе со
  // страницы /projects/{id} (см. onBeforeUnmount там) — отменяет всё, что
  // относится к прежнему проекту (таймер, летящие load/list запросы,
  // beforeunload-подписку), и возвращает Building JSON к нейтральному
  // пустому состоянию, чтобы следующий визит в editor (тот же или другой
  // проект) стартовал заведомо чисто через loadProject(), а не с "хвостом"
  // чужой revision/projectId.
  function cleanup() {
    invalidateCurrentSession()
    loadController?.abort()
    listController?.abort()
    if (isBrowser() && beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      beforeUnloadHandler = null
    }
    loadDocument(createEmptyBuildingDocument())
    projectId.value = null
    lastSavedAt.value = null
    error.value = null
    savedRevision.value = documentRevision.value
  }

  // Ручной Save-триггер (кнопка "Сохранить"/"Повторить"). Тот же pipeline,
  // что и autosave — разница только в reason.
  function save(): Promise<boolean> {
    return requestSave('manual')
  }

  async function refreshProjects(): Promise<void> {
    listController?.abort()
    const controller = new AbortController()
    listController = controller
    const requestId = ++listRequestId

    isLoadingProjects.value = true
    error.value = null
    try {
      const items = await getProjects({ signal: controller.signal })
      if (requestId !== listRequestId) return
      projects.value = items
    } catch (err) {
      if (requestId !== listRequestId) return
      setError(err)
    } finally {
      if (requestId === listRequestId) isLoadingProjects.value = false
    }
  }

  // Открыть проект {id} (используется страницей /projects/{id} при заходе/
  // refresh). Race-safe по двум осям: loadRequestId/AbortController защищают
  // от устаревшего GET-ответа, а invalidateCurrentSession() гарантирует, что
  // pending autosave/save прежнего проекта не выполнит PUT после переключения.
  async function loadProject(id: string): Promise<boolean> {
    invalidateCurrentSession()
    loadController?.abort()
    const controller = new AbortController()
    loadController = controller
    const requestId = ++loadRequestId

    isLoadingProject.value = true
    error.value = null
    try {
      const project = await getProject(id, { signal: controller.signal })
      if (requestId !== loadRequestId) return false
      loadDocument(project.building)
      projectId.value = project.id
      lastSavedAt.value = project.updatedAt
      savedRevision.value = documentRevision.value
      return true
    } catch (err) {
      if (requestId !== loadRequestId) return false
      setError(err)
      return false
    } finally {
      if (requestId === loadRequestId) isLoadingProject.value = false
    }
  }

  // Создаёт проект на backend (страница /projects/new). Canonical id
  // выдаёт backend — фронтенд не генерирует UUID сам. После успеха документ
  // и projectId сразу становятся "текущими" в useBuilding/этом composable,
  // так что если вызывающая страница тут же перейдёт на /projects/{id},
  // editor откроется уже с корректным, чистым (isDirty=false) состоянием —
  // а autosave с первой же мутации будет использовать PUT, а не POST.
  async function createProject(params: { name: string, type: BuildingType }): Promise<string | null> {
    if (isCreating.value) return null // защита от двойного submit/двойного клика

    isCreating.value = true
    error.value = null
    try {
      const blank = createEmptyBuildingDocument()
      blank.project.name = params.name
      blank.building.type = params.type
      const created = await apiCreateProject({ name: params.name, status: blank.project.status, building: blank })

      invalidateCurrentSession() // на случай, если предыдущая editor-сессия ещё не была явно закрыта
      loadDocument(created.building)
      projectId.value = created.id
      lastSavedAt.value = created.updatedAt
      savedRevision.value = documentRevision.value
      return created.id
    } catch (err) {
      setError(err)
      return null
    } finally {
      isCreating.value = false
    }
  }

  // Удаляет проект {id}. Если это текущий открытый проект — отменяем pending
  // autosave/save ДО запроса DELETE (invalidateCurrentSession), чтобы после
  // успешного удаления никакой устаревший save не смог выполнить PUT на уже
  // несуществующий id. Навигацию после удаления (на /projects) выполняет
  // вызывающая страница/компонент — этот composable только сообщает успех.
  async function removeProject(id: string): Promise<boolean> {
    const isCurrent = projectId.value === id
    if (isCurrent) invalidateCurrentSession()

    isDeleting.value = true
    error.value = null
    try {
      await apiDeleteProject(id)
      projects.value = projects.value.filter(p => p.id !== id)
      if (isCurrent) {
        loadDocument(createEmptyBuildingDocument())
        projectId.value = null
        lastSavedAt.value = null
        savedRevision.value = documentRevision.value
      }
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  return {
    projectId,
    projects,
    isLoadingProjects,
    isLoadingProject,
    isCreating,
    isSaving,
    isDeleting,
    isDirty,
    saveStatus,
    lastSavedAt,
    error,
    clearError,
    refreshProjects,
    loadProject,
    createProject,
    save,
    removeProject,
    cleanup,
  }
}
