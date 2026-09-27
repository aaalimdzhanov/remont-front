<script setup lang="ts">
// Полноэкранный просмотр фото работы — по клику на карточку в
// MarketplacePortfolioGrid.vue (и owner, и публичный профиль). Тот же
// overlay-паттерн, что и UiConfirmDialog (Teleport + click-outside через
// @click.self), плюс Escape — см. задание, секция PUBLIC IMAGE VIEWER.
// Никакой сложной gallery/swipe-между-фото системы не делаем (задание,
// секция 15: "не добавлять сложную gallery систему без необходимости") —
// один item за раз, открыли/закрыли.
import { portfolioImageAlt } from '~/utils/portfolio'

const props = defineProps<{
  item: { imageUrl: string, title: string, description: string } | null
}>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

watch(() => props.item, (value) => {
  if (value) window.addEventListener('keydown', handleKeydown)
  else window.removeEventListener('keydown', handleKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="item" class="portfolio-viewer__overlay" @click.self="emit('close')">
      <button type="button" class="portfolio-viewer__close" :aria-label="t('common.close')" @click="emit('close')">
        <UiIcon name="close" :size="20" />
      </button>

      <figure class="portfolio-viewer__figure">
        <img :src="item.imageUrl" :alt="portfolioImageAlt(item.title, t)" class="portfolio-viewer__image">
        <figcaption v-if="item.title || item.description" class="portfolio-viewer__caption">
          <p v-if="item.title" class="portfolio-viewer__caption-title">
            {{ item.title }}
          </p>
          <p v-if="item.description" class="portfolio-viewer__caption-description">
            {{ item.description }}
          </p>
        </figcaption>
      </figure>
    </div>
  </Teleport>
</template>

<style scoped>
.portfolio-viewer__overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 16, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 110;
  box-sizing: border-box;
}

.portfolio-viewer__close {
  position: fixed;
  top: max(var(--space-4), env(safe-area-inset-top));
  right: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
}

.portfolio-viewer__figure {
  margin: 0;
  max-width: min(100%, 720px);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.portfolio-viewer__image {
  max-width: 100%;
  max-height: 75vh;
  border-radius: var(--radius-card);
  object-fit: contain;
  display: block;
}

.portfolio-viewer__caption {
  margin-top: var(--space-3);
  text-align: center;
  color: #fff;
  max-width: 100%;
}

.portfolio-viewer__caption-title {
  margin: 0;
  font-weight: 600;
  overflow-wrap: break-word;
}

.portfolio-viewer__caption-description {
  margin: var(--space-1) 0 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: var(--font-small-size);
  overflow-wrap: break-word;
}
</style>
