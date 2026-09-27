<script setup lang="ts">
// Screen 1 (empty state) — см. reference image. Простой line-illustration
// в архитектурном стиле (тот же приём, что и empty-sketch на Dashboard/
// ProjectPreview.vue), никакой тяжёлой картинки.
defineEmits<{ add: [] }>()

const { t } = useI18n()
</script>

<template>
  <div class="work-empty">
    <svg class="work-empty__sketch" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="10" y="14" width="76" height="68" rx="3" stroke="var(--color-border-strong)" stroke-width="1.5" />
      <path d="M22 34h52M22 50h52M22 66h30" stroke="var(--color-border-strong)" stroke-width="1.5" stroke-linecap="round" />
      <path d="M22 34l6-10 6 10" stroke="var(--color-primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="60" cy="50" r="3" fill="var(--color-primary)" />
    </svg>

    <h1 class="text-h2 work-empty__title">
      {{ t('builder.workBuilder.emptyTitle') }}
    </h1>
    <p class="text-secondary work-empty__description">
      {{ t('builder.workBuilder.emptyDescription') }}
    </p>

    <ul class="work-empty__benefits">
      <li>
        <UiIcon name="check" :size="16" />
        {{ t('builder.workBuilder.benefitAutoCalc') }}
      </li>
      <li>
        <UiIcon name="check" :size="16" />
        {{ t('builder.workBuilder.benefitEasyPick') }}
      </li>
      <li>
        <UiIcon name="check" :size="16" />
        {{ t('builder.workBuilder.benefitFindContractors') }}
      </li>
    </ul>

    <button type="button" class="btn btn-primary work-empty__cta" @click="$emit('add')">
      <UiIcon name="plus" :size="16" />
      {{ t('builder.workBuilder.addWork') }}
    </button>
  </div>
</template>

<style scoped>
.work-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
  padding: var(--space-8) var(--space-4) var(--space-12);
}

.work-empty__sketch {
  width: 96px;
  height: 96px;
}

.work-empty__title {
  margin: 0;
}

.work-empty__description {
  max-width: 320px;
}

.work-empty__benefits {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
  text-align: left;
}

.work-empty__benefits li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
}

.work-empty__benefits :deep(svg) {
  color: var(--color-success);
  flex-shrink: 0;
}

.work-empty__cta {
  width: 100%;
  max-width: 320px;
  height: 48px;
  margin-top: var(--space-4);
}
</style>
