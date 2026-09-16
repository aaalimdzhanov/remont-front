<script setup lang="ts">
// Минимальная Profile-система (см. задание, секция PROFILE: "НЕ создавать
// полноценную сложную Profile систему... Минимум: номер телефона, Выйти") —
// маленькое меню от аватара, не отдельная страница. Auth-логика не
// дублируется: logout() — тот же метод useAuth(), что и раньше использовал
// инлайн-кнопка в AppHeader.
const { user, logout } = useAuth()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const maskedPhone = computed(() => (user.value ? maskPhone(user.value.phone) : ''))

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

async function handleLogout() {
  close()
  await logout()
  await navigateTo('/auth/login')
}
</script>

<template>
  <div ref="rootEl" class="profile-menu">
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
  min-width: 200px;
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

.profile-menu__logout {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: none;
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
