<script setup lang="ts">
// Header страницы /projects/{id}/works (Screen 1/6, только в состоянии
// currentStep==='list' — во время add-flow вместо этого блока показывается
// свой шаговый заголовок, см. pages/projects/[id]/works.vue).
//
// Global/Page Header split (см. задание "финально унифицировать Header"):
// AppHeader.vue (logo+AppLangSwitch+AppProfileMenu+AppModeNav — тот же
// компонент, что и на Dashboard) теперь это GLOBAL HEADER на ВСЕХ ширинах, не
// только на mobile, как было раньше (тогда на desktop лого/язык/user были
// внутри .work-header__top — сделано осознанно в предыдущей итерации, но
// visually мешало странице выглядеть единообразно с Builder). .work-header
// ниже — чистый PAGE HEADER: Back + название ("Черновик") + Пересчитать +
// Сохранить — никаких global-элементов здесь больше нет вообще, ни на одной
// ширине. Табы План/Работы/Расчёты на mobile уходят в ProjectBottomNav (низ
// экрана), не дублируются здесь же наверху — см. задание "mobile cleanup".
defineProps<{
  projectId: string
  projectName: string
  hasWorks: boolean
  isRecalculating: boolean
  // Guest Work Builder (projectId="draft" — см. задание): "← Проекты" не
  // имеет смысла для гостя (/projects требует auth) — куда ведёт "←" решает
  // вызывающая страница, а не хардкод здесь.
  backHref: string
  backAriaLabel?: string
}>()

defineEmits<{ recalculate: [] }>()

const { t } = useI18n()
</script>

<template>
  <!-- GLOBAL HEADER — logo + language + user, на всех ширинах (не только
       mobile, см. doc comment выше). Тот же компонент, что и на Dashboard —
       не копируем его markup сюда вручную. -->
  <AppHeader />

  <!-- PAGE HEADER — Back + название + page-specific действия (Пересчитать,
       Сохранить). Никаких global-элементов (logo/язык/user) здесь нет. -->
  <div class="work-header">
    <div class="work-header__top">
      <NuxtLink :to="backHref" class="work-header__back" :aria-label="backAriaLabel ?? t('projects.backToProjectsAriaLabel')">
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

      <!-- Unify Save entry point (см. задание "унифицировать 'Сохранить
           проект' между Public Builder и Work Builder") — тот же
           WorkSaveButton.vue, что раньше был отдельной большой кнопкой
           внизу content'а (см. doc comment там и в pages/projects/draft/
           works.vue) — никакой новой save-логики, просто другое место
           монтирования. Самоограничивается через projectId===null внутри
           самого компонента, поэтому на authenticated-странице (projectId
           задан) рендерит пустоту — WorkBuilderHeader не должен сам решать
           guest/authenticated, он просто всегда монтирует компонент,
           который уже умеет молчать, когда сохранять нечего. -->
      <WorkSaveButton class="work-header__save" />
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

.work-header__save {
  flex-shrink: 0;
}

/* Mobile: табы уходят в ProjectBottomNav — не показываем их второй раз здесь. */
.work-header__tabs {
  display: none;
}

@media (min-width: 768px) {
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
