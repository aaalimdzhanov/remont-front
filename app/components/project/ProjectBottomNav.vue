<script setup lang="ts">
// Нижняя навигация проекта на mobile — тот же ProjectNavigation.vue, что и
// в desktop-хедерах Builder'а/Work Builder'а (variant="bottom" только меняет
// раскладку/стиль, routes и active-логика общие, ничего не дублируется).
// Видна только <768px (см. media query ниже) — на desktop эта же навигация
// уже показана инлайн в EditorHeader.vue/WorkBuilderHeader.vue, второй копии
// там при этом не будет: класс здесь просто ничего не рендерит на десктопе.
defineProps<{ projectId: string }>()

const { t } = useI18n()
</script>

<template>
  <nav class="project-bottom-nav" :aria-label="t('builder.navSectionsMobile')">
    <ProjectNavigation :project-id="projectId" variant="bottom" />
  </nav>
</template>

<style scoped>
.project-bottom-nav {
  display: none;
}

@media (max-width: 767px) {
  .project-bottom-nav {
    display: block;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    /* Ниже, чем Builder'овский properties bottom-sheet (z-index:30) и его
       backdrop (z-index:25, см. Builder.vue) — когда пользователь выделяет
       объект на mobile и открывается sheet со свойствами, он должен
       перекрывать эту навигацию, а не наоборот. */
    z-index: 20;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    padding: var(--space-2) var(--space-2) max(var(--space-2), env(safe-area-inset-bottom));
  }
}
</style>
