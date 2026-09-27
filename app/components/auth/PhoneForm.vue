<script setup lang="ts">
// Шаг 1 auth-flow (register/login): ввод телефона. Форматирование — только
// то, что видит пользователь; в domain state (что уходит в emit) попадает
// не "как напечатано", а после лёгкой нормализации в родительской странице —
// backend остаётся authoritative validator формата E.164.
const { t } = useI18n()

const props = defineProps<{ isLoading: boolean, label?: string }>()
const displayLabel = computed(() => props.label ?? t('auth.phoneLabel'))
const emit = defineEmits<{ submit: [phone: string] }>()

const phone = ref('+998')
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})

function handleSubmit() {
  const trimmed = phone.value.trim()
  if (!trimmed) return
  emit('submit', trimmed)
}
</script>

<template>
  <form class="phone-form" @submit.prevent="handleSubmit">
    <label class="field">
      <span class="field__label">{{ displayLabel }}</span>
      <input
        ref="inputRef"
        v-model="phone"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        placeholder="+998 90 123 45 67"
        class="input"
        required
      >
    </label>
    <button type="submit" class="btn btn-primary phone-form__submit" :disabled="isLoading">
      {{ isLoading ? t('auth.sendingCode') : t('auth.getCode') }}
    </button>
  </form>
</template>

<style scoped>
.phone-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.phone-form__submit {
  width: 100%;
}
</style>
