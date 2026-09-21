<script setup lang="ts">
definePageMeta({ middleware: 'guest', layout: 'auth' })
useHead({ title: 'Регистрация' })

const RESEND_COOLDOWN_SECONDS = 60

const { sendSMS, register, isLoading, error, clearError } = useAuth()
const route = useRoute()

const step = ref<'phone' | 'code'>('phone')
const phone = ref('')

function normalizePhone(raw: string): string {
  // То же лёгкое форматирование-стрипание, что и backend делает сам перед
  // валидацией (NormalizePhone в user/phone.go) — не пытаемся сами
  // валидировать E.164, только убираем то, что человек обычно печатает.
  return raw.trim().replace(/[\s\-().]/g, '')
}

async function handlePhoneSubmit(rawPhone: string) {
  const normalized = normalizePhone(rawPhone)
  const ok = await sendSMS(normalized, 'register')
  if (ok) {
    phone.value = normalized
    step.value = 'code'
  }
}

async function handleResend() {
  await sendSMS(phone.value, 'register')
}

async function handleCodeSubmit(code: string) {
  const ok = await register(phone.value, code)
  // ?redirect= — см. login.vue / utils/authRedirect.ts.
  if (ok) await navigateTo(resolveAuthRedirect(route.query.redirect))
}

function handleBack() {
  clearError()
  step.value = 'phone'
}
</script>

<template>
  <div class="auth-card">
    <template v-if="step === 'phone'">
      <h1 class="text-h1">
        Создание аккаунта
      </h1>
      <p class="auth-card__subtitle text-secondary">
        Введите номер телефона, чтобы получить SMS-код для регистрации.
      </p>

      <AuthPhoneForm :is-loading="isLoading" @submit="handlePhoneSubmit" />
    </template>

    <AuthSmsCodeForm
      v-else
      :phone="phone"
      :is-loading="isLoading"
      :cooldown-seconds="RESEND_COOLDOWN_SECONDS"
      @submit="handleCodeSubmit"
      @resend="handleResend"
      @back="handleBack"
    />

    <p v-if="error" class="auth-card__error">
      {{ error.message }}
      <button type="button" class="auth-card__error-close" aria-label="Скрыть ошибку" @click="clearError">
        <UiIcon name="close" :size="14" />
      </button>
    </p>

    <p v-if="step === 'phone'" class="auth-card__switch text-small">
      Уже есть аккаунт? <NuxtLink :to="{ path: '/auth/login', query: route.query }" class="auth-card__link">
        Войти
      </NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.auth-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.auth-card__subtitle {
  margin-top: calc(-1 * var(--space-3));
}

.auth-card__error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-error-subtle);
  color: var(--color-error);
  font-size: var(--font-small-size);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.auth-card__error-close {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
}

.auth-card__switch {
  text-align: center;
  color: var(--color-text-secondary);
}

.auth-card__link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.auth-card__link:hover {
  text-decoration: underline;
}
</style>
