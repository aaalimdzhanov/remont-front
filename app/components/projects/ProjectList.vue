<script setup lang="ts">
import type { Project, ProjectSummary } from '~/api/types'

defineProps<{
  projects: ProjectSummary[]
  // Полный Building JSON на проект — грузится родителем параллельно для всех
  // карточек сразу (см. pages/projects/index.vue), сюда приходит уже готовым.
  details: Record<string, Project | undefined>
  loadingIds: Set<string>
}>()
const emit = defineEmits<{ open: [id: string], delete: [id: string, name: string], rename: [id: string, name: string] }>()
</script>

<template>
  <ul class="project-list">
    <ProjectsProjectCard
      v-for="project in projects"
      :key="project.id"
      :project="project"
      :detail="details[project.id] ?? null"
      :loading="loadingIds.has(project.id)"
      @open="emit('open', project.id)"
      @delete="emit('delete', project.id, project.name)"
      @rename="(name) => emit('rename', project.id, name)"
    />
  </ul>
</template>

<style scoped>
/* Брейкпоинты по заданию: mobile ≤767 (1 колонка), tablet 768–1199
   (2 колонки), desktop ≥1200 (3–4 колонки по ширине). */
.project-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .project-list {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-5);
  }
}

@media (min-width: 1200px) {
  .project-list {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
}
</style>
