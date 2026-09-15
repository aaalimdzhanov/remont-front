<script setup lang="ts">
// Создание проекта — отдельная страница, без Builder. При успехе backend
// уже владеет canonical id проекта; переход в editor выполняется явно
// отсюда (navigateTo), а не внутри composable.
import type { BuildingType } from '~/types/building'

definePageMeta({ middleware: 'auth', layout: 'app' })
useHead({ title: 'Новый проект — REMONT' })

const { createProject, isCreating, error, clearError } = useProjectPersistence()

const name = ref('Новый проект')
// Building JSON пока поддерживает только 'house' | 'apartment' — "Коммерческое"
// из макета сюда сознательно не добавлено: это потребовало бы придумывать
// новое значение схемы, чего явно просили не делать (NO FAKE FUNCTIONALITY).
const type = ref<BuildingType>('house')
const typeOptions: { value: BuildingType, label: string }[] = [
  { value: 'house', label: 'Дом' },
  { value: 'apartment', label: 'Квартира' },
]

async function handleCreate() {
  if (isCreating.value) return
  const id = await createProject({ name: name.value.trim() || 'Новый проект', type: type.value })
  if (id) await navigateTo(`/projects/${id}`)
}

function handleCancel() {
  navigateTo('/projects')
}
</script>

<template>
  <main class="page">
    <div class="card page__card">
      <h1 class="text-h2">
        Создать проект
      </h1>

      <form class="page__form" @submit.prevent="handleCreate">
        <label class="field">
          <span class="field__label">Название проекта</span>
          <input v-model="name" type="text" class="input" required>
        </label>

        <div class="field">
          <span class="field__label">Тип объекта</span>
          <div class="page__type-switch">
            <button
              v-for="option in typeOptions"
              :key="option.value"
              type="button"
              class="page__type-btn"
              :class="{ 'page__type-btn--active': type === option.value }"
              @click="type = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <p v-if="error" class="page__error">
          {{ error.message }}
          <button type="button" class="page__error-close" aria-label="Скрыть ошибку" @click="clearError">
            <UiIcon name="close" :size="14" />
          </button>
        </p>

        <div class="page__actions">
          <button type="button" class="btn btn-secondary" :disabled="isCreating" @click="handleCancel">
            Отмена
          </button>
          <button type="submit" class="btn btn-primary" :disabled="isCreating">
            {{ isCreating ? 'Создание…' : 'Создать проект' }}
          </button>
        </div>
      </form>
    </div>
  </main>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4) var(--space-16);
}

.page__card {
  padding: var(--space-8);
}

.page__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  margin-top: var(--space-6);
}

.page__type-switch {
  display: flex;
  gap: var(--space-2);
}

.page__type-btn {
  flex: 1;
  height: 44px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-input);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}

.page__type-btn--active {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
  color: var(--color-text);
  font-weight: 500;
}

.page__error {
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

.page__error-close {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  display: flex;
}

.page__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
