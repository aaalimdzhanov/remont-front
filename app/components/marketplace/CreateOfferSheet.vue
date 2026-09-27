<script setup lang="ts">
// Bottom sheet "Предложить цену" — та же визуальная оболочка, что и
// ProjectsSortSheet.vue (overlay + панель, прижатая к низу на mobile,
// центрированная на desktop). price — ЦЕЛОЕ число (backend: int64/Postgres
// NUMERIC без дробной части, единая валюта проекта — см. api/types.ts) —
// input принудительно целочисленный (step="1"), и перед emit значение
// дополнительно прогоняется через Math.round(), чтобы дробная часть точно
// никогда не ушла в API, даже если браузер/локаль пропустит "," или ".".
const props = defineProps<{ open: boolean, submitting: boolean, error: string | null }>()
const emit = defineEmits<{ submit: [price: number, comment: string], cancel: [] }>()

const { t } = useI18n()

// ref('') стартует строкой, но Vue у <input type="number"> кастит v-model в
// число автоматически при любом реальном вводе (vModelText: el.type==='number'
// включает castToNumber ВСЕГДА, даже без модификатора .number) — после ввода
// это уже number, не string. Валидация ниже работает с обоими вариантами, не
// полагаясь на конкретный тип (см. тот же паттерн и тот же баг, исправленный
// ранее в WorkCalculationStep.vue).
const priceInput = ref<string | number>('')
const comment = ref('')

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    priceInput.value = ''
    comment.value = ''
  }
})

const isPriceEmpty = computed(() => priceInput.value === '' || priceInput.value === null)
const priceNumber = computed(() => Math.round(Number(priceInput.value)))
const isPriceValid = computed(() => !isPriceEmpty.value && Number.isFinite(priceNumber.value) && priceNumber.value >= 0)

function handleSubmit() {
  if (!isPriceValid.value || props.submitting) return
  emit('submit', priceNumber.value, comment.value.trim())
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="offer-sheet__overlay" @click.self="emit('cancel')">
      <div class="offer-sheet__panel" role="dialog" aria-modal="true" :aria-label="t('offers.createTitle')">
        <div class="offer-sheet__handle" aria-hidden="true" />
        <h3 class="offer-sheet__title">
          {{ t('offers.createTitle') }}
        </h3>

        <form class="offer-sheet__form" @submit.prevent="handleSubmit">
          <label class="field">
            <span class="field__label">{{ t('offers.priceLabel') }}</span>
            <input
              v-model="priceInput"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="input"
              :class="{ 'input--error': !isPriceEmpty && !isPriceValid }"
              :placeholder="t('offers.pricePlaceholder')"
              :disabled="submitting"
              autofocus
            >
          </label>

          <label class="field">
            <span class="field__label">{{ t('offers.commentLabel') }}</span>
            <textarea
              v-model="comment"
              class="input offer-sheet__comment"
              rows="3"
              :placeholder="t('offers.commentPlaceholder')"
              :disabled="submitting"
            />
          </label>

          <p v-if="error" class="offer-sheet__error">
            {{ error }}
          </p>

          <button type="submit" class="btn btn-primary offer-sheet__submit" :disabled="!isPriceValid || submitting">
            {{ submitting ? t('common.sending') : t('offers.submit') }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.offer-sheet__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.offer-sheet__panel {
  width: 100%;
  max-width: 480px;
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

.offer-sheet__handle {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  margin-bottom: var(--space-3);
}

.offer-sheet__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 var(--space-4);
}

.offer-sheet__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.offer-sheet__comment {
  height: auto;
  padding: var(--space-3);
  resize: vertical;
  font-family: var(--font-family);
}

.offer-sheet__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}

.offer-sheet__submit {
  width: 100%;
  height: 48px;
}

@media (min-width: 768px) {
  .offer-sheet__overlay {
    align-items: center;
  }

  .offer-sheet__panel {
    border-radius: var(--radius-modal);
    padding-bottom: var(--space-6);
  }
}
</style>
