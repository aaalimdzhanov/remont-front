<script setup lang="ts">
definePageMeta({ middleware: 'guest', layout: 'auth' })

const { t } = useI18n()
useHead({ title: computed(() => t('auth.loginTitle')) })

const RESEND_COOLDOWN_SECONDS = 60

const { sendSMS, login, isLoading, error, clearError } = useAuth()
const route = useRoute()

const step = ref<'phone' | 'code'>('phone')
const phone = ref('')

function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s\-().]/g, '')
}

async function handlePhoneSubmit(rawPhone: string) {
  const normalized = normalizePhone(rawPhone)
  const ok = await sendSMS(normalized, 'login')
  if (ok) {
    phone.value = normalized
    step.value = 'code'
  }
}

async function handleResend() {
  await sendSMS(phone.value, 'login')
}

async function handleCodeSubmit(code: string) {
  const ok = await login(phone.value, code)
  // ?redirect= — см. задание "Public Marketplace v1", секция AUTH GATE:
  // гость, попавший сюда с /marketplace/requests/{id} через MarketplaceAuthGate,
  // должен после входа вернуться туда же, а не всегда на /projects.
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
        {{ t('auth.loginHeading') }}
      </h1>
      <p class="auth-card__subtitle text-secondary">
        {{ t('auth.loginSubtitle') }}
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
      <button type="button" class="auth-card__error-close" :aria-label="t('common.hideError')" @click="clearError">
        <UiIcon name="close" :size="14" />
      </button>
    </p>

    <div v-if="step === 'phone'" class="auth-card__divider">
      <span>{{ t('auth.or') }}</span>
    </div>

    <p v-if="step === 'phone'" class="auth-card__switch text-small">
      {{ t('auth.noAccount') }} <NuxtLink :to="{ path: '/auth/register', query: route.query }" class="auth-card__link">
        {{ t('auth.registerLink') }}
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

.auth-card__divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--font-caption-size);
}

.auth-card__divider::before,
.auth-card__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
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
