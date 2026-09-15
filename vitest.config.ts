import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Лёгкая unit-test обвязка без полноценной среды Nuxt: composables/api-слой
// не зависят от DOM/SSR-рендера, а Nuxt-автоимпорты (useState, $fetch,
// useRuntimeConfig, ref/computed/watch) подставляются в tests/setup.ts.
export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
})
