<script setup lang="ts">
// /marketplace — публичная биржа заявок (Marketplace Tabs v1: две вкладки,
// «Заявки»/«Мастера», см. задание). Данные/бизнес-логика НЕ менялись — то
// же самое поведение, что и раньше: "Открытые заявки" (публичный список) и
// "Мои заявки" (client-сценарий, authenticated-only). Public Marketplace
// v1: /marketplace не требует auth — гость видит обе вкладки без сессии
// (backend: GET /marketplace/requests/open и GET /contractors — оба
// публичные, см. api/marketplace.ts, api/contractor.ts). "Мои
// заявки"/onboarding-баннер/переключатель режима остаются
// authenticated-only ниже (isAuthenticated-гварды), как и раньше.
//
// Визуал (накопленная история правок, ничего из этого не меняет
// данные/API/routes):
//   - шапка стала компактной (лого + AppProfileMenu, без "← Проекты" —
//     эта ссылка была не нужна: авторизованный Client и так получает
//     "Проекты" через AppModeNav, а для гостя вела в auth-gated тупик);
//   - статичный MarketplaceHero.vue заменён на MarketplaceHeroSlider.vue —
//     mobile-first swipe-карусель из 3 слайдов (см. этот компонент и
//     utils/marketplaceHeroSlider.ts); единственный настоящий <h1>
//     страницы теперь — визуально скрытый marketplace-page__sr-title ниже
//     (у слайдов заголовки — <p>, их несколько, они не могут быть <h1>);
//   - добавлен MarketplaceBenefits — чисто визуальный, без своих
//     API-вызовов (см. его файл);
//   - карточка (OpenRequestCard.vue) и сетка стали наряднее — те же поля,
//     та же navigation;
//   - Marketplace Tabs v1: горизонтальный carousel мастеров заменён на
//     вертикальный список во второй вкладке «Мастера» (см. задание, секция
//     4/15: "это НЕ carousel", "нормальный вертикальный scroll"). Hero
//     СОЗНАТЕЛЬНО не форкается по вкладке (см. комментарий у
//     MarketplaceHeroSlider ниже) — единственное отклонение от буквального
//     текста задания, объяснённое там же и в финальном отчёте.
const { t } = useI18n()
useHead({ title: computed(() => t('marketplace.title')) })

const {
  openRequests, openRequestsLoading, openRequestsError, filteredOpenRequests, requestFilters,
  myRequests, myRequestsLoading, myRequestsError,
  catalogCategories, catalogWorkTypes,
  contractor, loadContractor,
  loadOpenRequests, loadMyRequests, loadFilterCatalog, setRequestFilter, resetRequestFilters,
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

// В режиме «Мастер» открытые заявки — главный сценарий — показываются
// первыми; «Мои заявки» (client-сценарий) остаются доступны без исчезновения
// (один User может быть и клиентом, и мастером одновременно) — mode только
// переставляет порядок через CSS `order`, ничего не скрывает.
const openRequestsOrder = computed(() => (isContractor.value ? 0 : 1))
const myRequestsOrder = computed(() => (isContractor.value ? 1 : 0))

// Contractor Profile Gate: mode==='contractor' не доказывает наличие
// профиля — только реальный GET /contractor (contractor === null, не
// undefined) решает, показывать ли этот nudge.
const showContractorOnboardingBanner = computed(() => shouldShowContractorOnboarding(mode.value, contractor.value))

// Hero CTA ("Смотреть заявки") — просто scroll к уже существующей секции,
// без роутинга и без нового API-запроса (см. задание, секция HERO: "НЕ
// делать отдельный API call"). Секция "Открытые заявки" теперь рендерится
// только на вкладке "requests" (v-if) — если CTA сработал с вкладки
// "masters" (слайд hero долистали вручную), сперва переключаем вкладку и
// ждём следующий тик, чтобы ref успел появиться в DOM, и только потом
// скроллим.
const openRequestsSectionRef = ref<HTMLElement | null>(null)
async function scrollToOpenRequests() {
  if (activeTab.value !== 'requests') {
    await setTab('requests')
    await nextTick()
  }
  openRequestsSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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
  // /marketplace/requests и /contractor требуют auth (401 для гостя) — не
  // отправляем эти запросы вообще, если сессии нет (см. задание, секция
  // SECURITY: "не отправлять auth-required requests без необходимости").
  if (isAuthenticated.value) {
    void loadMyRequests()
    void loadContractor()
  }
})
</script>

<template>
  <main class="marketplace-page">
    <header class="marketplace-page__header">
      <NuxtLink to="/" class="marketplace-page__brand" aria-label="ishonchliusta">
        <img src="/brand/ishonchliusta-full.png" alt="ishonchliusta" class="marketplace-page__logo">
      </NuxtLink>
      <AppProfileMenu />
    </header>

    <AppModeNav class="marketplace-page__mode-nav" />

    <template v-if="isAuthenticated && !isContractor">
      <div class="marketplace-page__owner-actions">
        <NuxtLink to="/marketplace/offers" class="btn btn-secondary btn-sm">
          {{ t('offers.myOffers') }}
        </NuxtLink>
        <NuxtLink to="/marketplace/contractor" class="btn btn-secondary btn-sm">
          <UiIcon name="user" :size="16" />
          {{ t('contractorProfile.title') }}
        </NuxtLink>
      </div>
    </template>

    <!-- Слайды слайдера — не <h1> (их 3, а на странице должен быть ровно
         один настоящий заголовок для SEO/screen reader'ов, см.
         HeroSlider.vue — там заголовки слайдов теперь <p>). Этот h1
         визуально скрыт (не дублирует видимый текст слайдов), но остаётся
         в DOM/accessibility tree. -->
    <h1 class="marketplace-page__sr-title">
      {{ t('marketplace.hiddenHeading') }}
    </h1>

    <!-- Hero НЕ меняется в зависимости от вкладки (см. задание, секция 9) —
         сознательное решение, не пропуск. Слайд 2 уже называется "Найдите
         мастера для своей задачи" и текстово соответствует вкладке
         "Мастера", но его CTA ведёт на /projects (разместить заявку) — это
         РЕАЛЬНЫЙ, уже проверенный flow "найти мастера" в этом продукте.
         Форкнуть hero под вкладку значило бы либо продублировать компонент
         (прямо запрещено), либо завести 4-й слайд/новое действие "проскроллить
         к вертикальному списку мастеров" — а по секции 22 задания вход с
         вкладки "Мастера" НЕ должен вести через /projects. Эти два
         требования (не создавать новый hero-контент И не вести на /projects
         с "Мастера") противоречат друг другу при попытке форкнуть один и тот
         же слайд под оба контекста, поэтому — по КРИТИЧЕСКОМУ ПРАВИЛУ
         задания ("не придумывай решение — сначала сообщи") — Hero оставлен
         полностью как есть (см. финальный отчёт, "Hero и вкладки"). -->
    <MarketplaceHeroSlider class="marketplace-page__hero" @browse="scrollToOpenRequests" />

    <MarketplaceBenefits class="marketplace-page__benefits" />

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

      <section ref="openRequestsSectionRef" class="marketplace-page__section" :style="{ order: openRequestsOrder }">
        <h2 class="text-h3 marketplace-page__section-title">
          {{ t('marketplace.openRequestsHeading') }}
          <span v-if="!openRequestsLoading && !openRequestsError" class="marketplace-page__count">{{ filteredOpenRequests.length }}</span>
        </h2>

        <MarketplaceFilters
          :categories="catalogCategories"
          :work-types="catalogWorkTypes"
          :filters="requestFilters"
          :active-count="activeFilterCount"
          @update="setRequestFilter"
          @reset="resetRequestFilters"
        />

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

      <section v-if="isAuthenticated" class="marketplace-page__section" :style="{ order: myRequestsOrder }">
        <h2 class="text-h3 marketplace-page__section-title">
          {{ t('marketplace.myRequestsHeading') }}
        </h2>

        <div v-if="myRequestsLoading" class="marketplace-page__skeletons">
          <div v-for="n in 2" :key="n" class="marketplace-page__skeleton" />
        </div>
        <div v-else-if="myRequestsError" class="marketplace-page__state">
          <p class="text-secondary">
            {{ t('marketplace.myRequestsLoadError') }}
          </p>
          <button type="button" class="btn btn-secondary" @click="loadMyRequests">
            {{ t('common.retry') }}
          </button>
        </div>
        <p v-else-if="myRequests.length === 0" class="text-secondary marketplace-page__empty">
          {{ t('marketplace.myRequestsEmpty') }}
        </p>
        <div v-else class="marketplace-page__grid">
          <MarketplaceMyRequestCard v-for="request in myRequests" :key="request.id" :request="request" />
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
  padding: var(--space-3) var(--space-4) var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.marketplace-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 40px;
}

/* flex-shrink:0 — критично на узких viewport: без него flex вместе со
   sibling'ом (AppProfileMenu guest-кнопки) сжимал бы этот контейнер, а
   значит и картинку логотипа, ниже её заданной ширины (см. .marketplace-
   page__logo) — картинка не искажается при сжатии (width/height оба auto-
   пропорциональны), но выглядела бы мельче задуманного и "плавала" бы в
   размере в зависимости от того, сколько места остаётся guest-кнопкам.
   Сжиматься теперь может только guest-actions (см. :deep() ниже), логотип
   — никогда. */
.marketplace-page__brand {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* Логотип публичной шапки — по прямому требованию задания: именно файл
   public/brand/ishonchliusta-full.png (полный лок-ап знак+wordmark+tagline,
   тот же самый файл, что и variant="full" в UiBrandLogo.vue, см. компонент
   для истории approved-asset'а), НЕ вариант "header" (значок+обычный текст
   без tagline), который использовался здесь раньше. Реальные пропорции
   файла — 1985x573px (≈3.46:1, проверено через `sips`), поэтому width
   задан, height:auto держит их без искажения; object-fit:contain — защита
   на случай, если высота когда-либо станет фиксированной. 180px/240px —
   середина/верх диапазонов из задания (mobile 170-190px, desktop
   220-250px), подобрано и проверено визуально в реальном Chromium QA.
   min-height:40px у .marketplace-page__header (выше) больше не актуален
   как ограничитель — просто больше не сжимает контент, реальная высота
   шапки теперь определяется этой картинкой (~52px на mobile). */
.marketplace-page__logo {
  display: block;
  width: 180px;
  height: auto;
  object-fit: contain;
}

/* < 375px (реальный минимум — 360px, см. задание "Marketplace Tabs v1",
   секция "Сначала проектируй интерфейс для: 360px, 390px, 414px") — 180px
   логотип + guest-кнопки (Войти/Регистрация) в сумме не помещаются в
   360px даже с сжатыми выше отступами (измерено: overflow ровно 9px).
   Ужимаем логотип дальше только на этой самой узкой полосе, а не везде —
   180px остаётся дефолтом с 375px и выше, как было проверено раньше. */
@media (max-width: 374px) {
  .marketplace-page__logo {
    width: 150px;
  }
}

@media (min-width: 1024px) {
  .marketplace-page__logo {
    width: 240px;
  }
}

/* Guest-кнопки (Войти/Регистрация) внутри AppProfileMenu — сам компонент не
   трогаем (переиспользуется на /marketplace/contractors/[id] и т.д., там
   рядом с ним нет логотипа и это сжатие не нужно), но именно в этой шапке,
   где рядом полноразмерный логотип, чуть плотнее padding/gap нужны, чтобы
   [логотип] + [Войти] + [Регистрация] реально помещались в 375px без
   сжатия логотипа. Высота (min-height:44px, touch target) не трогается —
   только горизонтальные отступы. */
.marketplace-page__header :deep(.profile-menu--guest) {
  gap: var(--space-1);
}

.marketplace-page__header :deep(.profile-menu--guest .btn) {
  padding: 0 var(--space-2);
}

.marketplace-page__owner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.marketplace-page__owner-actions .btn {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  justify-content: center;
}

.marketplace-page__hero {
  margin-top: var(--space-1);
}

/* Стандартный визуально-скрытый паттерн (не display:none — тот убрал бы
   элемент и из accessibility tree тоже). Единственный настоящий <h1>
   страницы — см. комментарий в template. */
.marketplace-page__sr-title {
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

  .marketplace-page__owner-actions {
    align-self: flex-end;
  }

  .marketplace-page__owner-actions .btn {
    flex: none;
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
