// Work Builder — состояние пошагового flow "Добавить работу" + список
// ProjectWork текущего проекта. Аналогично useProjectPersistence: только
// состояние и API-вызовы, никакой геометрии/quantity-математики (это делает
// backend, см. app/api/workCatalog.ts и app/api/projectWorks.ts). Building
// JSON НЕ дублируется здесь — room-данные для отображения (имя/площадь)
// компоненты берут напрямую из useBuilding(), этот composable хранит только
// room.id как ссылку.
import {
  createProjectWork,
  deleteProjectWork,
  listProjectWorks,
  recalculateProjectWorks,
  updateProjectWorkStatus,
} from '~/api/projectWorks'
import { getWorkCategories, getWorkTypes } from '~/api/workCatalog'
import { isApiError, toApiError } from '~/api/client'
import type { ApiError, ProjectWork, WorkCategory, WorkStatus, WorkType } from '~/api/types'

export type WorkBuilderStep = 'list' | 'room' | 'category' | 'type' | 'calculation'

const STEP_ORDER: WorkBuilderStep[] = ['list', 'room', 'category', 'type', 'calculation']

export function useWorkBuilder() {
  const currentStep = useState<WorkBuilderStep>('work-builder-step', () => 'list')

  const categories = useState<WorkCategory[]>('work-builder-categories', () => [])
  const categoriesLoading = useState<boolean>('work-builder-categories-loading', () => false)
  const categoriesError = useState<ApiError | null>('work-builder-categories-error', () => null)

  const workTypes = useState<WorkType[]>('work-builder-work-types', () => [])
  const workTypesLoading = useState<boolean>('work-builder-work-types-loading', () => false)
  const workTypesError = useState<ApiError | null>('work-builder-work-types-error', () => null)

  // Полный каталог видов работ (все категории сразу), проиндексированный по
  // id — нужен только для отображения существующих ProjectWork в списке
  // (Screen 6): у ProjectWork нет собственного name/slug/category, только
  // work_type_id, а показанные в списке работы могут относиться к разным
  // категориям сразу, не только к той, что сейчас открыта в add-flow (см.
  // workTypes выше — тот стейт скоупится текущей категорией шага "Вид работы").
  const workTypeCatalog = useState<Record<string, WorkType>>('work-builder-work-type-catalog', () => ({}))
  const categoriesById = useState<Record<string, WorkCategory>>('work-builder-categories-by-id', () => ({}))

  const projectWorks = useState<ProjectWork[]>('work-builder-project-works', () => [])
  const projectWorksLoading = useState<boolean>('work-builder-project-works-loading', () => false)
  const projectWorksError = useState<ApiError | null>('work-builder-project-works-error', () => null)

  const isCreating = useState<boolean>('work-builder-creating', () => false)
  const createError = useState<ApiError | null>('work-builder-create-error', () => null)
  const isRecalculating = useState<boolean>('work-builder-recalculating', () => false)
  const recalculateError = useState<ApiError | null>('work-builder-recalculate-error', () => null)
  const statusUpdatingId = useState<string | null>('work-builder-status-updating-id', () => null)
  const deletingId = useState<string | null>('work-builder-deleting-id', () => null)

  // Только id + флаг "весь проект" — имя/площадь комнаты компоненты читают
  // из useBuilding() напрямую по этому id, когда нужно их показать.
  const selectedRoomId = useState<string | null>('work-builder-selected-room-id', () => null)
  const selectedIsProjectLevel = useState<boolean>('work-builder-selected-project-level', () => false)
  const selectedCategoryId = useState<string | null>('work-builder-selected-category-id', () => null)
  const selectedWorkTypeId = useState<string | null>('work-builder-selected-work-type-id', () => null)
  const searchQuery = useState<string>('work-builder-search-query', () => '')

  const selectedWorkType = computed<WorkType | null>(
    () => workTypes.value.find(w => w.id === selectedWorkTypeId.value) ?? null,
  )

  function setApiError(target: typeof categoriesError, err: unknown) {
    target.value = isApiError(err) ? err : toApiError(err)
  }

  async function loadCatalog(options: { signal?: AbortSignal } = {}): Promise<void> {
    categoriesLoading.value = true
    categoriesError.value = null
    try {
      categories.value = await getWorkCategories(options)
      categoriesById.value = Object.fromEntries(categories.value.map(c => [c.id, c]))
    } catch (err) {
      setApiError(categoriesError, err)
    } finally {
      categoriesLoading.value = false
    }
  }

  // Полный каталог (без category_id) — только для резолва name/icon уже
  // созданных ProjectWork в списке, см. workTypeCatalog выше. Молчаливо не
  // трогает workTypes/workTypesError (те принадлежат экрану "Вид работы").
  async function loadWorkTypeCatalog(): Promise<void> {
    try {
      const items = await getWorkTypes()
      workTypeCatalog.value = Object.fromEntries(items.map(w => [w.id, w]))
    } catch {
      // Список работ всё равно показывается (id/quantity/status есть) —
      // просто без человеческого названия/иконки для непрогрузившихся карточек.
    }
  }

  async function loadWorkTypesForCategory(categoryId: string): Promise<void> {
    workTypesLoading.value = true
    workTypesError.value = null
    try {
      workTypes.value = await getWorkTypes(categoryId)
    } catch (err) {
      setApiError(workTypesError, err)
    } finally {
      workTypesLoading.value = false
    }
  }

  async function loadProjectWorks(projectId: string, options: { signal?: AbortSignal } = {}): Promise<void> {
    projectWorksLoading.value = true
    projectWorksError.value = null
    try {
      projectWorks.value = await listProjectWorks(projectId, options)
    } catch (err) {
      setApiError(projectWorksError, err)
    } finally {
      projectWorksLoading.value = false
    }
  }

  // "+ Добавить работу" — начало flow. Каталог грузится сразу же (нужен на
  // шаге "Категория работ"), не дожидаясь, пока пользователь выберет комнату.
  function startAddWork(): void {
    selectedRoomId.value = null
    selectedIsProjectLevel.value = false
    selectedCategoryId.value = null
    selectedWorkTypeId.value = null
    searchQuery.value = ''
    workTypes.value = []
    createError.value = null
    currentStep.value = 'room'
    if (categories.value.length === 0 && !categoriesLoading.value) void loadCatalog()
  }

  // roomId === null означает "Весь проект" — единственный способ выбрать
  // project-level работу (см. задание: room_id либо room.id, либо null).
  function selectRoom(roomId: string | null): void {
    selectedRoomId.value = roomId
    selectedIsProjectLevel.value = roomId === null
    currentStep.value = 'category'
  }

  function selectCategory(categoryId: string): void {
    selectedCategoryId.value = categoryId
    selectedWorkTypeId.value = null
    searchQuery.value = ''
    currentStep.value = 'type'
    void loadWorkTypesForCategory(categoryId)
  }

  function selectWorkType(workTypeId: string): void {
    selectedWorkTypeId.value = workTypeId
    createError.value = null
    currentStep.value = 'calculation'
  }

  // Один шаг назад по фиксированной последовательности экранов (см. задание,
  // секция BACK BUTTON / CLOSE): Room←Works, Category←Room, Type←Category,
  // Calculation←Type. Очищает только состояние экрана, который покидаем.
  function goBack(): void {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx <= 0) return
    if (currentStep.value === 'room') {
      selectedRoomId.value = null
      selectedIsProjectLevel.value = false
    } else if (currentStep.value === 'category') {
      selectedCategoryId.value = null
    } else if (currentStep.value === 'type') {
      selectedWorkTypeId.value = null
      searchQuery.value = ''
    } else if (currentStep.value === 'calculation') {
      selectedWorkTypeId.value = null
    }
    currentStep.value = STEP_ORDER[idx - 1]!
  }

  // "×" — полностью закрыть flow и вернуться к списку работ, независимо от
  // того, на каком шаге были. Уже созданные ProjectWork не трогает.
  function resetFlow(): void {
    currentStep.value = 'list'
    selectedRoomId.value = null
    selectedIsProjectLevel.value = false
    selectedCategoryId.value = null
    selectedWorkTypeId.value = null
    searchQuery.value = ''
    workTypes.value = []
    createError.value = null
  }

  // quantity передаётся только для quantity_mode='manual' — для 'automatic'
  // backend полностью игнорирует любое присланное значение и считает сам
  // (см. app/api/projectWorks.ts). Здесь это тоже не проверяется повторно —
  // вызывающий компонент (WorkCalculationStep.vue) сам решает, показывать ли
  // поле ввода, опираясь на selectedWorkType.value.quantityMode.
  // Возвращает созданный ProjectWork (с реальным quantity от backend) или
  // null при ошибке. Flow НЕ сбрасывается автоматически — экран расчёта сам
  // показывает результат (см. WorkCalculationStep.vue) и явно вызывает
  // resetFlow(), когда пользователь готов вернуться к списку; так число на
  // экране — всегда то самое значение из ответа backend, без промежуточного
  // мигания/подмены.
  async function addWork(projectId: string, quantity?: number): Promise<ProjectWork | null> {
    if (isCreating.value || !selectedWorkTypeId.value) return null
    isCreating.value = true
    createError.value = null
    try {
      const created = await createProjectWork(projectId, {
        work_type_id: selectedWorkTypeId.value,
        room_id: selectedIsProjectLevel.value ? null : selectedRoomId.value,
        quantity,
      })
      projectWorks.value = [...projectWorks.value, created]
      return created
    } catch (err) {
      setApiError(createError, err)
      return null
    } finally {
      isCreating.value = false
    }
  }

  async function deleteWork(projectId: string, workId: string): Promise<boolean> {
    if (deletingId.value) return false
    deletingId.value = workId
    try {
      await deleteProjectWork(projectId, workId)
      projectWorks.value = projectWorks.value.filter(w => w.id !== workId)
      return true
    } catch (err) {
      setApiError(projectWorksError, err)
      return false
    } finally {
      deletingId.value = null
    }
  }

  async function updateStatus(projectId: string, workId: string, status: WorkStatus): Promise<boolean> {
    if (statusUpdatingId.value) return false
    statusUpdatingId.value = workId
    try {
      const updated = await updateProjectWorkStatus(projectId, workId, status)
      projectWorks.value = projectWorks.value.map(w => (w.id === workId ? updated : w))
      return true
    } catch (err) {
      setApiError(projectWorksError, err)
      return false
    } finally {
      statusUpdatingId.value = null
    }
  }

  // Backend возвращает только {updated: N}, не сам список — обновлённые
  // (automatic) quantity нужно забрать последующим GET (см. api/projectWorks.ts).
  // Manual quantity backend не трогает при recalculate — они и так не изменятся.
  async function recalculate(projectId: string): Promise<boolean> {
    if (isRecalculating.value) return false
    isRecalculating.value = true
    recalculateError.value = null
    try {
      await recalculateProjectWorks(projectId)
      await loadProjectWorks(projectId)
      return true
    } catch (err) {
      setApiError(recalculateError, err)
      return false
    } finally {
      isRecalculating.value = false
    }
  }

  // Полный сброс при уходе со страницы /projects/{id}/works — симметрично
  // useProjectPersistence().cleanup(), чтобы следующий заход (тот же или
  // другой проект) не унаследовал чужой список/выбор.
  function cleanup(): void {
    resetFlow()
    projectWorks.value = []
    projectWorksError.value = null
    createError.value = null
    recalculateError.value = null
  }

  return {
    currentStep,
    categories,
    categoriesLoading,
    categoriesError,
    categoriesById,
    workTypes,
    workTypesLoading,
    workTypesError,
    workTypeCatalog,
    loadWorkTypeCatalog,
    projectWorks,
    projectWorksLoading,
    projectWorksError,
    isCreating,
    createError,
    isRecalculating,
    recalculateError,
    statusUpdatingId,
    deletingId,
    selectedRoomId,
    selectedIsProjectLevel,
    selectedCategoryId,
    selectedWorkTypeId,
    selectedWorkType,
    searchQuery,
    loadCatalog,
    loadProjectWorks,
    startAddWork,
    selectRoom,
    selectCategory,
    selectWorkType,
    goBack,
    resetFlow,
    addWork,
    deleteWork,
    updateStatus,
    recalculate,
    cleanup,
  }
}
