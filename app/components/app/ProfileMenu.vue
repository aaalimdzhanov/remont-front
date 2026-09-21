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
import type { UserMode } from '~/utils/userMode'

const props = withDefaults(defineProps<{ onBeforeLogout?: () => boolean | Promise<boolean> }>(), {
  onBeforeLogout: () => true,
})

const { user, isAuthenticated, logout } = useAuth()
const { isClient, isContractor, setMode } = useUserMode()
const route = useRoute()

// Гость (см. задание "Public Marketplace v1", секция 18: "не показывать
// private user menu ... как будто пользователь авторизован") — этот
// компонент теперь рендерится и на публичном /marketplace, поэтому режим
// без сессии — не гипотетический случай. redirectQuery — вернуться на
// текущую страницу после входа (см. utils/authRedirect.ts).
const redirectQuery = computed(() => ({ redirect: route.fullPath }))

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const maskedPhone = computed(() => (user.value ? maskPhone(user.value.phone) : ''))

// Режим — UI preference, не auth role (см. useUserMode.ts). Выбор сразу
// закрывает меню (см. задание, секция 3: "При выборе режима меню закрывается").
function selectMode(next: UserMode) {
  setMode(next)
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
  <div v-if="!isAuthenticated" class="profile-menu profile-menu--guest">
    <NuxtLink :to="{ path: '/auth/login', query: redirectQuery }" class="btn btn-secondary btn-sm">
      Войти
    </NuxtLink>
    <NuxtLink :to="{ path: '/auth/register', query: redirectQuery }" class="btn btn-primary btn-sm">
      Регистрация
    </NuxtLink>
  </div>

  <div v-else ref="rootEl" class="profile-menu">
    <button
      type="button"
      class="profile-menu__avatar"
      aria-label="Профиль"
      :aria-expanded="open"
      @click="toggle"
    >
      <UiIcon name="user" :size="18" />
    </button>

    <div v-if="open" class="profile-menu__panel" role="menu">
      <p v-if="maskedPhone" class="profile-menu__phone text-caption text-muted">
        {{ maskedPhone }}
      </p>

      <div class="profile-menu__section" role="group" aria-label="Режим">
        <p class="profile-menu__section-label text-caption text-muted">
          Режим
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
            <span class="profile-menu__mode-title">Клиент</span>
            <span class="profile-menu__mode-desc">Создаю проекты и ищу мастеров</span>
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
            <span class="profile-menu__mode-title">Мастер</span>
            <span class="profile-menu__mode-desc">Беру работы и отправляю предложения</span>
          </span>
          <UiIcon v-if="isContractor" name="check" :size="16" class="profile-menu__mode-check" />
        </button>
      </div>

      <button type="button" class="profile-menu__logout" role="menuitem" @click="handleLogout">
        <UiIcon name="logout" :size="16" />
        Выйти
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile-menu {
  position: relative;
}

.profile-menu--guest {
  display: flex;
  gap: var(--space-2);
}

.profile-menu--guest .btn {
  min-height: 44px;
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
