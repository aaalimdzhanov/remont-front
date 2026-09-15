<template>
  <div class="app-shell">
    <AppHeader />
    <div class="app-shell__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.app-shell__content {
  flex: 1;
}
</style>
