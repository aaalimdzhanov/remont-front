<script setup lang="ts">
import type { RoomType } from '~/types/building'

const { addRoom } = useBuilding()

const roomTypes: { value: RoomType, label: string }[] = [
  { value: 'kitchen', label: 'Кухня' },
  { value: 'living_room', label: 'Гостиная' },
  { value: 'bedroom', label: 'Спальня' },
  { value: 'bathroom', label: 'Ванная' },
  { value: 'hallway', label: 'Коридор' },
  { value: 'other', label: 'Другое' },
]

const isOpen = ref(false)
const name = ref('Комната')
const type = ref<RoomType>('other')
const width = ref(3)
const length = ref(4)

function openForm() {
  isOpen.value = true
}

function closeForm() {
  isOpen.value = false
  name.value = 'Комната'
  type.value = 'other'
  width.value = 3
  length.value = 4
}

function submit() {
  if (!name.value.trim()) return
  // Размер поджимается к минимуму 0.5 м и привязывается к сетке внутри addRoom.
  addRoom({ name: name.value.trim(), type: type.value, width: width.value, length: length.value })
  closeForm()
}
</script>

<template>
  <div class="room-tool">
    <button v-if="!isOpen" type="button" class="tool-btn" @click="openForm">
      <UiIcon name="room" :size="18" />
      Помещение
    </button>

    <form v-else class="room-tool__form" @submit.prevent="submit">
      <label class="field">
        <span class="field__label">Название</span>
        <input v-model="name" type="text" class="input" required>
      </label>

      <label class="field">
        <span class="field__label">Тип</span>
        <select v-model="type" class="input">
          <option v-for="opt in roomTypes" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </label>

      <div class="room-tool__dimensions">
        <label class="field">
          <span class="field__label">Ширина, м</span>
          <input v-model.number="width" type="number" min="0" step="any" class="input" required>
        </label>
        <label class="field">
          <span class="field__label">Длина, м</span>
          <input v-model.number="length" type="number" min="0" step="any" class="input" required>
        </label>
      </div>

      <div class="room-tool__actions">
        <button type="submit" class="btn btn-primary btn-sm room-tool__submit">
          Добавить
        </button>
        <button type="button" class="btn btn-secondary btn-sm room-tool__submit" @click="closeForm">
          Отмена
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.room-tool__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  background: var(--color-surface-subtle);
}

.room-tool__dimensions {
  display: flex;
  gap: var(--space-2);
}

.room-tool__actions {
  display: flex;
  gap: var(--space-2);
}

.room-tool__submit {
  flex: 1;
}
</style>
