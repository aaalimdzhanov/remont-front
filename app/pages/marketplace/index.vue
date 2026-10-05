<script setup lang="ts">
// /marketplace — публичная биржа заявок. Public Marketplace v1: /marketplace
// не требует auth — гость видит обе вкладки без сессии (backend: GET
// /marketplace/requests/open и GET /contractors — оба публичные, см.
// api/marketplace.ts, api/contractor.ts). Onboarding-баннер/переключатель
// режима остаются authenticated-only ниже (isAuthenticated-гварды).
//
// "Биржа" restructure (UI/UX v3, см. финальный отчёт): страница раньше
// показывала ДВА визуально смешивающихся списка — "Открытые заявки"
// (заявки других клиентов, contractor-сценарий) и "Мои заявки" (свои же
// заявки, client-сценарий) — визуально почти неотличимые друг от друга,
// хотя это разные сущности. Теперь /marketplace = именно "биржа для
// мастера": единственный контент вкладки "Заявки" — открытые заявки,
// единообразные карточки (см. OpenRequestCard.vue). "Мои заявки" с этой
// страницы УБРАНЫ (не удалены как функциональность — см. ниже, "что не
// изменилось").
//
// Builder Hero (MarketplaceBuilderHero.vue) — между заголовком/описанием и
// табами. Заменил промо-carousel (PromoBanner.vue + utils/
// marketplacePromoSlides.ts, оба удалены этой задачей — "ЗАМЕНИТЬ
// PROMOTIONAL SLIDER НА BUILDER HERO BLOCK"): вместо рекламы "найдите
// мастера" теперь один статичный блок, продающий сам Builder (2D-план с
// реальным рендером через Geometry Engine, см. doc comment в самом
// BuilderHero.vue) — никакого autoplay/dots/carousel state здесь больше нет.
// Компонент использовался только на этой странице (проверено перед
// удалением), поэтому заменён "на месте" без риска для других страниц.
//
// Что НЕ изменилось: сами composables/API/маршруты/бизнес-логика заявок,
// офферов, фильтров (только один новый client-side фильтр — city, см.
// utils/marketplace.ts RequestFilters, никакого нового backend-запроса).
// MyRequestCard.vue по-прежнему используется на /marketplace/requests/{id}
// (см. задачу "Marketplace request plan thumbnail"), MarketplaceBenefits.vue
// по-прежнему НЕ рендерится здесь (эта задача просила вернуть только
// slider, не весь прежний hero-блок). Своя заявка по-прежнему полностью
// управляема через /projects/{id}/works (там и создаётся — см.
// ProjectWorkCard.vue) и через прямую ссылку на /marketplace/requests/{id}:
// отдельного плоского cross-project route "все мои заявки" в архитектуре
// не существует — создавать новый ради этой задачи не стали (см. задание:
// "не создавать дубликат списка").
//
// layout:'app' — тот же общий AppHeader.vue, что и на /projects (Dashboard),
// вместо собственной шапки страницы — см. правку "Header consistency
// /projects vs /marketplace" из более ранней задачи этой сессии.
definePageMeta({ layout: 'app' })

const { t, locale } = useI18n()
useHead({ title: computed(() => t('marketplace.title')) })

const {
  openRequests, openRequestsLoading, openRequestsError, filteredOpenRequests, requestFilters,
  catalogCategories, catalogWorkTypes,
  contractor, loadContractor,
  loadOpenRequests, loadFilterCatalog, setRequestFilter, resetRequestFilters,
} = useMarketplace()
const { mode, isContractor } = useUserMode()
const { isAuthenticated, isInitialized, initialize } = useAuth()
// Публичный список мастеров (public GET /api/v1/contractors, см.
// usePublicContractor.ts) — независим от auth. НЕ путать с `contractor`
// выше (это СВОЙ профиль текущего пользователя, из useMarketplace()).
const { contractors, contractorsLoading, contractorsError, fetchContractors, retryContractors } = usePublicContractor()

const activeFilterCount = computed(() => countActiveRequestFilters(requestFilters.value))

// ---- Tabs: «Заявки» / «Мастера» (см. задание, секция 16) ----
// Состояние — query-параметр ?tab=masters, не новый store/Pinia. По
// умолчанию (нет query или любое другое значение) — "requests", как и
// требует задание ("если пользователь открывает /marketplace — по
// умолчанию Заявки"). navigateTo({ replace:true }) на том же route меняет
// только query — Nuxt не перемонтирует страницу и не делает full reload
// (проверено в Chromium QA), никакого нового route не создано.
type MarketplaceTab = 'requests' | 'masters'
const route = useRoute()
const activeTab = computed<MarketplaceTab>(() => (route.query.tab === 'masters' ? 'masters' : 'requests'))

function setTab(tab: MarketplaceTab): Promise<void> {
  if (activeTab.value === tab) return Promise.resolve()
  const query = { ...route.query }
  if (tab === 'masters') query.tab = 'masters'
  else delete query.tab
  return navigateTo({ path: route.path, query }, { replace: true }) as Promise<void>
}

// ---- «Мастера»: client-side фильтр по виду работы (см. задание, секция 6:
// "список work_type из services", "не придумывать backend-фильтрацию") ----
const selectedContractorWorkTypeId = ref<string | null>(null)
const contractorWorkTypeOptions = computed(() => uniqueContractorWorkTypes(contractors.value))
const filteredContractors = computed(() => filterContractorsByWorkType(contractors.value, selectedContractorWorkTypeId.value))
const showContractorFilterSheet = ref(false)

// Contractor Profile Gate: mode==='contractor' не доказывает наличие
// профиля — только реальный GET /contractor (contractor === null, не
// undefined) решает, показывать ли этот nudge.
const showContractorOnboardingBanner = computed(() => shouldShowContractorOnboarding(mode.value, contractor.value))

onMounted(async () => {
  void loadOpenRequests()
  void loadFilterCatalog()
  // Публичный, без auth — грузится независимо от сессии, как и открытые
  // заявки (см. задание, секция PERFORMANCE: "1 API request на список").
  void fetchContractors()
  // Эта страница — публичная (без middleware:'auth'), поэтому на жёстком
  // reload/прямом переходе ничто не гарантирует, что restore сессии (см.
  // useAuth().initialize(), вызывается из app.vue) уже завершился к этому
  // моменту (дочерние onMounted срабатывают раньше родительского) — без
  // ожидания isAuthenticated ниже мог бы быть ложно false для реально
  // залогиненного пользователя. initialize() идемпотентен, безопасно
  // вызывать здесь же (см. requests/[id].vue — тот же фикс, тот же race).
  if (!isInitialized.value) await initialize()
  // /contractor требует auth (401 для гостя) — не отправляем этот запрос
  // вообще, если сессии нет (см. задание, секция SECURITY: "не отправлять
  // auth-required requests без необходимости"). loadMyRequests() здесь
  // больше не нужен — "Мои заявки" эта страница больше не показывает (см.
  // doc comment выше); requests/[id].vue по-прежнему грузит их сам для
  // определения владельца.
  if (isAuthenticated.value) {
    void loadContractor()
  }
})
</script>

<template>
  <main class="marketplace-page">
    <!-- "Биржа" restructure v3: единственный настоящий <h1> страницы (не
         визуально-скрытый — раньше им был sr-only заголовок, потому что
         видимых заголовков у прежнего hero-carousel было несколько, теперь
         ровно один). "Мои предложения" — вторичная, но
         заметная кнопка рядом с заголовком (см. задание, секция "МОИ
         ПРЕДЛОЖЕНИЯ"): это ДРУГАЯ сущность и от "Мои заявки" (убраны с
         этой страницы, см. doc comment в script), и от самой биржи —
         поэтому не смешивается с списком заявок ниже. Видимость — та же,
         что и раньше (contractor-mode пользователи уже видят "Мои
         предложения" в AppModeNav, повторять там же ссылку не нужно). -->
    <div class="marketplace-page__hero">
      <div class="marketplace-page__hero-text">
        <h1 class="text-h1 marketplace-page__title">
          {{ t('marketplace.title') }}
        </h1>
        <p class="text-secondary">
          {{ t('marketplace.pageSubtitle') }}
        </p>
      </div>
      <NuxtLink v-if="isAuthenticated && !isContractor" to="/marketplace/offers" class="btn btn-secondary marketplace-page__my-offers">
        <UiIcon name="coins" :size="16" />
        {{ t('offers.myOffers') }}
      </NuxtLink>
    </div>

    <!-- Builder Hero — см. doc comment в script: статичный блок, продающий
         Builder, вместо прежнего promo-carousel. -->
    <MarketplaceBuilderHero class="marketplace-page__promo-banner" />

    <!-- Tabs — см. задание, секция 1/10: "визуально понятные переключатели",
         "НЕ две огромные кнопки", "именно tabs/navigation". -->
    <nav class="marketplace-page__tabs" :aria-label="t('marketplace.sectionAriaLabel')">
      <button
        type="button"
        class="marketplace-page__tab"
        :class="{ 'marketplace-page__tab--active': activeTab === 'requests' }"
        :aria-current="activeTab === 'requests' ? 'page' : undefined"
        @click="setTab('requests')"
      >
        {{ t('marketplace.tabRequests') }}
      </button>
      <button
        type="button"
        class="marketplace-page__tab"
        :class="{ 'marketplace-page__tab--active': activeTab === 'masters' }"
        :aria-current="activeTab === 'masters' ? 'page' : undefined"
        @click="setTab('masters')"
      >
        {{ t('marketplace.tabContractors') }}
      </button>
    </nav>

    <template v-if="activeTab === 'requests'">
      <NuxtLink v-if="showContractorOnboardingBanner" to="/marketplace/contractor" class="marketplace-page__onboarding">
        <UiIcon name="hammer" :size="20" class="marketplace-page__onboarding-icon" />
        <span class="marketplace-page__onboarding-text">
          <span class="marketplace-page__onboarding-title">{{ t('marketplace.onboardingTitle') }}</span>
          <span class="text-caption text-muted">{{ t('marketplace.onboardingSubtitle') }}</span>
        </span>
        <UiIcon name="chevron-left" :size="16" class="marketplace-page__onboarding-arrow" />
      </NuxtLink>

      <section class="marketplace-page__section">
        <!-- Filters row — "Фильтры" (существующий sheet: категория/вид
             работы/количество/сортировка, см. MarketplaceFilters.vue, не
             переписан) + "Локация" — единственный НОВЫЙ фильтр в этой
             задаче, полностью client-side, над уже загруженным списком
             (location.city у OpenMarketplaceRequest уже был в ответе
             backend — см. utils/marketplace.ts RequestFilters.city). Не
             считается в activeFilterCount — отдельный, всегда видимый
             контрол, а не часть скрытого набора за кнопкой "Фильтры" (см.
             задание: "[ Фильтры ] [ Локация ▼ ]" — два раздельных элемента). -->
        <div class="marketplace-page__filter-row">
          <MarketplaceFilters
            :categories="catalogCategories"
            :work-types="catalogWorkTypes"
            :filters="requestFilters"
            :active-count="activeFilterCount"
            @update="setRequestFilter"
            @reset="resetRequestFilters"
          />

          <label class="marketplace-page__location-filter">
            <UiIcon name="pin" :size="14" class="marketplace-page__location-pin" />
            <select
              class="marketplace-page__location-select"
              :value="requestFilters.city ?? ''"
              :aria-label="t('marketplace.locationFilterLabel')"
              @change="setRequestFilter({ city: ($event.target as HTMLSelectElement).value || null })"
            >
              <option value="">
                {{ t('marketplace.allCities') }}
              </option>
              <option v-for="city in LOCATION_CITIES" :key="city" :value="city">
                {{ locationDisplayName(city, locale) }}
              </option>
            </select>
            <UiIcon name="chevron-left" :size="14" class="marketplace-page__location-chevron" />
          </label>
        </div>

        <p v-if="!openRequestsLoading && !openRequestsError" class="text-caption text-muted marketplace-page__count-text">
          {{ t('marketplace.foundRequestsCount', { count: filteredOpenRequests.length }, filteredOpenRequests.length) }}
        </p>

        <div v-if="openRequestsLoading" class="marketplace-page__skeletons">
          <div v-for="n in 3" :key="n" class="marketplace-page__skeleton" />
        </div>
        <div v-else-if="openRequestsError" class="marketplace-page__state">
          <p class="text-secondary">
            {{ t('marketplace.openRequestsLoadError') }}
          </p>
          <button type="button" class="btn btn-secondary" @click="loadOpenRequests">
            {{ t('common.retry') }}
          </button>
        </div>
        <div v-else-if="openRequests.length === 0" class="marketplace-page__empty">
          <p class="text-secondary">
            {{ t('marketplace.openRequestsEmptyTitle') }}
          </p>
          <p class="text-caption text-muted">
            {{ t('marketplace.openRequestsEmptyText') }}
          </p>
        </div>
        <p v-else-if="filteredOpenRequests.length === 0" class="text-secondary marketplace-page__empty">
          {{ t('marketplace.noRequestsMatchFilters') }}
        </p>
        <div v-else class="marketplace-page__grid">
          <MarketplaceOpenRequestCard
            v-for="request in filteredOpenRequests"
            :key="request.id"
            :request="request"
            :icon="requestCardIcon(request.workTypeId, catalogWorkTypes, catalogCategories)"
          />
        </div>
      </section>
    </template>

    <!-- «Мастера» — вертикальный список (см. задание, секция 4/15: "это НЕ
         carousel", "нормальный вертикальный scroll"), полностью заменил
         прежний горизонтальный showcase-carousel. Публичная — видна гостю
         без auth, тот же уже загруженный `contractors` (см. onMounted
         fetchContractors() выше) — переключение вкладки НЕ делает новый
         API-запрос. -->
    <section v-else class="marketplace-page__section marketplace-page__masters">
      <div class="marketplace-page__masters-head">
        <h2 class="text-h3 marketplace-page__section-title">
          {{ t('marketplace.contractorsHeading') }}
          <span v-if="!contractorsLoading && !contractorsError" class="marketplace-page__count">{{ filteredContractors.length }}</span>
        </h2>
        <p class="text-secondary marketplace-page__masters-subtitle">
          {{ t('marketplace.contractorsSubtitle') }}
        </p>
      </div>

      <button
        v-if="!contractorsLoading && !contractorsError && contractors.length > 0"
        type="button"
        class="btn btn-secondary marketplace-page__filters-toggle"
        @click="showContractorFilterSheet = true"
      >
        <UiIcon name="sort" :size="16" />
        {{ t('marketplace.filters') }}
        <span v-if="selectedContractorWorkTypeId" class="marketplace-page__filters-badge">1</span>
      </button>

      <div v-if="contractorsLoading" class="marketplace-page__masters-list" aria-hidden="true">
        <div v-for="n in 3" :key="n" class="marketplace-page__master-skeleton" />
      </div>
      <div v-else-if="contractorsError" class="marketplace-page__state">
        <p class="text-secondary">
          {{ t('marketplace.contractorsLoadError') }}
        </p>
        <button type="button" class="btn btn-secondary" @click="retryContractors">
          {{ t('common.retry') }}
        </button>
      </div>
      <div v-else-if="contractors.length === 0" class="marketplace-page__empty">
        <p class="text-secondary">
          {{ t('marketplace.contractorsEmptyTitle') }}
        </p>
        <p class="text-caption text-muted">
          {{ t('marketplace.contractorsEmptyText') }}
        </p>
      </div>
      <p v-else-if="filteredContractors.length === 0" class="text-secondary marketplace-page__empty">
        {{ t('marketplace.noContractorsMatchFilter') }}
      </p>
      <div v-else class="marketplace-page__masters-list">
        <MarketplacePublicContractorCard
          v-for="c in filteredContractors"
          :key="c.id"
          :contractor="c"
        />
      </div>

      <MarketplaceContractorFilterSheet
        :open="showContractorFilterSheet"
        :work-types="contractorWorkTypeOptions"
        :selected="selectedContractorWorkTypeId"
        @update:selected="selectedContractorWorkTypeId = $event"
        @close="showContractorFilterSheet = false"
      />
    </section>
  </main>
</template>

<style scoped>
.marketplace-page {
  max-width: 1100px;
  margin: 0 auto;
  /* space-5 top — то же значение, что и .dash в pages/projects/index.vue
     использует под общим AppHeader (см. header-consistency правку выше);
     раньше здесь стоял space-3, подобранный под тесную посадку под
     собственной (уже удалённой) шапкой страницы. */
  padding: var(--space-5) var(--space-4) var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Hero v3 — заголовок "Биржа" + подзаголовок слева, "Мои предложения"
   справа (см. задание: "Справа или рядом"). На mobile — колонка (кнопка
   full-width под текстом), на desktop — один ряд. */
.marketplace-page__hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.marketplace-page__hero-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.marketplace-page__title {
  margin: 0;
}

.marketplace-page__my-offers {
  align-self: flex-start;
  min-height: 44px;
}

/* Позиционирует BuilderHero.vue относительно остального контента страницы,
   не переопределяет его собственные внутренние стили. */
.marketplace-page__promo-banner {
  margin-top: var(--space-1);
}

.marketplace-page__onboarding {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-card);
  background: var(--color-primary-subtle);
  text-decoration: none;
  color: inherit;
}

.marketplace-page__onboarding-icon {
  flex-shrink: 0;
  color: var(--color-primary);
}

.marketplace-page__onboarding-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.marketplace-page__onboarding-title {
  font-weight: 500;
  color: var(--color-text);
}

.marketplace-page__onboarding-arrow {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transform: rotate(180deg);
}

.marketplace-page__section {
  scroll-margin-top: var(--space-4);
}

.marketplace-page__section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
}

.marketplace-page__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 var(--space-1);
  border-radius: 999px;
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-caption-size);
  font-weight: 600;
}

/* Filters row — "Фильтры" (MarketplaceFilters.vue, не изменён) + "Локация"
   рядом, тот же ряд (см. задание: "[ Фильтры ]  [ Локация ▼ ]"). На
   mobile — оба элемента компактны, MarketplaceFilters сам сворачивается в
   одну кнопку-триггер на этой ширине (см. его собственный breakpoint). */
.marketplace-page__filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

/* Простой flex-ряд (иконка + select + иконка-шеврон), без absolute-хаков —
   визуальный текст берётся из самого <select> (его выбранной option). */
.marketplace-page__location-filter {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-button);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  max-width: 100%;
}

.marketplace-page__location-pin {
  flex-shrink: 0;
}

.marketplace-page__location-select {
  min-width: 0;
  max-width: 160px;
  border: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-small-size);
  color: var(--color-text);
  appearance: none;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
}

.marketplace-page__location-select:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.marketplace-page__location-chevron {
  flex-shrink: 0;
  transform: rotate(-90deg);
  pointer-events: none;
  color: var(--color-text-muted);
}

.marketplace-page__count-text {
  margin: 0 0 var(--space-3);
}

.marketplace-page__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

.marketplace-page__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.marketplace-page__skeleton {
  height: 120px;
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  animation: marketplace-page-pulse 1.4s ease-in-out infinite;
}

@keyframes marketplace-page-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.marketplace-page__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
}

.marketplace-page__empty {
  padding: var(--space-6);
  text-align: center;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
}

@media (min-width: 768px) {
  .marketplace-page__grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .marketplace-page__hero {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .marketplace-page__my-offers {
    flex-shrink: 0;
  }
}

@media (min-width: 1024px) {
  .marketplace-page__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ---- Tabs: «Заявки» / «Мастера» (см. задание, секция 1) — именно
   navigation-переключатели (underline на активной), не две большие
   кнопки. */
.marketplace-page__tabs {
  display: flex;
  gap: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.marketplace-page__tab {
  position: relative;
  padding: var(--space-3) 0;
  min-height: 44px;
  border: none;
  background: none;
  font-family: var(--font-family);
  font-size: var(--font-body-lg-size);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.marketplace-page__tab:hover {
  color: var(--color-text);
}

.marketplace-page__tab--active {
  color: var(--color-graphite);
  font-weight: 600;
}

.marketplace-page__tab--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--color-primary);
  border-radius: 999px 999px 0 0;
}

/* ---- «Мастера» — вертикальный список (см. задание, секция 4/15: "это НЕ
   carousel", "нормальный вертикальный scroll") ---- */
.marketplace-page__masters-head {
  margin-bottom: var(--space-4);
}

.marketplace-page__masters-subtitle {
  margin: 0;
}

.marketplace-page__filters-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  margin-bottom: var(--space-4);
}

.marketplace-page__filters-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-caption-size);
  font-weight: 600;
}

.marketplace-page__masters-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.marketplace-page__master-skeleton {
  height: 220px;
  border-radius: var(--radius-card-lg);
  background: var(--color-surface-subtle);
  animation: marketplace-page-pulse 1.4s ease-in-out infinite;
}

@media (min-width: 768px) {
  .marketplace-page__masters-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
