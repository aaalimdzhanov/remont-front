<script setup lang="ts">
// Переиспользуемый confirmation modal (сейчас — для delete project, и из
// списка, и из редактора). Не заменяет существующий window.confirm() для
// dirty-navigation/logout — те завязаны на синхронный возврат значения в
// местах, которые лучше не трогать сейчас; здесь — новый, явно запрошенный
// UI-паттерн для деструктивных действий.
withDefaults(defineProps<{
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}>(), {
  confirmText: 'Подтвердить',
  cancelText: 'Отмена',
  danger: false,
})
const emit = defineEmits<{ confirm: [], cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="confirm-dialog__overlay" @click.self="emit('cancel')">
      <div class="confirm-dialog__panel" role="alertdialog" aria-modal="true" :aria-label="title">
        <h3 class="confirm-dialog__title">
          {{ title }}
        </h3>
        <p class="confirm-dialog__message">
          {{ message }}
        </p>
        <div class="confirm-dialog__actions">
          <button type="button" class="btn btn-secondary" @click="emit('cancel')">
            {{ cancelText }}
          </button>
          <button
            type="button"
            class="btn"
            :class="danger ? 'btn-danger' : 'btn-primary'"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-dialog__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 100;
  animation: confirm-dialog-fade var(--transition-base);
}

.confirm-dialog__panel {
  width: 100%;
  max-width: 380px;
  background: var(--color-surface);
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  animation: confirm-dialog-rise var(--transition-base);
}

.confirm-dialog__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
}

.confirm-dialog__message {
  font-size: var(--font-body-size);
  line-height: var(--font-body-line);
  color: var(--color-text-secondary);
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

@keyframes confirm-dialog-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes confirm-dialog-rise {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
