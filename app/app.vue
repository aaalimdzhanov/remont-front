<script setup lang="ts">
// Единая точка старта session initialization (см. useAuth().initialize()) и
// единая точка "не показывать реальный контент, пока не знаем auth state" —
// без этого SSR/самое первое hydration-окно могло бы на мгновение показать
// не тот экран (например, пустой список проектов вместо реальных), пока
// refresh+/me ещё не отработали. initialize() сам по себе idempotent —
// если middleware уже его вызвал, здесь просто переиспользуется тот же промис.
const { isInitialized, initialize } = useAuth()
const { t } = useI18n()

onMounted(() => {
  void initialize()
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <!-- v-show на обёртке, не v-if/v-else и не v-show прямо на <NuxtPage>:
         Nuxt explicitly warns (NUXT_E4011) that conditionally RENDERING
         <NuxtPage> breaks its SSR/hydration bookkeeping (подтверждено
         реальным hydration mismatch с v-if); а v-show НАПРЯМУЮ на компоненте
         с non-element root (Suspense/RouterView внутри) тоже не работает —
         Vue явно предупреждает "directives will not function as intended".
         Поэтому <NuxtPage> всегда смонтирован без единой директивы на нём,
         а видимость переключается на обычном div-контейнере вокруг него. -->
    <div v-show="!isInitialized" class="app-splash">
      {{ t('common.loading') }}
    </div>
    <div v-show="isInitialized">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </div>
</template>

<style scoped>
.app-splash {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: var(--font-body-size);
  background: var(--color-bg);
}
</style>
