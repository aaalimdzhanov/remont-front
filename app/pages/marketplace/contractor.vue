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

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Профиль мастера' })

const {
  contractor, contractorLoading, contractorError,
  isSavingContractor, saveContractorError,
  services, servicesLoading, servicesError,
  isAddingService, addServiceError,
  serviceActionId, serviceActionError,
  portfolio, portfolioLoading, portfolioError,
  isUploadingPortfolio, uploadPortfolioError,
  portfolioActionId, portfolioActionError,
  isReorderingPortfolio, reorderPortfolioError,
  catalogCategories, catalogCategoriesLoading, catalogWorkTypes,
  loadContractor, updateContractorProfile, createContractorProfile,
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

const statusLabels: Record<string, string> = { active: 'Активен', inactive: 'Неактивен' }

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
</script>

<template>
  <main class="contractor-page">
    <div class="contractor-page__header">
      <NuxtLink to="/marketplace" class="contractor-page__back">
        <UiIcon name="chevron-left" :size="18" />
        Биржа заявок
      </NuxtLink>
      <AppProfileMenu />
    </div>

    <AppModeNav class="contractor-page__mode-nav" />

    <h1 class="text-h1 contractor-page__title">
      Профиль мастера
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
          Стать мастером
        </p>
        <p class="text-secondary contractor-page__onboarding-desc">
          Создайте профиль мастера, добавьте свои услуги и цены и начинайте отправлять предложения на работы.
        </p>
      </div>

      <section class="contractor-page__card">
        <div class="contractor-page__avatar">
          <UiIcon name="user" :size="28" />
        </div>

        <form class="contractor-page__form" @submit.prevent="handleSave">
          <label class="field">
            <span class="field__label">Имя или название</span>
            <input v-model="name" type="text" class="input" placeholder="Например, Азиз" :disabled="isSavingContractor">
          </label>

          <label class="field">
            <span class="field__label">Телефон</span>
            <input v-model="phone" type="tel" inputmode="tel" class="input" placeholder="+998 90 123 45 67" :disabled="isSavingContractor">
          </label>

          <label class="field">
            <span class="field__label">О себе (необязательно)</span>
            <textarea
              v-model="description"
              class="input contractor-page__description"
              rows="3"
              placeholder="Например, укладка плитки, 5 лет опыта"
              :disabled="isSavingContractor"
            />
          </label>

          <p v-if="!isNewProfile && contractor" class="text-caption text-muted contractor-page__status">
            Статус: {{ statusLabels[contractor.status] ?? contractor.status }}
          </p>

          <p v-if="saveContractorError" class="contractor-page__error">
            {{ saveContractorError.message }}
          </p>
          <p v-else-if="contractorError" class="contractor-page__error">
            {{ contractorError.message }}
          </p>
          <p v-if="saveSuccess" class="contractor-page__success">
            <UiIcon name="check" :size="16" />
            Сохранено.
          </p>

          <button type="submit" class="btn btn-primary contractor-page__save" :disabled="!isValid || isSavingContractor">
            {{ isSavingContractor ? 'Сохраняем…' : (isNewProfile ? 'Создать профиль' : 'Сохранить') }}
          </button>
        </form>
      </section>

      <section v-if="contractor" class="contractor-page__services">
        <div class="contractor-page__services-header">
          <h2 class="text-h3">
            Мои услуги
          </h2>
          <button type="button" class="btn btn-secondary btn-sm" @click="showAddServiceSheet = true">
            <UiIcon name="plus" :size="16" />
            Добавить услугу
          </button>
        </div>

        <div v-if="servicesLoading" class="contractor-page__skeletons">
          <div v-for="n in 2" :key="n" class="contractor-page__service-skeleton" />
        </div>
        <div v-else-if="servicesError" class="contractor-page__state">
          <p class="text-secondary">
            Не удалось загрузить услуги.
          </p>
          <button type="button" class="btn btn-secondary" @click="loadServices">
            Повторить
          </button>
        </div>
        <p v-else-if="services.length === 0" class="text-secondary contractor-page__empty">
          Пока нет добавленных услуг. Добавьте вид работы и диапазон цены, чтобы клиенты видели вашу расценку.
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
              Мои работы
            </h2>
            <p class="text-caption text-muted">
              Покажите клиентам примеры выполненных работ
            </p>
          </div>
          <button v-if="portfolio.length > 0" type="button" class="btn btn-secondary btn-sm" @click="showUploadSheet = true">
            <UiIcon name="plus" :size="16" />
            Добавить работу
          </button>
        </div>

        <div v-if="portfolioLoading" class="contractor-page__skeletons">
          <div v-for="n in 2" :key="n" class="contractor-page__service-skeleton" />
        </div>
        <div v-else-if="portfolioError" class="contractor-page__state">
          <p class="text-secondary">
            Не удалось загрузить работы.
          </p>
          <button type="button" class="btn btn-secondary" @click="loadPortfolio">
            Повторить
          </button>
        </div>
        <div v-else-if="portfolio.length === 0" class="contractor-page__portfolio-empty">
          <div class="contractor-page__portfolio-empty-icon">
            <UiIcon name="camera" :size="24" />
          </div>
          <p class="text-h3 contractor-page__portfolio-empty-title">
            Пока нет фотографий работ
          </p>
          <p class="text-secondary contractor-page__portfolio-empty-desc">
            Добавьте фотографии выполненных проектов, чтобы клиенты могли увидеть качество вашей работы.
          </p>
          <button type="button" class="btn btn-primary" @click="showUploadSheet = true">
            <UiIcon name="plus" :size="16" />
            Добавить работу
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
      title="Удалить услугу?"
      :message="deletingService ? `«${deletingService.workType}» будет удалена из вашего списка услуг.` : ''"
      confirm-text="Удалить"
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
      title="Удалить работу?"
      message="Фотография будет удалена из вашего портфолио."
      confirm-text="Удалить"
      :confirm-disabled="portfolioActionId !== null"
      danger
      @confirm="handleConfirmDeletePortfolio"
      @cancel="deletingPortfolioItem = null"
    />

    <MarketplacePortfolioImageViewer :item="viewingPortfolioItem" @close="viewingPortfolioItem = null" />
  </main>
</template>

<style scoped>
.contractor-page {
  max-width: 560px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-4) var(--space-16);
}

.contractor-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.contractor-page__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.contractor-page__mode-nav {
  margin-bottom: var(--space-5);
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

.contractor-page__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
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
