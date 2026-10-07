<script setup lang="ts">
// /renovation-estimate — целевая страница CTA "Рассчитать стоимость" с
// /marketplace (см. RenovationEstimateCard.vue). Задача просит ТОЛЬКО
// карточку-вход на главной: сама форма из 5 вопросов, расчёт и backend —
// вне скоупа этой задачи, поэтому пока временный placeholder.
// Без middleware:'auth' — карточка явно обещает "Без регистрации", гость
// должен суметь открыть этот route так же, как и /projects/draft.
definePageMeta({ layout: 'app' })

const { t } = useI18n()
useHead({ title: computed(() => t('marketplace.renovationEstimatePageTitle')) })
</script>

<template>
  <main class="renovation-estimate-page">
    <span class="renovation-estimate-page__icon"><UiIcon name="calculator" :size="28" /></span>
    <h1 class="text-h1 renovation-estimate-page__title">
      {{ t('marketplace.renovationEstimatePageTitle') }}
    </h1>
    <p class="text-secondary renovation-estimate-page__text">
      {{ t('marketplace.renovationEstimatePageComingSoon') }}
    </p>
    <NuxtLink to="/marketplace" class="btn btn-secondary renovation-estimate-page__back">
      <UiIcon name="chevron-left" :size="16" />
      {{ t('marketplaceRequest.backToMarketplace') }}
    </NuxtLink>
  </main>
</template>

<style scoped>
.renovation-estimate-page {
  max-width: 1100px;
  margin: 0 auto;
  min-height: 60vh;
  padding: var(--space-16) var(--space-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
}

.renovation-estimate-page__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  margin-bottom: var(--space-2);
}

.renovation-estimate-page__title {
  margin: 0;
}

.renovation-estimate-page__text {
  margin: 0;
  max-width: 40ch;
}

.renovation-estimate-page__back {
  margin-top: var(--space-3);
  min-height: 44px;
}
</style>
