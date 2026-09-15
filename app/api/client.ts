// Единственное место, которое знает про транспорт (HTTP/$fetch) на пути к
// Go backend. projects.ts/auth.ts (типизированные методы) и composables выше
// него никогда не вызывают $fetch напрямую и не видят "сырых" ошибок fetch —
// только ApiError. Этот же файл — единственное место, которое знает про
// access token/Authorization header и про централизованный 401-refresh-retry.
import type { ApiError, AuthResponseDto } from './types'

interface FetchErrorLike {
  response?: {
    status: number
    _data?: unknown
  }
  message?: string
}

interface BackendErrorBody {
  error?: {
    code?: string
    message?: string
  }
}

// Человеческие RU-сообщения для конкретных backend-кодов ошибок (в основном
// auth-flow) — единственное место такого маппинга во всём приложении, чтобы
// ни одна страница не парсила ошибки сама. Коды вне этого списка используют
// сообщение backend как есть (уже достаточно человеческое, см. writeAuthError/
// writeServiceError на бэкенде) либо httpStatusMessage() ниже как fallback.
const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  invalid_verification_code: 'Неверный код.',
  verification_expired: 'Срок действия кода истёк.',
  verification_attempts_exceeded: 'Превышено количество попыток.',
  verification_not_found: 'Код не найден. Запросите новый код.',
  sms_cooldown_active: 'Слишком частый запрос. Попробуйте позже.',
  user_already_exists: 'Пользователь с таким номером уже существует.',
  user_not_found: 'Пользователь не найден.',
  invalid_phone: 'Некорректный номер телефона.',
}

function httpStatusMessage(status: number): string {
  switch (status) {
    case 400: return 'Некорректные данные запроса.'
    case 404: return 'Проект не найден.'
    case 409: return 'Конфликт данных на сервере.'
    case 500: return 'Внутренняя ошибка сервера.'
    default: return `Ошибка запроса (${status}).`
  }
}

function hasResponse(value: unknown): value is FetchErrorLike & { response: NonNullable<FetchErrorLike['response']> } {
  return typeof value === 'object' && value !== null && 'response' in value
    && (value as FetchErrorLike).response !== undefined
}

// Нормализует любую ошибку запроса ($fetch/ofetch FetchError при HTTP-ошибке,
// упавший до ответа network error, что угодно ещё) в единый ApiError. UI-слой
// работает только с этой формой, независимо от первопричины.
export function toApiError(error: unknown): ApiError {
  if (hasResponse(error)) {
    const status = error.response.status
    // 401 — всегда один и тот же дружелюбный смысл для пользователя ("войдите
    // заново"), независимо от того, какой именно backend-код за этим стоит
    // (unauthorized/refresh_token_expired/...) — apiFetch() уже попытался
    // refresh+retry ДО того, как эта ошибка вообще возникла здесь, так что
    // если мы всё равно здесь — сессию восстановить не удалось.
    if (status === 401) {
      return {
        status,
        code: 'session_expired',
        message: 'Сессия истекла. Войдите заново.',
        details: error.response._data,
      }
    }
    const body = error.response._data as BackendErrorBody | undefined
    const knownMessage = body?.error?.code ? KNOWN_ERROR_MESSAGES[body.error.code] : undefined
    if (knownMessage) {
      return { status, code: body!.error!.code!, message: knownMessage, details: body }
    }
    if (body?.error?.message) {
      return {
        status,
        code: body.error.code ?? 'http_error',
        message: body.error.message,
        details: body,
      }
    }
    // malformed/непредвиденное тело ответа — не показываем "[object Object]",
    // даём человеческое сообщение по коду статуса.
    return { status, code: 'http_error', message: httpStatusMessage(status), details: body }
  }

  // Запрос не дошёл до ответа вообще: backend недоступен, DNS/сеть и т.п.
  const message = error instanceof Error ? error.message : undefined
  return {
    status: 0,
    code: 'network_error',
    message: 'Не удалось подключиться к серверу. Проверьте, что backend запущен, и повторите попытку.',
    details: message,
  }
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null
    && 'status' in value && 'code' in value && 'message' in value
}

function isUnauthorized(error: unknown): boolean {
  return hasResponse(error) && error.response.status === 401
}

// Access token — только в памяти (обычный module-level ref, НЕ useState):
// он не должен ни сериализоваться в SSR payload, ни переживать полный
// reload, ни утекать между конкурентными SSR-запросами разных пользователей
// в одном Node-процессе. useAuth() переиспользует именно этот ref как своё
// поле accessToken — единственный источник, а не отдельная копия.
export const accessToken = ref<string | null>(null)

// Вызывается useAuth() один раз, чтоббы при окончательно неудавшемся
// refresh (см. performRefresh ниже) auth state тоже обнулился — без того,
// чтобы client.ts импортировал useAuth() и создавал циклическую зависимость.
type AuthFailureListener = () => void
let authFailureListener: AuthFailureListener | null = null
export function setAuthFailureListener(listener: AuthFailureListener | null) {
  authFailureListener = listener
}

// Single-flight refresh: сколько бы параллельных запросов ни поймали 401
// одновременно, POST /auth/refresh уходит только один раз — остальные ждут
// тот же promise (см. "401 HANDLING" в задании).
let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const config = useRuntimeConfig()
  try {
    const result = await $fetch<AuthResponseDto>('/api/v1/auth/refresh', {
      baseURL: config.public.apiBaseUrl,
      method: 'POST',
      credentials: 'include',
    })
    accessToken.value = result.access_token
    return true
  } catch {
    accessToken.value = null
    authFailureListener?.()
    return false
  }
}

function performRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: object
  signal?: AbortSignal
  // Приложить Authorization: Bearer <accessToken> и участвовать в 401-retry.
  // По умолчанию true; auth-эндпоинты (sms/send, register/verify,
  // login/verify, сам refresh) вызывают apiFetch с auth:false — токена ещё
  // нет (или это и есть его выдача), и 401 оттуда не должен пытаться
  // "рефрешнуть" сам refresh.
  auth?: boolean
}

// Единая точка HTTP-запросов к Go backend. Base URL берётся из runtime
// config (никогда не хардкодится), $fetch — универсальный (SSR/клиент)
// fetch Nuxt, поэтому этот слой не ломает SSR. credentials:'include' стоит
// на каждом запросе централизованно (не точечно) — backend сам скоупит
// refresh-cookie только на /api/v1/auth/* через Cookie.Path, так что для
// остальных путей эта опция просто ничего не отправляет, а не наоборот.
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const config = useRuntimeConfig()
  const withAuth = options.auth ?? true

  function buildHeaders(): Record<string, string> {
    if (withAuth && accessToken.value) {
      return { Authorization: `Bearer ${accessToken.value}` }
    }
    return {}
  }

  async function attempt(): Promise<T> {
    return await $fetch<T>(path, {
      baseURL: config.public.apiBaseUrl,
      method: options.method ?? 'GET',
      body: options.body,
      signal: options.signal,
      credentials: 'include',
      headers: buildHeaders(),
    })
  }

  try {
    return await attempt()
  } catch (error) {
    if (withAuth && isUnauthorized(error)) {
      const refreshed = await performRefresh()
      if (refreshed) {
        try {
          return await attempt() // повторяем ровно один раз с новым токеном
        } catch (retryError) {
          throw toApiError(retryError)
        }
      }
    }
    throw toApiError(error)
  }
}
