<script setup lang="ts">
// Mode-aware nav pills — CLIENT: Проекты/Биржа, CONTRACTOR: Заявки/
// Предложения/Услуги (см. задание, секция APP HEADER). Только реальные
// routes (см. utils/userMode.ts getUserModeNavItems) — "Работы" сознательно
// не добавлен как отдельный global пункт: в приложении нет project-agnostic
// списка работ (Работы всегда открываются внутри конкретного проекта через
// ProjectNavigation), а секция 22/весь текст задания явно против
// выдумывания несуществующих destinations. Тот же визуальный паттерн pill-
// табов, что и ProjectNavigation.vue (переиспользуем стиль, не компонент —
// разный источник активного состояния: там route project-id, здесь чистый
// route.path match).
//
// Используется в двух местах (не дублируя сам компонент): AppHeader.vue
// (Dashboard + mobile-global-row в Builder/Work Builder) и напрямую в
// marketplace/*.vue страницах (у которых нет AppHeader — см. финальный
// отчёт, Architecture) — единственный источник вёрстки для этой навигации.
const { mode } = useUserMode()
const { isAuthenticated } = useAuth()
const route = useRoute()

const items = computed(() => getUserModeNavItems(mode.value))

function isActive(to: string): boolean {
  return to === '/marketplace' ? route.path === '/marketplace' : route.path.startsWith(to)
}
</script>

<template>
  <!-- Гость: User Mode отсутствует (см. задание "Public Marketplace v1",
       секция 19), а все пункты кроме "Биржа" ведут на auth-gated страницы —
       показывать эту навигацию неавторизованному пользователю было бы
       обманчиво (см. секция 18: "не как будто пользователь авторизован"). -->
  <nav v-if="isAuthenticated" class="mode-nav" aria-label="Навигация режима">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="mode-nav__tab"
      :class="{ 'mode-nav__tab--active': isActive(item.to) }"
    >
      <UiIcon :name="item.icon" :size="16" />
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.mode-nav {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;
}

.mode-nav::-webkit-scrollbar {
  display: none;
}

.mode-nav__tab {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 32px;
  padding: 0 var(--space-3);
  border-radius: 999px;
  font-size: var(--font-small-size);
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  white-space: nowrap;
}

.mode-nav__tab:hover {
  background: var(--color-surface-subtle);
  color: var(--color-text);
}

.mode-nav__tab--active {
  background: var(--color-primary);
  color: #fff;
}
</style>
