<script setup lang="ts">
// Sheet "Добавить работу" — та же оболочка overlay/panel, что и
// AddServiceSheet.vue/ContractorProfileSheet.vue (см. задание, секция
// UPLOAD UI: "использовать существующий modal pattern"). Файл выбирается
// либо через нативный <input type="file"> (клик по зоне — работает и на
// mobile, открывает системный picker/камеру), либо перетаскиванием на
// desktop (HTML5 file drag&drop — не путать с drag-reorder карточек в
// MarketplacePortfolioGrid.vue, это два разных механизма: здесь браузер
// сам обрабатывает OS-level file drag, ничего кастомного).
//
// Предварительная валидация (тип/размер) — см. utils/portfolio.ts
// validatePortfolioImageFile(), те же лимиты, что реально проверяет backend
// (не выдуманные). Backend всё равно перепроверит реальные magic bytes —
// это только честная подсказка пользователю до отправки.
import { PORTFOLIO_MAX_DESCRIPTION_LENGTH, PORTFOLIO_MAX_TITLE_LENGTH, validatePortfolioImageFile } from '~/utils/portfolio'

const props = defineProps<{
  open: boolean
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  submit: [payload: { file: File, title: string, description: string }]
  cancel: []
}>()

const { t } = useI18n()

const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const fileError = ref<string | null>(null)
const title = ref('')
const description = ref('')
const isDraggingOver = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)

function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}

function resetForm() {
  clearPreview()
  selectedFile.value = null
  fileError.value = null
  title.value = ''
  description.value = ''
  isDraggingOver.value = false
  if (fileInputEl.value) fileInputEl.value.value = ''
}

// Сбрасываем только на ОТКРЫТИЕ (тот же паттерн, что AddServiceSheet.vue) —
// НЕ на закрытие: при ошибке отправки диалог остаётся открытым, а
// введённые title/description/выбранный файл не должны стираться (см.
// задание, секция UPLOAD STATE: "при ошибке... введённые title/description
// не теряются").
watch(() => props.open, (isOpen) => {
  if (isOpen) resetForm()
})

// Если пользователь выбирает другой файл — старый preview заменяется (см.
// задание, секция IMAGE PREVIEW).
function applyFile(file: File) {
  const validationError = validatePortfolioImageFile(file, t)
  if (validationError) {
    fileError.value = validationError
    return
  }
  clearPreview()
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  fileError.value = null
}

function handleFileInputChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) applyFile(file)
}

function handleDrop(event: DragEvent) {
  isDraggingOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) applyFile(file)
}

function openFilePicker() {
  fileInputEl.value?.click()
}

function handleRemoveFile() {
  clearPreview()
  selectedFile.value = null
  fileError.value = null
  if (fileInputEl.value) fileInputEl.value.value = ''
}

const titleValid = computed(() => title.value.length <= PORTFOLIO_MAX_TITLE_LENGTH)
const descriptionValid = computed(() => description.value.length <= PORTFOLIO_MAX_DESCRIPTION_LENGTH)
const isValid = computed(() => selectedFile.value !== null && titleValid.value && descriptionValid.value)

function handleSubmit() {
  if (!isValid.value || props.submitting || !selectedFile.value) return
  emit('submit', { file: selectedFile.value, title: title.value.trim(), description: description.value.trim() })
}

onUnmounted(clearPreview)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="portfolio-upload-sheet__overlay" @click.self="!submitting && emit('cancel')">
      <div class="portfolio-upload-sheet__panel" role="dialog" aria-modal="true" :aria-label="t('portfolio.addWorkTitle')">
        <div class="portfolio-upload-sheet__handle" aria-hidden="true" />
        <h3 class="portfolio-upload-sheet__title">
          {{ t('portfolio.addWorkTitle') }}
        </h3>

        <form class="portfolio-upload-sheet__form" @submit.prevent="handleSubmit">
          <input
            id="portfolio-upload-file-input"
            ref="fileInputEl"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="portfolio-upload-sheet__native-input"
            :disabled="submitting"
            @change="handleFileInputChange"
          >

          <div v-if="!previewUrl" class="portfolio-upload-sheet__dropzone-wrap">
            <label
              for="portfolio-upload-file-input"
              class="portfolio-upload-sheet__dropzone"
              :class="{ 'portfolio-upload-sheet__dropzone--over': isDraggingOver }"
              @click.prevent="openFilePicker"
              @dragover.prevent="isDraggingOver = true"
              @dragleave.prevent="isDraggingOver = false"
              @drop.prevent="handleDrop"
            >
              <UiIcon name="camera" :size="28" class="portfolio-upload-sheet__dropzone-icon" />
              <span class="portfolio-upload-sheet__dropzone-text">
                {{ t('portfolio.dropzoneText') }} <span class="portfolio-upload-sheet__dropzone-link">{{ t('portfolio.chooseFile') }}</span>
              </span>
              <span class="text-caption text-muted">{{ t('portfolio.supportedFormats') }}</span>
            </label>
          </div>

          <div v-else class="portfolio-upload-sheet__preview">
            <img :src="previewUrl" alt="" class="portfolio-upload-sheet__preview-img">
            <button
              type="button"
              class="portfolio-upload-sheet__preview-remove"
              :aria-label="t('portfolio.removePhotoAriaLabel')"
              :disabled="submitting"
              @click="handleRemoveFile"
            >
              <UiIcon name="close" :size="16" />
            </button>
          </div>

          <p v-if="fileError" class="portfolio-upload-sheet__field-error">
            {{ fileError }}
          </p>

          <label class="field">
            <span class="field__label">{{ t('portfolio.titleLabel') }}</span>
            <input
              v-model="title"
              type="text"
              class="input"
              :class="{ 'input--error': !titleValid }"
              :placeholder="t('portfolio.titlePlaceholder')"
              :maxlength="PORTFOLIO_MAX_TITLE_LENGTH"
              :disabled="submitting"
            >
          </label>

          <label class="field">
            <span class="field__label">{{ t('portfolio.descriptionLabel') }}</span>
            <textarea
              v-model="description"
              class="input portfolio-upload-sheet__description"
              rows="3"
              :class="{ 'input--error': !descriptionValid }"
              :placeholder="t('portfolio.descriptionPlaceholder')"
              :maxlength="PORTFOLIO_MAX_DESCRIPTION_LENGTH"
              :disabled="submitting"
            />
          </label>

          <p v-if="error" class="portfolio-upload-sheet__error">
            {{ error }}
          </p>

          <div class="portfolio-upload-sheet__actions">
            <button type="button" class="btn btn-secondary" :disabled="submitting" @click="emit('cancel')">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn btn-primary" :disabled="!isValid || submitting">
              {{ submitting ? t('common.adding') : t('portfolio.addSubmit') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.portfolio-upload-sheet__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.portfolio-upload-sheet__panel {
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
  box-sizing: border-box;
}

.portfolio-upload-sheet__handle {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  margin-bottom: var(--space-3);
}

.portfolio-upload-sheet__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 var(--space-4);
}

.portfolio-upload-sheet__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.portfolio-upload-sheet__native-input {
  /* Скрыт визуально, но доступен для screen reader/label-клика — не
     display:none (тогда клик по <label for> не открывал бы picker в
     некоторых браузерах последовательно с кастомной стилизацией). */
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.portfolio-upload-sheet__dropzone-wrap {
  min-width: 0;
}

.portfolio-upload-sheet__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  text-align: center;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.portfolio-upload-sheet__dropzone:hover,
.portfolio-upload-sheet__dropzone--over {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.portfolio-upload-sheet__dropzone-icon {
  color: var(--color-text-muted);
}

.portfolio-upload-sheet__dropzone-text {
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
}

.portfolio-upload-sheet__dropzone-link {
  color: var(--color-primary);
  font-weight: 500;
}

.portfolio-upload-sheet__preview {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--color-surface-subtle);
}

.portfolio-upload-sheet__preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.portfolio-upload-sheet__preview-remove {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(37, 37, 37, 0.55);
  color: #fff;
  cursor: pointer;
}

.portfolio-upload-sheet__field-error {
  margin: calc(var(--space-2) * -1) 0 0;
  color: var(--color-error);
  font-size: var(--font-caption-size);
}

.portfolio-upload-sheet__description {
  height: auto;
  padding: var(--space-3);
  resize: vertical;
  font-family: var(--font-family);
}

.portfolio-upload-sheet__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
  overflow-wrap: break-word;
}

.portfolio-upload-sheet__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.portfolio-upload-sheet__actions .btn {
  width: 100%;
  height: 48px;
}

@media (min-width: 768px) {
  .portfolio-upload-sheet__overlay {
    align-items: center;
  }

  .portfolio-upload-sheet__panel {
    border-radius: var(--radius-modal);
    padding-bottom: var(--space-6);
  }

  .portfolio-upload-sheet__actions {
    flex-direction: row;
    justify-content: flex-end;
  }

  .portfolio-upload-sheet__actions .btn {
    width: auto;
  }
}
</style>
