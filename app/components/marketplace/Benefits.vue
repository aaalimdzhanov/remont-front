<script setup lang="ts">
// Три статичных "преимущества" под Hero (UI/UX v2). Чисто UI — никакой
// новой бизнес-логики, никаких API-вызовов, ничего не выдумано про backend:
// это маркетинговые тезисы о продукте, а не отображение каких-либо данных.
interface Benefit {
  icon: 'check' | 'coins' | 'star'
  titleKey: string
  descriptionKey: string
}

const { t } = useI18n()

const items: Benefit[] = [
  { icon: 'check', titleKey: 'marketplace.benefitRealOrdersTitle', descriptionKey: 'marketplace.benefitRealOrdersDesc' },
  { icon: 'coins', titleKey: 'marketplace.benefitTransparentTitle', descriptionKey: 'marketplace.benefitTransparentDesc' },
  { icon: 'star', titleKey: 'marketplace.benefitRatingTitle', descriptionKey: 'marketplace.benefitRatingDesc' },
]
</script>

<template>
  <ul class="marketplace-benefits">
    <li v-for="item in items" :key="item.titleKey" class="marketplace-benefits__item">
      <span class="marketplace-benefits__icon" aria-hidden="true">
        <UiIcon :name="item.icon" :size="18" />
      </span>
      <span class="marketplace-benefits__text">
        <span class="marketplace-benefits__title">{{ t(item.titleKey) }}</span>
        <span class="marketplace-benefits__description text-caption text-muted">{{ t(item.descriptionKey) }}</span>
      </span>
    </li>
  </ul>
</template>

<style scoped>
/* Mobile: один swipe-carousel с scroll-snap — каждая карточка занимает
   почти всю ширину экрана (calc(100% - 40px)), так что на экране всегда
   видна РОВНО одна полная карточка + небольшой (~24px) НАМЕРЕННЫЙ "peek"
   следующей — явный сигнал "здесь можно swipe", а не случайно обрезанный
   край (см. задание, секция 4: "никаких случайных 3-5px обрезанных
   элементов"). scroll-snap-type останавливает прокрутку ровно на границе
   карточки, а не где попало. */
.marketplace-benefits {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  padding: 2px;
  margin: 0;
}

.marketplace-benefits::-webkit-scrollbar {
  display: none;
}

.marketplace-benefits__item {
  flex: 0 0 calc(100% - 40px);
  scroll-snap-align: start;
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.marketplace-benefits__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.marketplace-benefits__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.marketplace-benefits__title {
  font-size: var(--font-small-size);
  font-weight: 600;
  color: var(--color-text);
}

.marketplace-benefits__description {
  line-height: var(--font-caption-line);
}

@media (min-width: 640px) {
  .marketplace-benefits {
    overflow-x: visible;
  }

  .marketplace-benefits__item {
    flex: 1;
    width: auto;
  }
}
</style>
