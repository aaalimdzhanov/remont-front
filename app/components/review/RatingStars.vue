<script setup lang="ts">
// Переиспользуемый примитив рейтинга — readonly (OrderContractorCard,
// ReviewCard) и interactive (CreateReviewSheet). Presentation-only: не
// знает про Review/Order/API, просто рисует до 5 звёзд, залитых по
// значению rating (round), и в interactive-режиме эмитит выбор. Никакой
// сторонней icon-библиотеки — переиспользует UiIcon (см. Icon.vue, 'star'
// path + filled prop, единственное изменение в общей icon-системе).
withDefaults(defineProps<{
  // null — рейтинга ещё нет (0 звёзд закрашено); текст-фоллбэк ("Пока нет
  // отзывов"/"Нет отзывов") — забота вызывающего компонента (см.
  // utils/review.ts contractorRatingLabel), не этого примитива.
  rating: number | null
  interactive?: boolean
  size?: number
}>(), {
  interactive: false,
  size: 20,
})

const emit = defineEmits<{ 'update:rating': [value: number] }>()

function filledUpTo(rating: number | null): number {
  if (rating === null) return 0
  return Math.max(0, Math.min(5, Math.round(rating)))
}

function select(n: number, interactive: boolean) {
  if (interactive) emit('update:rating', n)
}
</script>

<template>
  <div
    class="rating-stars"
    :class="{ 'rating-stars--interactive': interactive }"
    :role="interactive ? 'radiogroup' : 'img'"
    :aria-label="interactive ? 'Оценка' : `Рейтинг ${rating ?? 0} из 5`"
  >
    <component
      :is="interactive ? 'button' : 'span'"
      v-for="n in 5"
      :key="n"
      class="rating-stars__star"
      :class="{ 'rating-stars__star--filled': n <= filledUpTo(rating) }"
      :type="interactive ? 'button' : undefined"
      :role="interactive ? 'radio' : undefined"
      :aria-checked="interactive ? n <= filledUpTo(rating) : undefined"
      :aria-label="interactive ? `${n} из 5` : undefined"
      @click="select(n, interactive ?? false)"
    >
      <UiIcon name="star" :size="size" :filled="n <= filledUpTo(rating)" />
    </component>
  </div>
</template>

<style scoped>
.rating-stars {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.rating-stars__star {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-border-strong);
}

/* Заполненные звёзды — orange accent, пустые — нейтральный контур того же
   цвета, что и остальные border/muted элементы проекта. */
.rating-stars__star--filled {
  color: var(--color-primary);
}

.rating-stars--interactive .rating-stars__star {
  width: 44px;
  height: 44px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  border-radius: var(--radius-input);
}

.rating-stars--interactive .rating-stars__star:hover {
  background: var(--color-surface-subtle);
}
</style>
