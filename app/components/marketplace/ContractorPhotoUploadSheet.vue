<script setup lang="ts">
// Sheet "Фото профиля" (Contractor Profile Photo v1) — та же оболочка
// overlay/panel и тот же file-picker/drag&drop/preview механизм, что и
// PortfolioUploadSheet.vue (см. задание, секция 7: "показать preview...
// не отправлять сразу"), упрощённый: здесь только один файл, без
// title/description (фото профиля не имеет подписи). Предварительная
// валидация — utils/contractorPhoto.ts validateContractorPhotoFile(), те же
// РЕАЛЬНЫЕ backend-лимиты (5MB, jpeg/png/webp — см. maxProfilePhotoBytes в
// contractor_photo_handler.go), backend всё равно перепроверит настоящие
// magic bytes — это только честная подсказка до отправки.
import { validateContractorPhotoFile } from '~/utils/contractorPhoto'

const props = defineProps<{
  open: boolean
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  submit: [file: File]
  cancel: []
}>()

const { t } = useI18n()

const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const fileError = ref<string | null>(null)
const isDraggingOver = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)

// Освобождение object URL (см. задание, секция 19: "не создавать memory
// leak при многократной замене фотографии") — тот же приём, что и
// PortfolioUploadSheet.vue: revoke при замене файла, при закрытии/сбросе
// формы и при размонтировании компонента.
function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}

function resetForm() {
  clearPreview()
  selectedFile.value = null
  fileError.value = null
  isDraggingOver.value = false
  if (fileInputEl.value) fileInputEl.value.value = ''
}

// Сброс только на ОТКРЫТИЕ, не на закрытие (тот же паттерн, что
// PortfolioUploadSheet.vue) — при ошибке отправки sheet остаётся открытым с
// уже выбранным файлом, пользователю не нужно выбирать его заново.
watch(() => props.open, (isOpen) => {
  if (isOpen) resetForm()
})

function applyFile(file: File) {
  const validationError = validateContractorPhotoFile(file, t)
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

const isValid = computed(() => selectedFile.value !== null)

function handleSubmit() {
  if (!isValid.value || props.submitting || !selectedFile.value) return
  emit('submit', selectedFile.value)
}

onUnmounted(clearPreview)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="contractor-photo-sheet__overlay" @click.self="!submitting && emit('cancel')">
      <div class="contractor-photo-sheet__panel" role="dialog" aria-modal="true" :aria-label="t('contractorProfile.uploadPhotoTitle')">
        <div class="contractor-photo-sheet__handle" aria-hidden="true" />
        <h3 class="contractor-photo-sheet__title">
          {{ t('contractorProfile.uploadPhotoTitle') }}
        </h3>

        <form class="contractor-photo-sheet__form" @submit.prevent="handleSubmit">
          <input
            id="contractor-photo-file-input"
            ref="fileInputEl"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="contractor-photo-sheet__native-input"
            :disabled="submitting"
            @change="handleFileInputChange"
          >

          <div v-if="!previewUrl" class="contractor-photo-sheet__dropzone-wrap">
            <label
              for="contractor-photo-file-input"
              class="contractor-photo-sheet__dropzone"
              :class="{ 'contractor-photo-sheet__dropzone--over': isDraggingOver }"
              @click.prevent="openFilePicker"
              @dragover.prevent="isDraggingOver = true"
              @dragleave.prevent="isDraggingOver = false"
              @drop.prevent="handleDrop"
            >
              <UiIcon name="user" :size="28" class="contractor-photo-sheet__dropzone-icon" />
              <span class="contractor-photo-sheet__dropzone-text">
                {{ t('portfolio.dropzoneText') }} <span class="contractor-photo-sheet__dropzone-link">{{ t('portfolio.chooseFile') }}</span>
              </span>
              <span class="text-caption text-muted">{{ t('contractorProfile.photoFormatsHint') }}</span>
            </label>
          </div>

          <div v-else class="contractor-photo-sheet__preview">
            <img :src="previewUrl" alt="" class="contractor-photo-sheet__preview-img">
            <button
              type="button"
              class="contractor-photo-sheet__preview-remove"
              :aria-label="t('portfolio.removePhotoAriaLabel')"
              :disabled="submitting"
              @click="handleRemoveFile"
            >
              <UiIcon name="close" :size="16" />
            </button>
          </div>

          <p v-if="fileError" class="contractor-photo-sheet__field-error">
            {{ fileError }}
          </p>

          <p v-if="error" class="contractor-photo-sheet__error">
            {{ error }}
          </p>

          <div class="contractor-photo-sheet__actions">
            <button type="button" class="btn btn-secondary" :disabled="submitting" @click="emit('cancel')">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn btn-primary" :disabled="!isValid || submitting">
              {{ submitting ? t('common.saving') : t('common.save') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.contractor-photo-sheet__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.contractor-photo-sheet__panel {
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

.contractor-photo-sheet__handle {
  align-self: center;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  margin-bottom: var(--space-3);
}

.contractor-photo-sheet__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 var(--space-4);
}

.contractor-photo-sheet__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.contractor-photo-sheet__native-input {
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

.contractor-photo-sheet__dropzone-wrap {
  min-width: 0;
}

.contractor-photo-sheet__dropzone {
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

.contractor-photo-sheet__dropzone:hover,
.contractor-photo-sheet__dropzone--over {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.contractor-photo-sheet__dropzone-icon {
  color: var(--color-text-muted);
}

.contractor-photo-sheet__dropzone-text {
  color: var(--color-text-secondary);
  font-size: var(--font-small-size);
}

.contractor-photo-sheet__dropzone-link {
  color: var(--color-primary);
  font-weight: 500;
}

/* Круглый preview — фото профиля круглое везде (см. ContractorAvatar.vue),
   sheet должен честно показывать, как оно и будет выглядеть, а не
   прямоугольный кроп как у Portfolio. */
.contractor-photo-sheet__preview {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-surface-subtle);
}

.contractor-photo-sheet__preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.contractor-photo-sheet__preview-remove {
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

.contractor-photo-sheet__field-error {
  margin: calc(var(--space-2) * -1) 0 0;
  color: var(--color-error);
  font-size: var(--font-caption-size);
  text-align: center;
}

.contractor-photo-sheet__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
  overflow-wrap: break-word;
}

.contractor-photo-sheet__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.contractor-photo-sheet__actions .btn {
  width: 100%;
  height: 48px;
}

@media (min-width: 768px) {
  .contractor-photo-sheet__overlay {
    align-items: center;
  }

  .contractor-photo-sheet__panel {
    border-radius: var(--radius-modal);
    padding-bottom: var(--space-6);
  }

  .contractor-photo-sheet__actions {
    flex-direction: row;
    justify-content: flex-end;
  }

  .contractor-photo-sheet__actions .btn {
    width: auto;
  }
}
</style>
