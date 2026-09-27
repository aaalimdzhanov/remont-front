<script setup lang="ts">
// Header страницы /projects/{id}/works (Screen 1/6, только в состоянии
// currentStep==='list' — во время add-flow вместо этого блока показывается
// свой шаговый заголовок, см. pages/projects/[id]/works.vue).
//
// Mobile (<768px): добавлен глобальный ряд (AppHeader.vue, тот же logo+
// AppProfileMenu, что и на Dashboard/Builder) — до этого у Work Builder не
// было вообще никакого способа выйти из аккаунта на mobile. Табы
// План/Работы/Расчёты на mobile уходят в ProjectBottomNav (низ экрана), не
// дублируются здесь же наверху — см. задание "mobile cleanup".
// Desktop (≥768px): без изменений — тот же верхний ряд + табы, что и раньше.
defineProps<{
  projectId: string
  projectName: string
  hasWorks: boolean
  isRecalculating: boolean
}>()

defineEmits<{ recalculate: [] }>()

const { t } = useI18n()
</script>

<template>
  <AppHeader class="work-header__mobile-global" />

  <div class="work-header">
    <div class="work-header__top">
      <NuxtLink to="/projects" class="work-header__back" :aria-label="t('projects.backToProjectsAriaLabel')">
        <UiIcon name="chevron-left" :size="20" />
      </NuxtLink>
      <p class="work-header__name">
        {{ projectName }}
      </p>
      <button
        v-if="hasWorks"
        type="button"
        class="btn btn-ghost btn-sm work-header__recalc"
        :disabled="isRecalculating"
        @click="$emit('recalculate')"
      >
        <UiIcon name="refresh" :size="14" />
        {{ isRecalculating ? t('builder.workBuilder.recalculating') : t('builder.workBuilder.recalculate') }}
      </button>
    </div>

    <div class="work-header__tabs">
      <ProjectNavigation :project-id="projectId" />
    </div>
  </div>

  <ProjectBottomNav :project-id="projectId" />
</template>

<style scoped>
.work-header {
  flex-shrink: 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.work-header__top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 56px;
  padding: var(--space-2) var(--space-4);
  padding-top: max(var(--space-2), env(safe-area-inset-top));
}

.work-header__back {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-left: calc(-1 * var(--space-2));
  border-radius: var(--radius-input);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.work-header__back:hover {
  color: var(--color-text);
  background: var(--color-surface-subtle);
}

.work-header__name {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-header__recalc {
  flex-shrink: 0;
}

/* Mobile: табы уходят в ProjectBottomNav — не показываем их второй раз здесь. */
.work-header__tabs {
  display: none;
}

@media (min-width: 768px) {
  .work-header__mobile-global {
    display: none;
  }

  .work-header__top {
    min-height: 64px;
    padding: 0 var(--space-6);
    padding-top: env(safe-area-inset-top);
  }

  .work-header__tabs {
    display: block;
    padding: 0 var(--space-6) var(--space-3);
  }
}
</style>
