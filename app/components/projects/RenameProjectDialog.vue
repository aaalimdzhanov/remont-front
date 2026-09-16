<script setup lang="ts">
// Тот же визуальный язык overlay/panel, что и UiConfirmDialog (см. секцию
// PROJECT CARD задания: "Использовать существующий confirmation dialog для
// Delete" — для rename нужен текстовый ввод, которого у ConfirmDialog нет,
// поэтому отдельный маленький компонент с идентичной оболочкой, а не другой
// UI-язык.
const props = defineProps<{ open: boolean, currentName: string }>()
const emit = defineEmits<{ confirm: [name: string], cancel: [] }>()

const name = ref(props.currentName)

watch(() => props.open, (isOpen) => {
  if (isOpen) name.value = props.currentName
})

function handleConfirm() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  emit('confirm', trimmed)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="rename-dialog__overlay" @click.self="emit('cancel')">
      <form class="rename-dialog__panel" role="dialog" aria-modal="true" aria-label="Переименовать проект" @submit.prevent="handleConfirm">
        <h3 class="rename-dialog__title">
          Переименовать проект
        </h3>
        <label class="field">
          <span class="field__label">Название</span>
          <input v-model="name" type="text" class="input" required autofocus>
        </label>
        <div class="rename-dialog__actions">
          <button type="button" class="btn btn-secondary" @click="emit('cancel')">
            Отмена
          </button>
          <button type="submit" class="btn btn-primary">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.rename-dialog__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 100;
}

.rename-dialog__panel {
  width: 100%;
  max-width: 380px;
  background: var(--color-surface);
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.rename-dialog__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
}

.rename-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
