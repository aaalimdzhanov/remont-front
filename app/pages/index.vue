<script setup lang="ts">
// Корень приложения больше не отвечает ни за что сам — управление проектами
// живёт на /projects. Редирект выполняется здесь (а не в отдельном
// middleware/nuxt.config), чтобы не городить лишний routing-механизм ради
// одной страницы; await в setup делает это SSR-safe (редирект уходит уже на
// сервере, без "мигания" пустой страницы в браузере).
await navigateTo('/projects', { replace: true })
</script>

<template>
  <div />
</template>
