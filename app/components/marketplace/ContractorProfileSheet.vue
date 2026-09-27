<script setup lang="ts">
// Минимальная форма создания Contractor-профиля — та же оболочка, что и
// CreateOfferSheet.vue/SortSheet.vue. Показывается только один раз, перед
// первым в жизни "Предложить цену" (GET /api/v1/contractor вернул 404, см.
// useMarketplace.ts/contractor.ts). Поля — ровно createContractorRequest
// backend'а (name/description/phone), ничего лишнего (не marketplace-профиль
// с портфолио/рейтингом — это следующий этап, см. задание секция 20).
const props = defineProps<{ open: boolean, submitting: boolean, error: string | null }>()
const emit = defineEmits<{ submit: [name: string, description: string, phone: string], cancel: [] }>()

const { t } = useI18n()

const name = ref('')
const description = ref('')
const phone = ref('+998')

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    name.value = ''
    description.value = ''
    phone.value = '+998'
  }
})

const isValid = computed(() => name.value.trim() !== '' && phone.value.trim() !== '')

function handleSubmit() {
  if (!isValid.value || props.submitting) return
  emit('submit', name.value.trim(), description.value.trim(), phone.value.trim())
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="contractor-sheet__overlay" @click.self="emit('cancel')">
      <div class="contractor-sheet__panel" role="dialog" aria-modal="true" :aria-label="t('contractorProfile.createProfileTitle')">
        <div class="contractor-sheet__handle" aria-hidden="true" />
        <h3 class="contractor-sheet__title">
          {{ t('contractorProfile.createProfileTitle') }}
        </h3>
        <p class="text-secondary contractor-sheet__hint">
          {{ t('contractorProfile.createProfileHint') }}
        </p>

        <form class="contractor-sheet__form" @submit.prevent="handleSubmit">
          <label class="field">
            <span class="field__label">{{ t('contractorProfile.nameLabel') }}</span>
            <input v-model="name" type="text" class="input" :placeholder="t('contractorProfile.namePlaceholder')" :disabled="submitting" autofocus>
          </label>

          <label class="field">
            <span class="field__label">{{ t('contractorProfile.phoneLabel') }}</span>
            <input v-model="phone" type="tel" inputmode="tel" class="input" :placeholder="t('contractorProfile.phonePlaceholder')" :disabled="submitting">
          </label>

          <label class="field">
            <span class="field__label">{{ t('contractorProfile.aboutLabel') }}</span>
            <textarea
              v-model="description"
              class="input contractor-sheet__description"
              rows="3"
              :placeholder="t('contractorProfile.aboutPlaceholder')"
              :disabled="submitting"
            />
          </label>

          <p v-if="error" class="contractor-sheet__error">
            {{ error }}
          </p>

          <button type="submit" class="btn btn-primary contractor-sheet__submit" :disabled="!isValid || submitting">
            {{ submitting ? t('common.saving') : t('contractorProfile.createProfile') }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.contractor-sheet__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.contractor-sheet__panel {
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

.contractor-sheet__handle {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  margin-bottom: var(--space-3);
}

.contractor-sheet__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.contractor-sheet__hint {
  margin: var(--space-1) 0 var(--space-4);
}

.contractor-sheet__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.contractor-sheet__description {
  height: auto;
  padding: var(--space-3);
  resize: vertical;
  font-family: var(--font-family);
}

.contractor-sheet__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}

.contractor-sheet__submit {
  width: 100%;
  height: 48px;
}

@media (min-width: 768px) {
  .contractor-sheet__overlay {
    align-items: center;
  }

  .contractor-sheet__panel {
    border-radius: var(--radius-modal);
    padding-bottom: var(--space-6);
  }
}
</style>
