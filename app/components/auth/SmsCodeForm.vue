<script setup lang="ts">
// Шаг 2 auth-flow: ввод 6-значного SMS-кода. Один input вместо 6 отдельных
// боксов — проще в реализации, тот же UX-результат (только цифры,
// автофокус, ограничение длины, paste работает через обычный input-event);
// отдельные боксы были бы избыточной сложностью для этого этапа.
const props = defineProps<{
  phone: string
  isLoading: boolean
  // Сколько секунд ждать до следующего "Отправить ещё раз" — best-effort
  // отражение backend SMS_RESEND_COOLDOWN (см. .env.example бэкенда,
  // дефолт 60s); backend остаётся источником истины — если он всё равно
  // вернёт cooldown-ошибку, она просто показывается как есть (см. страницу).
  cooldownSeconds: number
}>()
const emit = defineEmits<{ submit: [code: string], resend: [], back: [] }>()

const code = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const remaining = ref(props.cooldownSeconds)
let timer: ReturnType<typeof setInterval> | null = null

function stopCountdown() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function startCountdown(seconds: number) {
  stopCountdown()
  remaining.value = seconds
  if (seconds <= 0) return
  timer = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) stopCountdown()
  }, 1000)
}

onMounted(() => {
  inputRef.value?.focus()
  startCountdown(props.cooldownSeconds)
})
onBeforeUnmount(stopCountdown)
watch(() => props.cooldownSeconds, (seconds) => startCountdown(seconds))

const canResend = computed(() => remaining.value <= 0 && !props.isLoading)
const canSubmit = computed(() => code.value.length === 6 && !props.isLoading)

const countdownLabel = computed(() => {
  const m = Math.floor(remaining.value / 60).toString().padStart(2, '0')
  const s = (remaining.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  code.value = target.value.replace(/\D/g, '').slice(0, 6)
  if (code.value.length === 6) handleSubmit()
}

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', code.value)
}

function handleResend() {
  if (!canResend.value) return
  code.value = ''
  emit('resend')
}
</script>

<template>
  <form class="sms-form" @submit.prevent="handleSubmit">
    <div class="sms-form__hint">
      <p class="text-h3">
        Введите код
      </p>
      <p class="text-small text-secondary">
        Код отправлен на: <strong class="sms-form__phone">{{ maskPhone(phone) }}</strong>
      </p>
    </div>

    <input
      ref="inputRef"
      :value="code"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="6"
      placeholder="000000"
      aria-label="Код из SMS"
      class="input sms-form__code-input"
      @input="handleInput"
    >

    <button type="submit" class="btn btn-primary sms-form__submit" :disabled="!canSubmit">
      {{ isLoading ? 'Проверка…' : 'Подтвердить' }}
    </button>

    <p class="sms-form__resend-hint text-small text-muted">
      <template v-if="remaining > 0">
        Не получили код? Отправить ещё раз через {{ countdownLabel }}
      </template>
      <button
        v-else
        type="button"
        class="sms-form__resend"
        :disabled="!canResend"
        @click="handleResend"
      >
        Отправить ещё раз
      </button>
    </p>

    <button type="button" class="btn btn-ghost sms-form__back" @click="emit('back')">
      <UiIcon name="chevron-left" :size="16" />
      Изменить номер
    </button>
  </form>
</template>

<style scoped>
.sms-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.sms-form__hint {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sms-form__phone {
  color: var(--color-text);
  font-weight: 500;
}

.sms-form__code-input {
  height: 56px;
  font-size: 26px;
  letter-spacing: 10px;
  text-align: center;
  font-weight: 500;
}

.sms-form__submit {
  width: 100%;
}

.sms-form__resend-hint {
  text-align: center;
  margin: 0;
}

.sms-form__resend {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--font-small-size);
  font-weight: 500;
  cursor: pointer;
}

.sms-form__resend:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.sms-form__back {
  align-self: center;
  padding: 0;
  height: auto;
}
</style>
