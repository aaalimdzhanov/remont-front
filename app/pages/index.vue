<script setup lang="ts">
// Public Marketplace as the Landing Page v1: / → /marketplace безусловно
// (см. middleware/home.ts — редирект и его обоснование живут там, не
// здесь). routeRules['/'].ssr:false (см. nuxt.config.ts) остаётся как
// есть — тот же выбор архитектуры, что и у самого /marketplace (тоже
// ssr:false), редирект уходит на клиенте сразу при навигации, без
// "мигания" пустой страницы (см. `<div />` ниже — эта страница никогда
// реально не отрисовывается).
definePageMeta({ middleware: 'home' })
</script>

<template>
  <div />
</template>
