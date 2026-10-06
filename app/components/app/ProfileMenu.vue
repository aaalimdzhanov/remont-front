<script setup lang="ts">
// Минимальная Profile-система (см. задание, секция PROFILE: "НЕ создавать
// полноценную сложную Profile систему... Минимум: номер телефона, Выйти") —
// маленькое меню от аватара, не отдельная страница. Auth-логика не
// дублируется: logout() — тот же метод useAuth(), что и раньше использовал
// инлайн-кнопка в AppHeader; тот же компонент теперь переиспользует и
// EditorHeader.vue (Builder) вместо собственной кнопки "Выйти".
//
// onBeforeLogout — единственная точка расширения: Builder должен успеть
// спросить "есть несохранённые изменения, выйти без сохранения?" ПЕРЕД
// реальным logout() (та же dirty-check логика, что раньше была прямо в
// EditorHeader.vue), а Dashboard (AppHeader.vue) такой проверки не имеет —
// поэтому по умолчанию проп всегда разрешает выход, ничего не меняя для
// существующего использования на Dashboard.
//
// RU/UZ здесь больше нет (см. задание "Вынести переключатель языка RU/UZ
// из profile dropdown в общий глобальный Header") — язык не является
// настройкой профиля и теперь живёт в AppLangSwitch.vue, рядом с этим же
// компонентом в AppHeader.vue, видим и гостю. Этот дропдаун — только
// user-specific действия (режим, мои работы, выйти).
import type { UserMode } from '~/utils/userMode'

const props = withDefaults(defineProps<{ onBeforeLogout?: () => boolean | Promise<boolean> }>(), {
  onBeforeLogout: () => true,
})

const { user, isAuthenticated, logout } = useAuth()
const { isClient, isContractor, setMode } = useUserMode()
const route = useRoute()
const { t } = useI18n()

// Гость (см. задание "Public Marketplace v1", секция 18: "не показывать
// private user menu ... как будто пользователь авторизован") — этот
// компонент теперь рендерится и на публичном /marketplace, поэтому режим
// без сессии — не гипотетический случай. redirectQuery — вернуться на
// текущую страницу после входа (см. utils/authRedirect.ts).
//
// Guest Header simplification (см. задание "упростить Header для гостя"):
// раньше гость видел "Войти"/"Регистрация" как два отдельных инлайн-NuxtLink
// рядом с языковым переключателем — теперь это тот же avatar-button +
// dropdown-panel паттерн, что уже был у authenticated-ветки ниже (open/
// toggle/close/rootEl/click-outside/Escape — весь этот state и его обработчики
// уже были общими для всего компонента, не per-branch, поэтому guest-ветка
// просто стала вторым потребителем уже существующего механизма, без новой
// логики). route/redirect/navigation не изменились: те же два NuxtLink на
// /auth/login и /auth/register с тем же redirectQuery, просто теперь внутри
// панели, а не инлайн.
const redirectQuery = computed(() => ({ redirect: route.fullPath }))

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const maskedPhone = computed(() => (user.value ? maskPhone(user.value.phone) : ''))

// Режим — UI preference, не auth role (см. useUserMode.ts). Выбор сразу
// закрывает меню (см. задание, секция 3: "При выборе режима меню закрывается") —
// закрытие не ждёт setMode(), т.к. само переключение mode происходит внутри
// него синхронно, до перехода на главную страницу режима (см. useUserMode.ts
// setMode — там же и router.replace на /projects или /marketplace, устраняющий
// desync header/body при смене режима).
function selectMode(next: UserMode) {
  void setMode(next)
  close()
}

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(event.target as Node)) close()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (open.value && event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})

async function handleLogout() {
  close()
  const canProceed = await props.onBeforeLogout()
  if (!canProceed) return
  await logout()
  await navigateTo('/auth/login')
}
</script>

<template>
  <div v-if="!isAuthenticated" ref="rootEl" class="profile-menu">
    <button
      type="button"
      class="profile-menu__avatar"
      :aria-label="t('navigation.guestMenuAriaLabel')"
      :aria-expanded="open"
      @click="toggle"
    >
      <UiIcon name="user" :size="18" />
    </button>

    <div v-if="open" class="profile-menu__panel" role="menu">
      <NuxtLink
        :to="{ path: '/auth/login', query: redirectQuery }"
        class="profile-menu__link"
        role="menuitem"
        @click="close"
      >
        {{ t('navigation.login') }}
      </NuxtLink>
      <NuxtLink
        :to="{ path: '/auth/register', query: redirectQuery }"
        class="profile-menu__link"
        role="menuitem"
        @click="close"
      >
        {{ t('navigation.register') }}
      </NuxtLink>
    </div>
  </div>

  <div v-else ref="rootEl" class="profile-menu">
    <button
      type="button"
      class="profile-menu__avatar"
      :aria-label="t('navigation.profileAriaLabel')"
      :aria-expanded="open"
      @click="toggle"
    >
      <UiIcon name="user" :size="18" />
    </button>

    <div v-if="open" class="profile-menu__panel" role="menu">
      <p v-if="maskedPhone" class="profile-menu__phone text-caption text-muted">
        {{ maskedPhone }}
      </p>

      <NuxtLink
        v-if="isContractor"
        to="/marketplace/contractor"
        class="profile-menu__link"
        role="menuitem"
        @click="close"
      >
        <UiIcon name="camera" :size="16" />
        {{ t('navigation.myWorks') }}
      </NuxtLink>

      <div class="profile-menu__section" role="group" :aria-label="t('navigation.mode')">
        <p class="profile-menu__section-label text-caption text-muted">
          {{ t('navigation.mode') }}
        </p>

        <button
          type="button"
          class="profile-menu__mode-option"
          :class="{ 'profile-menu__mode-option--active': isClient }"
          role="menuitemradio"
          :aria-checked="isClient"
          @click="selectMode('client')"
        >
          <UiIcon name="home" :size="18" class="profile-menu__mode-icon" />
          <span class="profile-menu__mode-text">
            <span class="profile-menu__mode-title">{{ t('navigation.modeClient') }}</span>
            <span class="profile-menu__mode-desc">{{ t('navigation.modeClientDesc') }}</span>
          </span>
          <UiIcon v-if="isClient" name="check" :size="16" class="profile-menu__mode-check" />
        </button>

        <button
          type="button"
          class="profile-menu__mode-option"
          :class="{ 'profile-menu__mode-option--active': isContractor }"
          role="menuitemradio"
          :aria-checked="isContractor"
          @click="selectMode('contractor')"
        >
          <UiIcon name="hammer" :size="18" class="profile-menu__mode-icon" />
          <span class="profile-menu__mode-text">
            <span class="profile-menu__mode-title">{{ t('navigation.modeContractor') }}</span>
            <span class="profile-menu__mode-desc">{{ t('navigation.modeContractorDesc') }}</span>
          </span>
          <UiIcon v-if="isContractor" name="check" :size="16" class="profile-menu__mode-check" />
        </button>
      </div>

      <button type="button" class="profile-menu__logout" role="menuitem" @click="handleLogout">
        <UiIcon name="logout" :size="16" />
        {{ t('navigation.logout') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile-menu {
  position: relative;
}

.profile-menu__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 44px;
  min-height: 44px;
  margin: -4px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.profile-menu__avatar:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.profile-menu__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  min-width: 260px;
  max-width: min(300px, calc(100vw - var(--space-8)));
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-modal);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.profile-menu__phone {
  margin: 0 0 0 var(--space-1);
}

.profile-menu__link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-input);
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  color: var(--color-text);
  text-decoration: none;
}

.profile-menu__link:hover {
  background: var(--color-surface-subtle);
}

.profile-menu__section {
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.profile-menu__section-label {
  margin: 0 0 2px var(--space-1);
}

.profile-menu__mode-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: none;
  border-radius: var(--radius-input);
  font-family: var(--font-family);
  text-align: left;
  cursor: pointer;
}

.profile-menu__mode-option:hover {
  background: var(--color-surface-subtle);
}

.profile-menu__mode-option--active {
  background: var(--color-primary-subtle);
}

.profile-menu__mode-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--color-text-secondary);
}

.profile-menu__mode-option--active .profile-menu__mode-icon {
  color: var(--color-primary);
}

.profile-menu__mode-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.profile-menu__mode-title {
  font-size: var(--font-body-size);
  font-weight: 500;
  color: var(--color-text);
}

.profile-menu__mode-desc {
  font-size: var(--font-caption-size);
  color: var(--color-text-muted);
}

.profile-menu__mode-check {
  flex-shrink: 0;
  margin-top: 3px;
  color: var(--color-primary);
}

.profile-menu__logout {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
  padding: var(--space-2) var(--space-3);
  padding-top: calc(var(--space-2) + var(--space-2));
  border: none;
  border-top: 1px solid var(--color-border);
  background: none;
  border-radius: var(--radius-input);
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  min-height: 44px;
}

.profile-menu__logout:hover {
  background: var(--color-surface-subtle);
}
</style>
