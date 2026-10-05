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
// variant="header" — Header consistency: единый application header везде
// (/projects, /marketplace, /orders, /reviews, /projects/new) показывает
// ОДИН И ТОТ ЖЕ approved логотип, ishonchliusta-full.png, без текстового
// fallback (см. UiBrandLogo.vue). EditorHeader.vue (Builder desktop toolbar)
// по-прежнему использует variant="compact" (только знак) — там строка уже
// плотно занята полем имени/статусом сохранения/чипом локации, и это
// сознательное, задокументированное исключение (см. финальный отчёт задачи
// "Header consistency"), а не второй вариант логотипа для того же экрана.
//
// Mode-aware nav (AppModeNav, см. задание "User Mode v1") заменяет прежнюю
// одиночную иконку-ссылку на /marketplace: она была единственной точкой входа
// в Marketplace, но теперь та же цель (и её contractor-эквивалент "Заявки")
// уже входит в AppModeNav — держать обе означало бы две ссылки на один и тот
// же route рядом друг с другом. Этот компонент по-прежнему переиспользуется
// как единственный "глобальный" ряд и на Dashboard, и на mobile-версии
// Builder/Work Builder header'ов (EditorHeader.vue/WorkBuilderHeader.vue),
// поэтому mode-nav показывается everywhere этот header есть, без добавления
// второго отдельного header'а.
</script>

<template>
  <header class="app-header">
    <div class="app-header__top">
      <NuxtLink to="/marketplace" class="app-header__brand">
        <UiBrandLogo variant="header" />
      </NuxtLink>

      <div class="app-header__actions">
        <AppProfileMenu />
      </div>
    </div>

    <AppModeNav class="app-header__mode-nav" />
  </header>
</template>

<style scoped>
.app-header {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  padding-top: max(var(--space-2), env(safe-area-inset-top));
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.app-header__top {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.app-header__brand {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.app-header__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.app-header__mode-nav {
  padding-bottom: 2px;
}

@media (min-width: 768px) {
  .app-header {
    padding: var(--space-3) var(--space-6);
    padding-top: max(var(--space-3), env(safe-area-inset-top));
  }
}
</style>
