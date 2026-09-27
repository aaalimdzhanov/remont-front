<script setup lang="ts">
// Auth gate для гостя (см. задание "Public Marketplace v1", секция 4/17):
// показывается вместо защищённого действия (например, "Предложить цену" на
// /marketplace/requests/[id]), когда пользователь неавторизован. Не новая
// auth-система — только ссылки на уже существующие /auth/login и
// /auth/register, с ?redirect=<текущая страница>, чтобы после входа
// вернуться сюда же (см. utils/authRedirect.ts и pages/auth/login.vue,
// register.vue, которые читают этот параметр).
const { t } = useI18n()

const props = defineProps<{ message?: string }>()

const displayMessage = computed(() => props.message ?? t('marketplace.loginToRespondDefault'))

const route = useRoute()
const redirectQuery = computed(() => ({ redirect: route.fullPath }))
</script>

<template>
  <div class="mp-auth-gate">
    <p class="mp-auth-gate__message">
      {{ displayMessage }}
    </p>
    <div class="mp-auth-gate__actions">
      <NuxtLink :to="{ path: '/auth/login', query: redirectQuery }" class="btn btn-primary mp-auth-gate__action">
        {{ t('navigation.login') }}
      </NuxtLink>
      <NuxtLink :to="{ path: '/auth/register', query: redirectQuery }" class="btn btn-secondary mp-auth-gate__action">
        {{ t('navigation.register') }}
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.mp-auth-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius-card);
  background: var(--color-surface-subtle);
  text-align: center;
}

.mp-auth-gate__message {
  margin: 0;
  color: var(--color-text);
  font-weight: 500;
}

.mp-auth-gate__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
}

.mp-auth-gate__action {
  flex: 1;
  min-width: 140px;
  min-height: 44px;
  justify-content: center;
}
</style>
