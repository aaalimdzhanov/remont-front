<script setup lang="ts">
// Небольшой summary над списком работ (Screen 6) — только количество работ +
// разбивка. Сознательно НЕ суммирует quantity разных unit'ов (38.4 м² + 4 шт
// бессмысленно, см. задание, секция PROJECT SUMMARY).
//
// mode='authenticated' (по умолчанию) — разбивка по status, как и раньше,
// без единого изменения поведения. mode='guest' — у guest-работ status нет
// вообще (см. ProjectWorkCard.vue), поэтому вместо него показывается
// разбивка по unit (м²/м/шт отдельными суммами — см. задание, секция
// SUMMARY: "Не суммировать несовместимые units").
import type { WorkBuilderMode, WorkStatus, WorkUnit } from '~/api/types'

interface SummaryWork {
  quantity: number
  unit: WorkUnit
  status?: WorkStatus
}

const props = withDefaults(defineProps<{ works: SummaryWork[], mode?: WorkBuilderMode }>(), {
  mode: 'authenticated',
})

const { t } = useI18n()

const total = computed(() => props.works.length)

const statusCounts = computed(() => {
  const counts: Record<WorkStatus, number> = { planned: 0, in_progress: 0, completed: 0 }
  for (const work of props.works) {
    if (work.status) counts[work.status]++
  }
  return counts
})

const UNIT_LABEL_KEY: Record<WorkUnit, string> = {
  m2: 'builder.workBuilder.summaryArea',
  m: 'builder.workBuilder.summaryLength',
  pcs: 'builder.workBuilder.summaryCount',
}

const unitTotals = computed(() => {
  const totals = new Map<WorkUnit, number>()
  for (const work of props.works) {
    totals.set(work.unit, (totals.get(work.unit) ?? 0) + work.quantity)
  }
  return Array.from(totals.entries()).map(([unit, quantity]) => ({
    unit,
    label: t(UNIT_LABEL_KEY[unit]),
    text: formatQuantity(quantity, unit, t),
  }))
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

    <p v-if="mode === 'authenticated'" class="text-caption text-muted work-summary__breakdown">
      <span v-if="statusCounts.planned">{{ statusLabel('planned', t) }} {{ statusCounts.planned }}</span>
      <span v-if="statusCounts.in_progress">{{ statusLabel('in_progress', t) }} {{ statusCounts.in_progress }}</span>
      <span v-if="statusCounts.completed">{{ statusLabel('completed', t) }} {{ statusCounts.completed }}</span>
    </p>
    <p v-else class="text-caption text-muted work-summary__breakdown">
      <span v-for="row in unitTotals" :key="row.unit">{{ row.label }}: {{ row.text }}</span>
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
