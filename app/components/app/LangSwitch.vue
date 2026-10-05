<script setup lang="ts">
// Глобальный переключатель языка RU/UZ — живёт в AppHeader.vue + кастомных
// header'ах Builder/Work Builder/auth layout (см. задание "Вынести
// переключатель языка RU/UZ из profile dropdown в общий глобальный
// Header"). Логика не менялась — тот же useI18n().setLocale(), что раньше
// вызывался из ProfileMenu.vue. Persistence не менялась — app/plugins/
// i18n-persist.client.ts слушает i18n.locale глобально (localStorage, не
// завязан на auth) — здесь ничего дополнительно не делается, второй
// state/storage не заводится.
//
// Visual v3 (см. задание "добавить единый Language Switcher (RU/UZ) в
// Header", reference image: globe-trigger "🌐 RU ⌄" + dropdown с полными
// названиями языков и чекмаркой у активного). Это не третий визуальный
// вариант ради вариативности — предыдущий (сегментированный RU|UZ control)
// заменён по прямому указанию пользователя с новым reference. Dropdown
// open/close state и его поведение (click toggle, click outside, Escape) —
// не новый UI-примитив: дословно тот же паттерн, что уже реализован в
// ProfileMenu.vue (тот же компонент, что рядом в Header), просто с другим
// содержимым панели.
const { locale, setLocale } = useI18n()
const { t } = useI18n()

const LANGUAGES = [
  { code: 'ru' as const, name: 'Русский' },
  { code: 'uz' as const, name: "O'zbekcha" },
]

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const currentCode = computed(() => locale.value.toUpperCase())

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function select(code: 'ru' | 'uz') {
  setLocale(code)
  close()
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
</script>

<template>
  <div ref="rootEl" class="lang-switch">
    <button
      type="button"
      class="lang-switch__trigger"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="t('navigation.language')"
      @click="toggle"
    >
      <UiIcon name="globe" :size="16" class="lang-switch__globe" />
      <span class="lang-switch__code">{{ currentCode }}</span>
      <UiIcon name="chevron-left" :size="14" class="lang-switch__chevron" :class="{ 'lang-switch__chevron--open': open }" />
    </button>

    <div v-if="open" class="lang-switch__panel" role="listbox" :aria-label="t('navigation.language')">
      <button
        v-for="lang in LANGUAGES"
        :key="lang.code"
        type="button"
        class="lang-switch__option"
        :class="{ 'lang-switch__option--active': locale === lang.code }"
        role="option"
        :aria-selected="locale === lang.code"
        @click="select(lang.code)"
      >
        <span class="lang-switch__option-code">{{ lang.code.toUpperCase() }}</span>
        <span class="lang-switch__option-name">{{ lang.name }}</span>
        <UiIcon v-if="locale === lang.code" name="check" :size="15" class="lang-switch__option-check" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.lang-switch {
  position: relative;
  flex-shrink: 0;
}

.lang-switch__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 40px;
  padding: 0 var(--space-2) 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-small-size);
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
}

.lang-switch__trigger:hover {
  background: var(--color-surface-subtle);
  border-color: var(--color-border-strong);
}

.lang-switch__globe {
  color: var(--color-text-secondary);
}

.lang-switch__chevron {
  color: var(--color-text-muted);
  transform: rotate(-90deg);
  transition: transform var(--transition-fast);
}

.lang-switch__chevron--open {
  transform: rotate(90deg);
}

.lang-switch__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  width: 190px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-modal);
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lang-switch__option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-input);
  background: none;
  font-family: var(--font-family);
  text-align: left;
  cursor: pointer;
}

.lang-switch__option:hover {
  background: var(--color-surface-subtle);
}

.lang-switch__option--active {
  background: var(--color-primary-subtle);
}

.lang-switch__option-code {
  flex-shrink: 0;
  width: 22px;
  font-size: var(--font-small-size);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.lang-switch__option--active .lang-switch__option-code {
  color: var(--color-primary);
}

.lang-switch__option-name {
  flex: 1;
  min-width: 0;
  font-size: var(--font-body-size);
  color: var(--color-text);
}

.lang-switch__option--active .lang-switch__option-name {
  color: var(--color-primary);
}

.lang-switch__option-check {
  flex-shrink: 0;
  color: var(--color-primary);
}
</style>
