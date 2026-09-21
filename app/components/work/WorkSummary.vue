<script setup lang="ts">
// Небольшой summary над списком работ (Screen 6) — только количество работ +
// разбивка по статусам. Сознательно НЕ суммирует quantity разных unit'ов
// (38.4 м² + 4 шт бессмысленно, см. задание, секция PROJECT SUMMARY).
import type { ProjectWork } from '~/api/types'

type WorkStatus = ProjectWork['status']

const props = defineProps<{ works: ProjectWork[] }>()

function pluralWorks(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'работа'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'работы'
  return 'работ'
}

const total = computed(() => props.works.length)

const statusCounts = computed(() => {
  const counts: Record<WorkStatus, number> = { planned: 0, in_progress: 0, completed: 0 }
  for (const work of props.works) counts[work.status]++
  return counts
})
</script>

<template>
  <div class="work-summary">
    <p class="text-h3 work-summary__title">
      Работы в проекте
    </p>
    <p class="text-secondary work-summary__count">
      {{ total }} {{ pluralWorks(total) }}
    </p>
    <p class="text-caption text-muted work-summary__breakdown">
      <span v-if="statusCounts.planned">Запланировано {{ statusCounts.planned }}</span>
      <span v-if="statusCounts.in_progress">В работе {{ statusCounts.in_progress }}</span>
      <span v-if="statusCounts.completed">Выполнено {{ statusCounts.completed }}</span>
    </p>
  </div>
</template>

<style scoped>
.work-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-5);
}

.work-summary__title {
  margin: 0;
}

.work-summary__count {
  margin: 0;
}

.work-summary__breakdown {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
</style>
