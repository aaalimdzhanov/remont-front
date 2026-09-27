<script setup lang="ts">
// Небольшой summary над списком работ (Screen 6) — только количество работ +
// разбивка по статусам. Сознательно НЕ суммирует quantity разных unit'ов
// (38.4 м² + 4 шт бессмысленно, см. задание, секция PROJECT SUMMARY).
import type { ProjectWork } from '~/api/types'

type WorkStatus = ProjectWork['status']

const props = defineProps<{ works: ProjectWork[] }>()

const { t } = useI18n()

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
      {{ t('builder.workBuilder.summaryTitle') }}
    </p>
    <p class="text-secondary work-summary__count">
      {{ t('builder.workBuilder.worksCount', { count: total }, total) }}
    </p>
    <p class="text-caption text-muted work-summary__breakdown">
      <span v-if="statusCounts.planned">{{ statusLabel('planned', t) }} {{ statusCounts.planned }}</span>
      <span v-if="statusCounts.in_progress">{{ statusLabel('in_progress', t) }} {{ statusCounts.in_progress }}</span>
      <span v-if="statusCounts.completed">{{ statusLabel('completed', t) }} {{ statusCounts.completed }}</span>
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
