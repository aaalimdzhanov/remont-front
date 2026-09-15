// composables/api-код полагается на Nuxt auto-imports (useState, $fetch,
// useRuntimeConfig, ref/computed/watch), которые в реальном приложении
// подставляет сборщик Nuxt. Под чистым Vitest (без @nuxt/test-utils, чтобы
// не тащить тяжёлую тестовую инфраструктуру ради простого unit-слоя)
// подставляем их вручную как глобалы — ref/computed/watch берём настоящие
// из vue (это чистая reactivity, framework-agnostic), useState — минимальный
// шim с тем же контрактом (ключ -> ленивая инициализация -> общий ref),
// useRuntimeConfig — статический стаб, $fetch каждый тест мокает сам.
import { computed, ref, watch } from 'vue'
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
