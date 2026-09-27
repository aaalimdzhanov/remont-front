<script setup lang="ts">
// Единая навигация между разделами проекта — переиспользуется и Builder'ом
// (EditorHeader.vue), и Work Builder'ом (WorkBuilderHeader.vue), вместо двух
// отдельных реализаций табов. Чисто presentational: никакого API/бизнес-логики,
// активный пункт определяется исключительно текущим route (не localStorage/
// не отдельный activeTab state) — переживает refresh, прямой заход по URL,
// browser back/forward сам по себе, потому что источник истины — useRoute().
//
// variant="top" (desktop, без изменений с прошлой задачи) — 3 компактных
// pill-таба: План/Работы/Расчёты. "Проект" здесь по-прежнему не добавлен —
// на desktop рядом уже есть отдельная "← Проекты" ссылка (EditorHeader.vue/
// WorkBuilderHeader.vue), дублировать её внутри этого же ряда незачем.
//
// variant="bottom" (mobile bottom nav, см. ProjectBottomNav.vue и mobile UX
// reference) — 4 пункта с иконками: Проекты (реальная ссылка на /projects —
// список проектов, ЭТО не то же самое, что "План", у него другой route и он
// никогда не бывает "активным" на этой странице) / План / Работы / Расчёты.
// На mobile отдельной "← Проекты" ссылки в этом месте экрана нет, поэтому
// здесь она уместна как полноценный четвёртый пункт, а не дублирование.
const props = withDefaults(defineProps<{ projectId: string, variant?: 'top' | 'bottom' }>(), {
  variant: 'top',
})

const route = useRoute()
const isWorksActive = computed(() => isWorksRouteActive(route.path))
const { t } = useI18n()
</script>

<template>
  <nav class="project-nav" :class="`project-nav--${variant}`" :aria-label="t('builder.navSections')">
    <NuxtLink v-if="variant === 'bottom'" to="/projects" class="project-nav__tab">
      <UiIcon name="folder" :size="20" />
      {{ t('navigation.projects') }}
    </NuxtLink>

    <NuxtLink :to="`/projects/${props.projectId}`" class="project-nav__tab" :class="{ 'project-nav__tab--active': !isWorksActive }">
      <UiIcon v-if="variant === 'bottom'" name="room" :size="20" />
      {{ t('builder.tabPlan') }}
    </NuxtLink>

    <NuxtLink :to="`/projects/${props.projectId}/works`" class="project-nav__tab" :class="{ 'project-nav__tab--active': isWorksActive }">
      <UiIcon v-if="variant === 'bottom'" name="list" :size="20" />
      {{ t('builder.tabWorks') }}
    </NuxtLink>

    <span class="project-nav__tab project-nav__tab--disabled" aria-disabled="true" :title="t('builder.comingSoon')">
      <UiIcon v-if="variant === 'bottom'" name="grid" :size="20" />
      {{ t('builder.tabCalculations') }}
    </span>
  </nav>
</template>

<style scoped>
.project-nav {
  display: flex;
  gap: var(--space-2);
}

.project-nav--bottom {
  gap: var(--space-1);
}

.project-nav--bottom .project-nav__tab {
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  height: 52px;
  border-radius: var(--radius-input);
  font-size: 11px;
}

.project-nav__tab {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 var(--space-3);
  border-radius: 999px;
  font-size: var(--font-small-size);
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
}

.project-nav__tab:not(.project-nav__tab--disabled):hover {
  background: var(--color-surface-subtle);
  color: var(--color-text);
}

.project-nav__tab--active {
  background: var(--color-primary);
  color: #fff;
}

.project-nav__tab--disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
}
</style>
