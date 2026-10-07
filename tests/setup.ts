// composables/api-код полагается на Nuxt auto-imports (useState, $fetch,
// useRuntimeConfig, ref/computed/watch), которые в реальном приложении
// подставляет сборщик Nuxt. Под чистым Vitest (без @nuxt/test-utils, чтобы
// не тащить тяжёлую тестовую инфраструктуру ради простого unit-слоя)
// подставляем их вручную как глобалы — ref/computed/watch берём настоящие
// из vue (это чистая reactivity, framework-agnostic), useState — минимальный
// шim с тем же контрактом (ключ -> ленивая инициализация -> общий ref),
// useRuntimeConfig — статический стаб, $fetch каждый тест мокает сам.
import { computed, ref, toRaw, watch } from 'vue'
import { vi } from 'vitest'

const stateStore = new Map<string, ReturnType<typeof ref>>()

function useStateShim<T>(key: string, init?: () => T) {
  if (!stateStore.has(key)) {
    stateStore.set(key, ref(typeof init === 'function' ? init() : undefined))
  }
  return stateStore.get(key)
}

// Вызывать в beforeEach каждого теста, использующего useBuilding/
// useProjectPersistence — иначе singleton-состояние "просочится" между тестами,
// как оно и делает между разными компонентами внутри одного реального приложения.
export function resetShimState() {
  stateStore.clear()
}

vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('watch', watch)
vi.stubGlobal('toRaw', toRaw)
vi.stubGlobal('useState', useStateShim)
vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBaseUrl: 'http://backend.test' } }))

// Persistence-слой этого этапа синхронизирует адресную строку с текущим
// project id (см. useProjectPersistence.syncRoute). В реальном Nuxt-приложении
// useRoute()/navigateTo() — auto-import; здесь достаточно безобидных стабов.
vi.stubGlobal('useRoute', () => ({ path: '/', params: {} }))
vi.stubGlobal('navigateTo', vi.fn())

// import.meta.client — компилируемая Nuxt-константа (в реальной сборке
// заменяется на true/false на этапе билда). Под чистым Vitest (без Nuxt/Vite
// auto-import-плагина) она остаётся undefined — то есть falsy — и весь код,
// гейтящийся `if (!import.meta.client) return` (window.addEventListener,
// useRoute/navigateTo), корректно и безопасно не выполняется в тестовой
// среде "node" (где нет window). Именно поэтому beforeunload-регистрация
// не тестируется юнит-тестами напрямую — только вручную в браузере
// (см. финальный отчёт, Known limitations).

// useNuxtApp().$i18n.t — используется app/api/client.ts (toApiError/
// httpStatusMessage) для резолва errors.* ключей. Стаб на РЕАЛЬНОМ
// locales/ru.json (не заглушка "вернуть ключ как есть") — так тесты
// tests/api/client.test.ts продолжают проверять настоящий RU-текст, а не
// потеряли бы смысл, если бы key просто эхом возвращался; заодно ловит
// реальный дрейф, если ключ в client.ts разъедется с locales/ru.json.
import ruMessages from '../locales/ru.json'

function resolveMessage(path: string): string | undefined {
  const parts = path.split('.')
  let node: unknown = ruMessages
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

function interpolate(message: string, params?: Record<string, unknown>): string {
  if (!params) return message
  let result = message
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, String(value))
  }
  return result
}

vi.stubGlobal('useNuxtApp', () => ({
  $i18n: {
    t: (key: string, params?: Record<string, unknown>) => interpolate(resolveMessage(key) ?? key, params),
  },
}))

// useI18n() — тот же реальный ru.json-бэкенд, что и useNuxtApp().$i18n.t
// выше, нужен отдельно, потому что composables (не только api/client.ts)
// вызывают именно useI18n() напрямую (см. app/composables/useBuilding.ts
// getIntersectingOpeningLabels и т.п.), а не через useNuxtApp().
const i18nLocale = ref<'ru' | 'uz'>('ru')
vi.stubGlobal('useI18n', () => ({
  t: (key: string, params?: Record<string, unknown>) => interpolate(resolveMessage(key) ?? key, params),
  locale: i18nLocale,
  setLocale: (next: 'ru' | 'uz') => { i18nLocale.value = next },
}))
