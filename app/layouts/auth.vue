<script setup lang="ts">
// Минимальный layout для /auth/login и /auth/register: белая поверхность,
// много воздуха, REMONT сверху, центральная карточка. Никакого sidebar/
// editor header — auth-страницы сами решают, что показывать внутри карточки.
</script>

<template>
  <div class="auth-layout">
    <header class="auth-layout__brand">
      <span class="brand-wordmark">REMONT</span>
    </header>

    <main class="auth-layout__content">
      <slot />
    </main>

    <p class="auth-layout__tagline text-caption text-muted">
      Больше, чем ремонт.
    </p>
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

.auth-layout__content {
  width: 100%;
  max-width: 400px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.auth-layout__tagline {
  padding-top: var(--space-10);
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
