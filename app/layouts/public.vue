<!-- Footer v1: для страниц, которые НЕ используют layout:'app' (см. задание
     "Добавить Footer": "не менять существующий header") — а именно
     marketplace/contractors/[id].vue и marketplace/requests/[id].vue, у
     которых уже есть свой собственный inline back-link-header прямо в
     разметке страницы (см. их doc comments — сознательно оставлены без
     AppHeader ещё в задаче "Header consistency"). Этот layout НЕ добавляет
     AppHeader — только тот же flex-column shell + AppFooter, что и
     layouts/app.vue, без самого header, чтобы не задваивать его и не
     трогать существующую навигацию этих страниц. НЕ называется default.vue
     специально: Nuxt применяет default.vue ко ВСЕМ страницам без явного
     layout, включая полноэкранные Builder/Work Builder
     (projects/[id]/index.vue, projects/[id]/works.vue) — у них своя
     fixed-позиционированная toolbar-разметка на весь viewport, где
     обычный document-flow footer сломал бы инструмент; те страницы
     сознательно остаются вообще без layout, как и раньше. -->
<template>
  <div class="public-shell">
    <div class="public-shell__content">
      <slot />
    </div>
    <AppFooter />
  </div>
</template>

<style scoped>
.public-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.public-shell__content {
  flex: 1;
}
</style>
