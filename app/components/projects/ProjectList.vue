<script setup lang="ts">
import type { ProjectSummary } from '~/api/types'

defineProps<{ projects: ProjectSummary[] }>()
const emit = defineEmits<{ open: [id: string], delete: [id: string, name: string] }>()
</script>

<template>
  <ul class="project-list">
    <ProjectsProjectCard
      v-for="project in projects"
      :key="project.id"
      :project="project"
      @open="emit('open', project.id)"
      @delete="emit('delete', project.id, project.name)"
    />
  </ul>
</template>

<style scoped>
.project-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-5);
}
</style>
