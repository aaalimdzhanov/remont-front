<script setup lang="ts">
// Bottom sheet "Оставить отзыв" — та же оболочка overlay+panel+handle, что и
// CreateOfferSheet.vue/AddServiceSheet.vue (см. задание, секция REVIEW FORM:
// "используй существующий bottom-sheet подход"). title приходит снаружи
// (см. pages/orders/[id].vue) — "Оставить отзыв мастеру"/"...клиенту" решает
// вызывающая страница через useUserMode(), сам sheet ничего не знает про
// client/contractor.
const props = defineProps<{ open: boolean, title: string, submitting: boolean, error: string | null }>()
const emit = defineEmits<{ submit: [rating: number, comment: string], cancel: [] }>()

const rating = ref(0)
const comment = ref('')

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    rating.value = 0
    comment.value = ''
  }
})

const commentLength = computed(() => comment.value.length)
const isRatingValid = computed(() => isValidRating(rating.value))
const isCommentValid = computed(() => isValidCommentLength(comment.value))
const isValid = computed(() => isRatingValid.value && isCommentValid.value)

function handleSubmit() {
  if (!isValid.value || props.submitting) return
  emit('submit', rating.value, normalizeReviewComment(comment.value) ?? '')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="create-review-sheet__overlay" @click.self="emit('cancel')">
      <div class="create-review-sheet__panel" role="dialog" aria-modal="true" :aria-label="title">
        <div class="create-review-sheet__handle" aria-hidden="true" />
        <h3 class="create-review-sheet__title">
          {{ title }}
        </h3>

        <form class="create-review-sheet__form" @submit.prevent="handleSubmit">
          <div class="field create-review-sheet__rating-field">
            <span class="field__label">Оценка</span>
            <ReviewRatingStars :rating="rating" interactive :size="32" @update:rating="rating = $event" />
          </div>

          <label class="field">
            <span class="field__label">Комментарий (необязательно)</span>
            <textarea
              v-model="comment"
              class="input create-review-sheet__comment"
              rows="4"
              maxlength="2000"
              placeholder="Расскажите, как прошла работа"
              :disabled="submitting"
            />
            <span class="text-caption text-muted create-review-sheet__counter">{{ commentLength }}/2000</span>
          </label>

          <p v-if="error" class="create-review-sheet__error">
            {{ error }}
          </p>

          <button type="submit" class="btn btn-primary create-review-sheet__submit" :disabled="!isValid || submitting">
            {{ submitting ? 'Отправляем…' : 'Оставить отзыв' }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.create-review-sheet__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.create-review-sheet__panel {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface);
  border-top-left-radius: var(--radius-modal);
  border-top-right-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  padding: var(--space-3) var(--space-6) var(--space-6);
  padding-bottom: max(var(--space-6), env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.create-review-sheet__handle {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  margin-bottom: var(--space-3);
}

.create-review-sheet__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 var(--space-4);
}

.create-review-sheet__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.create-review-sheet__rating-field {
  align-items: flex-start;
}

.create-review-sheet__comment {
  height: auto;
  padding: var(--space-3);
  resize: vertical;
  font-family: var(--font-family);
}

.create-review-sheet__counter {
  align-self: flex-end;
}

.create-review-sheet__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}

.create-review-sheet__submit {
  width: 100%;
  height: 48px;
}

@media (min-width: 768px) {
  .create-review-sheet__overlay {
    align-items: center;
  }

  .create-review-sheet__panel {
    border-radius: var(--radius-modal);
    padding-bottom: var(--space-6);
  }
}
</style>
