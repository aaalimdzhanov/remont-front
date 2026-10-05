<script setup lang="ts">
// Минимальный layout для /auth/login и /auth/register: белая поверхность,
// много воздуха, полный лок-ап ishonchliusta сверху (включает tagline —
// отдельного текста под ним больше нет), центральная карточка. Никакого
// sidebar/editor header — auth-страницы сами решают, что показывать внутри
// карточки.
//
// Auth logo navigation fix: логотип раньше был просто <UiBrandLogo /> без
// ссылки — кликабельным нигде не был. Оборачиваем в <NuxtLink to="/marketplace">,
// тот же паттерн, что уже используют AppHeader.vue/AppFooter.vue для того же
// самого логотипа (клиентская SPA-навигация, без полного reload) — не второй
// способ навигации, тот же. Один layout — правка автоматически действует на
// все страницы, использующие layout:'auth' (/auth/login, /auth/register и
// любые будущие auth-страницы), без правок в каждой странице по отдельности.
</script>

<template>
  <div class="auth-layout">
    <header class="auth-layout__brand">
      <NuxtLink to="/marketplace" class="auth-layout__logo-link">
        <UiBrandLogo />
      </NuxtLink>
    </header>

    <main class="auth-layout__content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-8) var(--space-4) var(--space-6);
}

.auth-layout__brand {
  width: 100%;
  max-width: 400px;
  padding-bottom: var(--space-10);
}

/* Просто кликабельная обёртка — сама не добавляет ни отступов, ни изменений
   размера/позиции логотипа (см. задание, секция 9); width:fit-content —
   область клика точно по логотипу, не на всю ширину .auth-layout__brand. */
.auth-layout__logo-link {
  display: block;
  width: fit-content;
  cursor: pointer;
}

.auth-layout__content {
  width: 100%;
  max-width: 400px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

@media (max-width: 480px) {
  .auth-layout {
    padding: var(--space-6) var(--space-4);
  }

  .auth-layout__brand {
    padding-bottom: var(--space-6);
  }
}
</style>
