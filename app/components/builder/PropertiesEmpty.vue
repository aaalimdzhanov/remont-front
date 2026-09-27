<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="properties__empty">
    <UiIcon name="select" :size="28" />
    <div>
      <p class="text-body-lg" style="color: var(--color-text);">
        {{ t('builder.selectObject') }}
      </p>
      <p class="text-small">
        {{ t('builder.selectObjectHint') }}
      </p>
    </div>
  </div>
</template>
