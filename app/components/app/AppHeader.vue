<script setup lang="ts">
// Единый header для authenticated-приложения (/projects, /projects/new) —
// не дублируется на каждой странице, живёт один раз в layouts/app.vue.
// Editor (/projects/{id}) использует свой EditorHeader, не этот.
//
// Mobile-first Dashboard (см. задание): убрана постоянная nav-ссылка
// "Проекты" (единственное направление и так открыто по умолчанию — see
// header reference: "[logo] ... [avatar]", без текстовых пунктов меню) и
// инлайн телефон/"Выйти" — теперь это ProfileMenu под аватаром.
//
// variant="header" (знак + подпись "ishonchliusta", без tagline) — здесь
// достаточно места и на desktop, и на mobile (справа только аватар), в
// отличие от EditorHeader.vue (Builder), где рядом ещё название проекта,
// статус сохранения и кнопки — там компактный variant="compact" остаётся
// как есть, этот файл его не трогает.
</script>

<template>
  <header class="app-header">
    <NuxtLink to="/projects" class="app-header__brand">
      <UiBrandLogo variant="header" />
    </NuxtLink>

    <AppProfileMenu />
  </header>
</template>

<style scoped>
.app-header {
  min-height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  padding-top: max(var(--space-2), env(safe-area-inset-top));
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.app-header__brand {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

@media (min-width: 768px) {
  .app-header {
    min-height: 64px;
    padding: 0 var(--space-6);
    padding-top: env(safe-area-inset-top);
  }
}
</style>
