// Единый frontend source of truth для authentication state. Не Pinia —
// как и useBuilding/useProjectPersistence, обычный composable поверх
// useState. accessToken здесь — это ТОТ ЖЕ ref, что и app/api/client.ts
// использует для Authorization-заголовка (не вторая копия): useAuth просто
// переиспользует его как одно из своих полей и решает, когда его менять.
import { accessToken as sharedAccessToken, isApiError, setAuthFailureListener, toApiError } from '~/api/client'
import { loginVerify, logout as apiLogout, me as apiMe, refresh as apiRefresh, registerVerify, sendSMS as apiSendSMS } from '~/api/auth'
import type { ApiError, AuthPurpose, AuthUser } from '~/api/types'

// Регистрируем listener один раз на весь модуль (не при каждом вызове
// useAuth()) — иначе каждый компонент, вызвавший useAuth(), поставил бы
// свой собственный обработчик поверх предыдущего.
let authFailureListenerRegistered = false

// initialize() должен быть idempotent/single-flight: и middleware, и
// app.vue могут вызвать его независимо на старте — оба должны получить
// один и тот же результат одного и того же вызова, а не запустить
// refresh+me дважды параллельно.
let initializePromise: Promise<void> | null = null

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const isLoading = useState<boolean>('auth-loading', () => false)
  const isInitialized = useState<boolean>('auth-initialized', () => false)
  const error = useState<ApiError | null>('auth-error', () => null)
  // Логаут — тоже способ "уйти" с editor'а, и dirty-navigation-guard там
  // (onBeforeRouteLeave в pages/projects/[id].vue) иначе показал бы СВОЙ
  // confirm поверх confirm'а из EditorHeader — этот флаг даёт guard'у
  // понять "подтверждение уже было получено, второй раз спрашивать не надо".
  const isLoggingOut = useState<boolean>('auth-logging-out', () => false)

  const isAuthenticated = computed(() => user.value !== null)

  if (!authFailureListenerRegistered) {
    authFailureListenerRegistered = true
    // Вызывается client.ts, когда 401-retry исчерпал попытки (refresh тоже
    // вернул ошибку) — окончательный сигнал "сессии больше нет".
    setAuthFailureListener(() => {
      user.value = null
    })
  }

  function setError(err: unknown) {
    error.value = isApiError(err) ? err : toApiError(err)
  }

  function clearError() {
    error.value = null
  }

  // Session initialization при старте приложения (см. app.vue): пробуем
  // восстановить сессию через refresh cookie -> access token -> /me.
  // Отсутствие валидной сессии — нормальное состояние (новый пользователь
  // или истёкший refresh), а не ошибка приложения, поэтому здесь нет
  // error.value = ... в catch-ветке.
  function initialize(): Promise<void> {
    if (isInitialized.value) return Promise.resolve()
    if (initializePromise) return initializePromise

    initializePromise = (async () => {
      isLoading.value = true
      try {
        const session = await apiRefresh()
        sharedAccessToken.value = session.accessToken
        user.value = await apiMe()
        isLoggingOut.value = false
      } catch {
        sharedAccessToken.value = null
        user.value = null
      } finally {
        isLoading.value = false
        isInitialized.value = true
        initializePromise = null
      }
    })()
    return initializePromise
  }

  async function sendSMS(phone: string, purpose: AuthPurpose): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await apiSendSMS(phone, purpose)
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function register(phone: string, code: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const session = await registerVerify(phone, code)
      sharedAccessToken.value = session.accessToken
      user.value = await apiMe()
      isInitialized.value = true
      isLoggingOut.value = false
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function login(phone: string, code: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const session = await loginVerify(phone, code)
      sharedAccessToken.value = session.accessToken
      user.value = await apiMe()
      isInitialized.value = true
      isLoggingOut.value = false
      return true
    } catch (err) {
      setError(err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Logout идемпотентен на backend (см. auth service.go) — даже если
  // запрос не удался (например, backend недоступен), локально сессию всё
  // равно считаем завершённой: пользователь явно попросил выйти.
  async function logout(): Promise<void> {
    isLoggingOut.value = true
    isLoading.value = true
    try {
      await apiLogout()
    } catch {
      // намеренно проглатываем — см. комментарий выше
    } finally {
      sharedAccessToken.value = null
      user.value = null
      error.value = null
      isLoading.value = false
    }
  }

  return {
    user,
    accessToken: sharedAccessToken,
    isAuthenticated,
    isLoading,
    isInitialized,
    isLoggingOut,
    error,
    clearError,
    initialize,
    sendSMS,
    register,
    login,
    logout,
  }
}
