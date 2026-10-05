<script setup lang="ts">
// /marketplace/contractor — полноценный профиль исполнителя: create/edit +
// "Мои услуги" (ContractorService CRUD). Отдельная страница, а не bottom
// sheet (см. задание, секция 3: "если форма большая и содержит services —
// предпочтительно отдельная страница"). ContractorProfileSheet.vue
// (быстрое создание профиля перед первым офером, см. requests/[id].vue)
// остаётся как есть — эта страница его не заменяет и не трогает.
//
// identity-поля (user_id/contractor_id) нигде в форме не появляются — они
// всегда определяются backend'ом из auth-контекста (см. api/contractor.ts).
// status тоже не редактируется: backend не даёт update-путь для него в v1
// (см. contractor_dto.go), поэтому здесь только read-only подпись.
import type { ContractorService, PortfolioItem } from '~/api/types'

// layout:'app' — тот же общий AppHeader.vue, что и на /orders и /reviews (см.
// правку "Header consistency"): раньше страница рисовала собственный
// back-link "← Биржа заявок"+AppProfileMenu+AppModeNav вместо общего header —
// единственная точка возврата в публичную биржу теперь логотип (AppHeader),
// не текстовая стрелка.
definePageMeta({ middleware: 'auth', layout: 'app' })

const { t } = useI18n()
useHead({ title: computed(() => t('contractorProfile.title')) })

const {
  contractor, contractorLoading, contractorError,
  isSavingContractor, saveContractorError,
  isUploadingContractorPhoto, uploadContractorPhotoError,
  isDeletingContractorPhoto, deleteContractorPhotoError,
  services, servicesLoading, servicesError,
  isAddingService, addServiceError,
  serviceActionId, serviceActionError,
  portfolio, portfolioLoading, portfolioError,
  isUploadingPortfolio, uploadPortfolioError,
  portfolioActionId, portfolioActionError,
  isReorderingPortfolio, reorderPortfolioError,
  catalogCategories, catalogCategoriesLoading, catalogWorkTypes,
  loadContractor, updateContractorProfile, createContractorProfile,
  uploadContractorPhoto, deleteContractorPhoto,
  loadServices, addService, updateService, deleteService,
  loadPortfolio, uploadPortfolio, deletePortfolio, reorderPortfolio,
  loadFilterCatalog,
} = useMarketplace()

const name = ref('')
const description = ref('')
const phone = ref('+998')
const saveSuccess = ref(false)

// Профиль ещё не проверялся (undefined) либо уже загружен — форма
// заполняется реальными данными профиля один раз при их появлении, дальше
// это обычный controlled-form (не перезаписывается повторно при каждом
// ре-рендере, чтобы не затирать то, что пользователь печатает).
const formInitialized = ref(false)
watch(contractor, (value) => {
  if (value && !formInitialized.value) {
    name.value = value.name
    description.value = value.description
    phone.value = value.phone || '+998'
    formInitialized.value = true
  }
}, { immediate: true })

onMounted(async () => {
  void loadFilterCatalog()
  await loadContractor()
  if (contractor.value) {
    void loadServices()
    void loadPortfolio()
  }
})

const isNewProfile = computed(() => contractor.value === null)
const isValid = computed(() => name.value.trim() !== '' && phone.value.trim() !== '')

async function handleSave() {
  if (!isValid.value || isSavingContractor.value || contractorLoading.value) return
  saveSuccess.value = false
  const payload = { name: name.value.trim(), description: description.value.trim(), phone: phone.value.trim() }
  const ok = isNewProfile.value
    ? await createContractorProfile(payload)
    : await updateContractorProfile(payload)
  if (ok) {
    saveSuccess.value = true
    if (contractor.value) {
      void loadServices()
      void loadPortfolio()
    }
  }
}

function contractorStatusLabel(status: string): string {
  return status === 'active' ? t('status.contractor.active') : status === 'inactive' ? t('status.contractor.inactive') : status
}

// ---- Services ----
const showAddServiceSheet = ref(false)
const editingService = ref<ContractorService | null>(null)
const deletingService = ref<ContractorService | null>(null)

const existingWorkTypeIds = computed(() => services.value.map(s => s.workTypeId))

async function handleAddService(payload: { workTypeId: string, priceFrom: number | null, priceTo: number | null }) {
  const created = await addService({ work_type_id: payload.workTypeId, price_from: payload.priceFrom, price_to: payload.priceTo })
  if (created) showAddServiceSheet.value = false
}

async function handleEditServiceSubmit(payload: { priceFrom: number | null, priceTo: number | null }) {
  if (!editingService.value) return
  const ok = await updateService(editingService.value.id, { price_from: payload.priceFrom, price_to: payload.priceTo })
  if (ok) editingService.value = null
}

async function handleConfirmDelete() {
  if (!deletingService.value) return
  const target = deletingService.value
  deletingService.value = null
  await deleteService(target.id)
}

// ---- Portfolio ("Мои работы") ----
const showUploadSheet = ref(false)
const deletingPortfolioItem = ref<PortfolioItem | null>(null)
const viewingPortfolioItem = ref<PortfolioItem | null>(null)

async function handleUploadSubmit(payload: { file: File, title: string, description: string }) {
  const created = await uploadPortfolio(payload.file, payload.title, payload.description)
  if (created) showUploadSheet.value = false
}

async function handleConfirmDeletePortfolio() {
  if (!deletingPortfolioItem.value) return
  const target = deletingPortfolioItem.value
  deletingPortfolioItem.value = null
  await deletePortfolio(target.id)
}

function handleReorderPortfolio(items: PortfolioItem[]) {
  void reorderPortfolio(items)
}

// ---- Profile photo (Contractor Profile Photo v1) ----
// Реальное имя для alt/fallback — то же самое "trim() || fallbackName",
// что уже показывает сама форма ниже (contractor.name.trim() ||
// fallbackName нигде явно не было нужно раньше, т.к. форма всегда
// показывает controlled-input, не read-only имя) — здесь это единственное
// read-only место, где имя нужно как текст (alt изображения).
const contractorDisplayNameValue = computed(() => contractor.value?.name?.trim() || t('contractors.fallbackName'))

const showPhotoSheet = ref(false)
const deletingPhoto = ref(false)

// 413/415 — те же реальные backend-коды, что и readImageUpload()/
// writeContractorPhotoError() на backend (см. utils/contractorPhoto.ts
// шапка) — переопределяем текст ТОЛЬКО для image_too_large: общий
// errors.image_too_large жёстко говорит "10 МБ" (это лимит Portfolio, не
// этой формы, см. utils/contractorPhoto.ts), а у фото профиля лимит 5 МБ.
// Остальные коды (unsupported_media_type/internal_error/session_expired/...)
// уже корректно локализованы централизованно в api/client.ts
// KNOWN_ERROR_KEYS — здесь просто err.message как везде в этой странице.
function photoErrorMessage(err: { code: string, message: string } | null, fallbackKey: string): string | null {
  if (!err) return null
  if (err.code === 'image_too_large') return t('contractorProfile.photoTooLarge')
  if (err.code === 'internal_error') return t(fallbackKey)
  return err.message
}
const uploadPhotoErrorMessage = computed(() => photoErrorMessage(uploadContractorPhotoError.value, 'contractorProfile.photoUploadError'))
const deletePhotoErrorMessage = computed(() => photoErrorMessage(deleteContractorPhotoError.value, 'contractorProfile.photoDeleteError'))

async function handlePhotoUploadSubmit(file: File) {
  const ok = await uploadContractorPhoto(file)
  if (ok) showPhotoSheet.value = false
}

async function handleConfirmDeletePhoto() {
  deletingPhoto.value = false
  await deleteContractorPhoto()
}
</script>

<template>
  <main class="contractor-page">
    <h1 class="text-h1 contractor-page__title">
      {{ t('contractorProfile.title') }}
    </h1>

    <div v-if="contractorLoading && contractor === undefined" class="contractor-page__skeleton" aria-busy="true" />

    <template v-else>
      <!-- Contractor Profile Gate onboarding (см. задание, секция 7): показывается
           только когда GET /contractor реально вернул 404 (contractor===null,
           не undefined) — mode==='contractor' сам по себе ничего не доказывает
           (см. utils/userMode.ts shouldShowContractorOnboarding). -->
      <div v-if="isNewProfile" class="contractor-page__onboarding">
        <div class="contractor-page__onboarding-icon">
          <UiIcon name="hammer" :size="24" />
        </div>
        <p class="text-h3 contractor-page__onboarding-title">
          {{ t('contractorProfile.onboardingTitle') }}
        </p>
        <p class="text-secondary contractor-page__onboarding-desc">
          {{ t('contractorProfile.onboardingDesc') }}
        </p>
      </div>

      <section class="contractor-page__card">
        <div class="contractor-page__avatar-wrap">
          <MarketplaceContractorAvatar
            :photo-url="contractor?.profilePhotoUrl ?? null"
            :name="contractorDisplayNameValue"
            :size="80"
            :icon-size="32"
          />
          <!-- Загрузка/замена/удаление фото возможны только для УЖЕ
               существующего профиля (см. задание, секция 4/11) — backend
               отвечает 404 contractor_not_found без него (см. память
               "Backend: contractor profile photo"), поэтому на onboarding-
               форме (isNewProfile) эти действия не показываются вообще, не
               показываются disabled — их в принципе нельзя выполнить. -->
          <div v-if="!isNewProfile" class="contractor-page__avatar-actions">
            <button
              type="button"
              class="contractor-page__avatar-action"
              :disabled="isUploadingContractorPhoto || isDeletingContractorPhoto"
              @click="showPhotoSheet = true"
            >
              {{ contractor?.profilePhotoUrl ? t('contractorProfile.changePhoto') : t('contractorProfile.addPhoto') }}
            </button>
            <button
              v-if="contractor?.profilePhotoUrl"
              type="button"
              class="contractor-page__avatar-action contractor-page__avatar-action--danger"
              :disabled="isUploadingContractorPhoto || isDeletingContractorPhoto"
              @click="deletingPhoto = true"
            >
              {{ t('contractorProfile.deletePhoto') }}
            </button>
          </div>
        </div>

        <p v-if="deletePhotoErrorMessage" class="contractor-page__error">
          {{ deletePhotoErrorMessage }}
        </p>

        <form class="contractor-page__form" @submit.prevent="handleSave">
          <label class="field">
            <span class="field__label">{{ t('contractorProfile.nameLabel') }}</span>
            <input v-model="name" type="text" class="input" :placeholder="t('contractorProfile.namePlaceholder')" :disabled="isSavingContractor">
          </label>

          <label class="field">
            <span class="field__label">{{ t('contractorProfile.phoneLabel') }}</span>
            <input v-model="phone" type="tel" inputmode="tel" class="input" :placeholder="t('contractorProfile.phonePlaceholder')" :disabled="isSavingContractor">
          </label>

          <label class="field">
            <span class="field__label">{{ t('contractorProfile.aboutLabel') }}</span>
            <textarea
              v-model="description"
              class="input contractor-page__description"
              rows="3"
              :placeholder="t('contractorProfile.aboutPlaceholder')"
              :disabled="isSavingContractor"
            />
          </label>

          <p v-if="!isNewProfile && contractor" class="text-caption text-muted contractor-page__status">
            {{ t('contractorProfile.statusLabel', { status: contractorStatusLabel(contractor.status) }) }}
          </p>

          <p v-if="saveContractorError" class="contractor-page__error">
            {{ saveContractorError.message }}
          </p>
          <p v-else-if="contractorError" class="contractor-page__error">
            {{ contractorError.message }}
          </p>
          <p v-if="saveSuccess" class="contractor-page__success">
            <UiIcon name="check" :size="16" />
            {{ t('contractorProfile.saved') }}
          </p>

          <button type="submit" class="btn btn-primary contractor-page__save" :disabled="!isValid || isSavingContractor">
            {{ isSavingContractor ? t('common.saving') : (isNewProfile ? t('contractorProfile.createProfile') : t('common.save')) }}
          </button>
        </form>
      </section>

      <section v-if="contractor" class="contractor-page__services">
        <div class="contractor-page__services-header">
          <h2 class="text-h3">
            {{ t('contractorProfile.myServicesTitle') }}
          </h2>
          <button type="button" class="btn btn-secondary btn-sm" @click="showAddServiceSheet = true">
            <UiIcon name="plus" :size="16" />
            {{ t('contractorProfile.addService') }}
          </button>
        </div>

        <div v-if="servicesLoading" class="contractor-page__skeletons">
          <div v-for="n in 2" :key="n" class="contractor-page__service-skeleton" />
        </div>
        <div v-else-if="servicesError" class="contractor-page__state">
          <p class="text-secondary">
            {{ t('contractorProfile.servicesLoadError') }}
          </p>
          <button type="button" class="btn btn-secondary" @click="loadServices">
            {{ t('common.retry') }}
          </button>
        </div>
        <p v-else-if="services.length === 0" class="text-secondary contractor-page__empty">
          {{ t('contractorProfile.noServices') }}
        </p>
        <div v-else class="contractor-page__service-list">
          <p v-if="serviceActionError" class="contractor-page__error">
            {{ serviceActionError.message }}
          </p>
          <MarketplaceContractorServiceCard
            v-for="service in services"
            :key="service.id"
            :service="service"
            :busy="serviceActionId === service.id"
            @edit="editingService = service"
            @delete="deletingService = service"
          />
        </div>
      </section>

      <section v-if="contractor" class="contractor-page__portfolio">
        <div class="contractor-page__portfolio-header">
          <div>
            <h2 class="text-h3">
              {{ t('portfolio.myWorksTitle') }}
            </h2>
            <p class="text-caption text-muted">
              {{ t('portfolio.myWorksSubtitle') }}
            </p>
          </div>
          <button v-if="portfolio.length > 0" type="button" class="btn btn-secondary btn-sm" @click="showUploadSheet = true">
            <UiIcon name="plus" :size="16" />
            {{ t('portfolio.addWork') }}
          </button>
        </div>

        <div v-if="portfolioLoading" class="contractor-page__skeletons">
          <div v-for="n in 2" :key="n" class="contractor-page__service-skeleton" />
        </div>
        <div v-else-if="portfolioError" class="contractor-page__state">
          <p class="text-secondary">
            {{ t('portfolio.loadError') }}
          </p>
          <button type="button" class="btn btn-secondary" @click="loadPortfolio">
            {{ t('common.retry') }}
          </button>
        </div>
        <div v-else-if="portfolio.length === 0" class="contractor-page__portfolio-empty">
          <div class="contractor-page__portfolio-empty-icon">
            <UiIcon name="camera" :size="24" />
          </div>
          <p class="text-h3 contractor-page__portfolio-empty-title">
            {{ t('portfolio.emptyTitle') }}
          </p>
          <p class="text-secondary contractor-page__portfolio-empty-desc">
            {{ t('portfolio.emptyDesc') }}
          </p>
          <button type="button" class="btn btn-primary" @click="showUploadSheet = true">
            <UiIcon name="plus" :size="16" />
            {{ t('portfolio.addWork') }}
          </button>
        </div>
        <template v-else>
          <p v-if="portfolioActionError" class="contractor-page__error">
            {{ portfolioActionError.message }}
          </p>
          <p v-if="reorderPortfolioError" class="contractor-page__error">
            {{ reorderPortfolioError.message }}
          </p>
          <MarketplacePortfolioGrid
            :items="portfolio"
            editable
            :deleting-id="portfolioActionId"
            :reordering="isReorderingPortfolio"
            @delete="(id) => (deletingPortfolioItem = portfolio.find(p => p.id === id) ?? null)"
            @reorder="handleReorderPortfolio"
            @open="(item) => (viewingPortfolioItem = item as PortfolioItem)"
          />
        </template>
      </section>
    </template>

    <MarketplaceAddServiceSheet
      :open="showAddServiceSheet"
      :categories="catalogCategories"
      :work-types="catalogWorkTypes"
      :existing-work-type-ids="existingWorkTypeIds"
      :submitting="isAddingService"
      :error="addServiceError?.message ?? null"
      @submit="handleAddService"
      @cancel="showAddServiceSheet = false"
    />

    <MarketplaceEditServicePriceSheet
      :open="editingService !== null"
      :service="editingService"
      :submitting="serviceActionId === editingService?.id"
      :error="serviceActionError?.message ?? null"
      @submit="handleEditServiceSubmit"
      @cancel="editingService = null"
    />

    <UiConfirmDialog
      :open="deletingService !== null"
      :title="t('dialogs.deleteService.title')"
      :message="deletingService ? t('dialogs.deleteService.message', { workType: deletingService.workType }) : ''"
      :confirm-text="t('common.delete')"
      danger
      @confirm="handleConfirmDelete"
      @cancel="deletingService = null"
    />

    <MarketplacePortfolioUploadSheet
      :open="showUploadSheet"
      :submitting="isUploadingPortfolio"
      :error="uploadPortfolioError?.message ?? null"
      @submit="handleUploadSubmit"
      @cancel="showUploadSheet = false"
    />

    <UiConfirmDialog
      :open="deletingPortfolioItem !== null"
      :title="t('dialogs.deletePortfolioItem.title')"
      :message="t('dialogs.deletePortfolioItem.message')"
      :confirm-text="t('common.delete')"
      :confirm-disabled="portfolioActionId !== null"
      danger
      @confirm="handleConfirmDeletePortfolio"
      @cancel="deletingPortfolioItem = null"
    />

    <MarketplacePortfolioImageViewer :item="viewingPortfolioItem" @close="viewingPortfolioItem = null" />

    <MarketplaceContractorPhotoUploadSheet
      :open="showPhotoSheet"
      :submitting="isUploadingContractorPhoto"
      :error="uploadPhotoErrorMessage"
      @submit="handlePhotoUploadSubmit"
      @cancel="showPhotoSheet = false"
    />

    <UiConfirmDialog
      :open="deletingPhoto"
      :title="t('dialogs.deleteContractorPhoto.title')"
      :message="t('dialogs.deleteContractorPhoto.message')"
      :confirm-text="t('common.delete')"
      danger
      @confirm="handleConfirmDeletePhoto"
      @cancel="deletingPhoto = false"
    />
  </main>
</template>

<style scoped>
.contractor-page {
  max-width: 560px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

.contractor-page__title {
  margin: 0 0 var(--space-5);
}

.contractor-page__onboarding {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-5);
  margin-bottom: var(--space-4);
  text-align: center;
  border-radius: var(--radius-card);
  background: var(--color-primary-subtle);
}

.contractor-page__onboarding-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-primary);
}

.contractor-page__onboarding-title {
  margin: 0;
}

.contractor-page__onboarding-desc {
  margin: 0;
  max-width: 40ch;
}

.contractor-page__skeleton {
  height: 320px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: contractor-page-pulse 1.4s ease-in-out infinite;
}

.contractor-page__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-6) var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.contractor-page__avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.contractor-page__avatar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.contractor-page__avatar-action {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-small-size);
  font-weight: 500;
  color: var(--color-primary);
  cursor: pointer;
  min-height: 44px;
}

.contractor-page__avatar-action:disabled {
  opacity: 0.5;
  cursor: default;
}

.contractor-page__avatar-action--danger {
  color: var(--color-error);
}

.contractor-page__form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.contractor-page__description {
  height: auto;
  padding: var(--space-3);
  resize: vertical;
  font-family: var(--font-family);
}

.contractor-page__status {
  margin: calc(var(--space-2) * -1) 0 0;
}

.contractor-page__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
}

.contractor-page__success {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-success-subtle);
  color: var(--color-success);
  font-size: var(--font-small-size);
}

.contractor-page__save {
  width: 100%;
  height: 48px;
}

.contractor-page__services {
  margin-top: var(--space-8);
}

.contractor-page__services-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.contractor-page__services-header h2 {
  margin: 0;
}

.contractor-page__service-list,
.contractor-page__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.contractor-page__service-skeleton {
  height: 64px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: contractor-page-pulse 1.4s ease-in-out infinite;
}

@keyframes contractor-page-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.contractor-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
}

.contractor-page__empty {
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
}

.contractor-page__portfolio {
  margin-top: var(--space-8);
}

.contractor-page__portfolio-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.contractor-page__portfolio-header h2 {
  margin: 0 0 2px;
}

.contractor-page__portfolio-header p {
  margin: 0;
}

.contractor-page__portfolio-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-5);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
}

.contractor-page__portfolio-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text-muted);
  margin-bottom: var(--space-1);
}

.contractor-page__portfolio-empty-title {
  margin: 0;
}

.contractor-page__portfolio-empty-desc {
  margin: 0 0 var(--space-2);
  max-width: 40ch;
}
</style>
