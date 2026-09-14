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
  if (!name.value.trim() || width.value <= 0 || length.value <= 0) return
  addRoom({ name: name.value.trim(), type: type.value, width: width.value, length: length.value })
  closeForm()
}
</script>

<template>
  <div class="room-tool">
    <button v-if="!isOpen" type="button" class="room-tool__trigger" @click="openForm">
      + Комната
    </button>

    <form v-else class="room-tool__form" @submit.prevent="submit">
      <label>
        Название
        <input v-model="name" type="text" required>
      </label>

      <label>
        Тип
        <select v-model="type">
          <option v-for="opt in roomTypes" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </label>

      <div class="room-tool__dimensions">
        <label>
          Ширина, м
          <input v-model.number="width" type="number" min="0.1" step="0.1" required>
        </label>
        <label>
          Длина, м
          <input v-model.number="length" type="number" min="0.1" step="0.1" required>
        </label>
      </div>

      <div class="room-tool__actions">
        <button type="submit">Добавить</button>
        <button type="button" class="room-tool__cancel" @click="closeForm">Отмена</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.room-tool__trigger {
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid #2f7fd1;
  background: #2f7fd1;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.room-tool__trigger:hover {
  background: #2a72bd;
}

.room-tool__form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e1e4ea;
  border-radius: 8px;
  background: #fafbfc;
}

.room-tool__form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #5b6472;
}

.room-tool__form input,
.room-tool__form select {
  padding: 6px 8px;
  border: 1px solid #d6dae1;
  border-radius: 4px;
  font-size: 14px;
}

.room-tool__dimensions {
  display: flex;
  gap: 12px;
}

.room-tool__actions {
  display: flex;
  gap: 8px;
}

.room-tool__actions button {
  padding: 7px 12px;
  border-radius: 6px;
  border: 1px solid #d6dae1;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
}

.room-tool__actions button[type='submit'] {
  border-color: #2f7fd1;
  background: #2f7fd1;
  color: #fff;
}
</style>
