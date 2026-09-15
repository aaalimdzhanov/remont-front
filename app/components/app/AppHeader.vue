<script setup lang="ts">
// Единый header для authenticated-приложения (/projects, /projects/new) —
// не дублируется на каждой странице, живёт один раз в layouts/app.vue.
// Editor (/projects/{id}) использует свой EditorHeader, не этот.
const { user, logout } = useAuth()

const maskedUserPhone = computed(() => (user.value ? maskPhone(user.value.phone) : ''))

async function handleLogout() {
  await logout()
  await navigateTo('/auth/login')
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__left">
      <NuxtLink to="/projects" class="brand-wordmark app-header__brand">
        REMONT
      </NuxtLink>
      <NuxtLink to="/projects" class="app-header__nav-link app-header__nav-link--active">
        Проекты
      </NuxtLink>
    </div>

    <div class="app-header__right">
      <span v-if="maskedUserPhone" class="app-header__phone text-caption text-muted">
        {{ maskedUserPhone }}
      </span>
      <button type="button" class="btn btn-ghost btn-sm" @click="handleLogout">
        <UiIcon name="logout" :size="16" />
        Выйти
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 0 var(--space-6);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.app-header__left {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  min-width: 0;
}

.app-header__brand {
  flex-shrink: 0;
}

.app-header__nav-link {
  font-size: var(--font-body-size);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.app-header__nav-link--active {
  color: var(--color-text);
  font-weight: 500;
}

.app-header__right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}

.app-header__phone {
  white-space: nowrap;
}

@media (max-width: 640px) {
  .app-header {
    padding: 0 var(--space-4);
  }

  .app-header__phone {
    display: none;
  }
}
</style>
