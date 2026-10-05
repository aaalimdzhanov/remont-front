<!-- Footer v1: AppFooter — нормальный document-flow блок ПОСЛЕ
     .app-shell__content, не fixed/sticky (см. AppFooter.vue). Прижат к низу
     самим flex-column .app-shell (min-height:100vh) + flex:1 на
     .app-shell__content — короткая страница всё равно получает footer внизу
     viewport, без position-хаков на самом footer. -->
<template>
  <div class="app-shell">
    <AppHeader />
    <div class="app-shell__content">
      <slot />
    </div>
    <AppFooter />
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
