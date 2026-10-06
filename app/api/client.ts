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

// i18n-ключи (namespace `errors.*`, см. locales/{ru,uz}.json) для конкретных
// backend-кодов ошибок — единственное место такого маппинга во всём
// приложении, чтобы ни одна страница не парсила ошибки сама. Раньше здесь
// лежали сырые RU-строки напрямую; после локализации маппинг ведёт на ключ,
// который резолвится в toApiError() через $i18n.t(). Коды вне этого списка
// используют сообщение backend как есть, либо httpStatusMessage() как fallback.
const KNOWN_ERROR_KEYS: Record<string, string> = {
  invalid_verification_code: 'errors.invalid_verification_code',
  verification_expired: 'errors.verification_expired',
  verification_attempts_exceeded: 'errors.verification_attempts_exceeded',
  verification_not_found: 'errors.verification_not_found',
  verification_consumed: 'errors.verification_consumed',
  sms_cooldown_active: 'errors.sms_cooldown_active',
  user_already_exists: 'errors.user_already_exists',
  user_not_found: 'errors.user_not_found',
  invalid_phone: 'errors.invalid_phone',
  // Contractor / ContractorService (см. contractor_handler.go,
  // contractor_service_handler.go) — коды один-в-один из writeContractorError/
  // writeContractorServiceError на backend.
  contractor_not_found: 'errors.contractor_not_found',
  contractor_already_exists: 'errors.contractor_already_exists',
  contractor_service_not_found: 'errors.contractor_service_not_found',
  contractor_service_already_exists: 'errors.contractor_service_already_exists',
  work_type_not_found: 'errors.work_type_not_found',
  work_type_inactive: 'errors.work_type_inactive',
  // Work Calculation (/api/v1/work-calculations, см. Guest Work Builder) —
  // коды один-в-один из публичного calculation endpoint'а.
  manual_quantity_required: 'errors.manual_quantity_required',
  invalid_building: 'errors.invalid_building',
  room_not_found: 'errors.room_not_found',
  invalid_price: 'errors.invalid_price',
  invalid_price_range: 'errors.invalid_price_range',
  // Order (см. order_handler.go writeOrderError) — коды один-в-один.
  offer_not_accepted: 'errors.offer_not_accepted',
  offer_not_found: 'errors.offer_not_found',
  order_already_exists: 'errors.order_already_exists',
  order_not_found: 'errors.order_not_found',
  invalid_order_transition: 'errors.invalid_order_transition',
  invalid_order_status: 'errors.invalid_order_status',
  marketplace_request_not_open: 'errors.marketplace_request_not_open',
  marketplace_request_not_found: 'errors.marketplace_request_not_found',
  // Review (см. review_handler.go writeReviewError) — коды один-в-один.
  order_not_completed: 'errors.order_not_completed',
  review_already_exists: 'errors.review_already_exists',
  review_not_found: 'errors.review_not_found',
  invalid_rating: 'errors.invalid_rating',
  invalid_comment: 'errors.invalid_comment',
  // Portfolio (см. portfolio_handler.go / application/portfolio/service.go) —
  // раньше не было в этом списке вообще: любая из этих ошибок утекала к
  // пользователю как сырой backend-текст (см. аудит локализации).
  image_too_large: 'errors.image_too_large',
  invalid_image_type: 'errors.invalid_image_type',
  portfolio_item_not_found: 'errors.portfolio_item_not_found',
  empty_reorder: 'errors.empty_reorder',
  // Contractor Profile Photo v1 (см. contractor_photo_handler.go
  // writeContractorPhotoError) — тот же реальный backend-код, которым теперь
  // отвечают и Portfolio (после общего image_upload.go helper), и Contractor
  // Photo на 415: "unsupported_media_type", не "invalid_image_type" — код
  // выше остаётся в списке как есть (на случай старых ответов), просто
  // добавлен второй код на ту же понятную формулировку, без второго текста.
  // internal_error — тот же общий 500-код, что backend уже использует
  // повсеместно (не только у фото) — раньше не был в этом словаре вообще,
  // поэтому падал на сырой английский текст backend'а вместо
  // локализованного "Внутренняя ошибка сервера." (тот же errors.internal,
  // что уже показывает httpStatusMessage(500) как fallback без тела ответа).
  unsupported_media_type: 'errors.invalid_image_type',
  internal_error: 'errors.internal',
}

// Резолвит i18n-ключ в текущую локализованную строку. Вызывается только на
// клиенте (весь app — routeRules ssr:false, см. nuxt.config.ts), поэтому
// useNuxtApp() всегда внутри реального Nuxt app context к этому моменту.
function t(key: string, params?: Record<string, unknown>): string {
  return useNuxtApp().$i18n.t(key, params ?? {})
}

function httpStatusMessage(status: number): string {
  switch (status) {
    case 400: return t('errors.badRequest')
    case 404: return t('errors.notFound')
    case 409: return t('errors.conflict')
    case 500: return t('errors.internal')
    default: return t('errors.requestFailed', { status })
  }
}

function hasResponse(value: unknown): value is FetchErrorLike & { response: NonNullable<FetchErrorLike['response']> } {
  return typeof value === 'object' && value !== null && 'response' in value
    && (value as FetchErrorLike).response !== undefined
}

// Нормализует любую ошибку запроса ($fetch/ofetch FetchError при HTTP-ошибке,
// упавший до ответа network error, что угодно ещё) в единый ApiError. UI-слой
// работает только с этой формой, независимо от первопричины.
// requestUrl — куда именно ушёл запрос (baseURL+path): включается в сообщение
// ТОЛЬКО для network_error (когда ответа не было вообще), чтобы сразу было
// видно, к какому адресу приложение реально стучалось — самая частая причина
// "backend работает, а фронт говорит недоступен" это несовпадение хоста
// (например, браузер видит другой "localhost", чем сам backend-процесс).
export function toApiError(error: unknown, requestUrl?: string): ApiError {
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
        message: t('errors.session_expired'),
        details: error.response._data,
      }
    }
    const body = error.response._data as BackendErrorBody | undefined
    const knownKey = body?.error?.code ? KNOWN_ERROR_KEYS[body.error.code] : undefined
    if (knownKey) {
      return { status, code: body!.error!.code!, message: t(knownKey), details: body }
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

  // Запрос не дошёл до ответа вообще: backend недоступен, DNS/сеть, CORS-блок
  // и т.п. — ofetch в этом случае бросает ошибку без .response. Показываем
  // фактический адрес запроса прямо в сообщении (это публичный runtimeConfig,
  // не секрет) — иначе "backend недоступен" при реально запущенном backend
  // невозможно отличить от "фронтенд стучится не туда, куда думает пользователь"
  // (например, браузер резолвит localhost иначе, чем сам backend-процесс).
  const rawMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const urlSuffix = requestUrl ? ` (${requestUrl})` : ''
  // Браузер намеренно не различает "сервер недоступен" и "запрос заблокирован
  // CORS" — оба случая одинаково бросают TypeError без .response (ограничение
  // платформы, не наше). Поэтому в dev дополнительно показываем сырой текст
  // браузерной ошибки прямо в сообщении — это и есть "не скрывать реальную
  // ошибку во время разработки" (см. задание, секция 6). В production эта
  // техническая деталь не нужна конечному пользователю.
  const devSuffix = import.meta.dev ? ` [${rawMessage}]` : ''
  return {
    status: 0,
    code: 'network_error',
    message: t('errors.network', { urlSuffix, devSuffix }),
    details: rawMessage,
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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
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
  // Только для диагностики network_error в toApiError() — не влияет на сам
  // запрос ($fetch получает baseURL/path отдельно, как и раньше).
  const requestUrl = `${config.public.apiBaseUrl}${path}`

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
          throw toApiError(retryError, requestUrl)
        }
      }
    }
    throw toApiError(error, requestUrl)
  }
}
