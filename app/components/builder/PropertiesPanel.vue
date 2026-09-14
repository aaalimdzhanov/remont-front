<script setup lang="ts">
const { selectedRoom, resizeRoom, renameRoom, removeRoom } = useBuilding()

const name = ref('')
const width = ref(0)
const length = ref(0)

watch(
  selectedRoom,
  (room) => {
    if (!room || room.geometry.type !== 'rectangle') return
    name.value = room.name
    width.value = room.geometry.width
    length.value = room.geometry.length
  },
  { immediate: true },
)

function applyName() {
  if (!selectedRoom.value) return
  renameRoom(selectedRoom.value.id, name.value.trim() || selectedRoom.value.name)
}

function applySize() {
  if (!selectedRoom.value || width.value <= 0 || length.value <= 0) return
  resizeRoom(selectedRoom.value.id, width.value, length.value)
}

function handleDelete() {
  if (!selectedRoom.value) return
  removeRoom(selectedRoom.value.id)
}
</script>

<template>
  <div v-if="selectedRoom" class="properties-panel">
    <h3 class="properties-panel__title">
      {{ selectedRoom.name }}
    </h3>

    <label>
      Название
      <input v-model="name" type="text" @change="applyName">
    </label>

    <label>
      Ширина, м
      <input v-model.number="width" type="number" min="0.1" step="0.1" @change="applySize">
    </label>

    <label>
      Длина, м
      <input v-model.number="length" type="number" min="0.1" step="0.1" @change="applySize">
    </label>

    <button type="button" class="properties-panel__delete" @click="handleDelete">
      Удалить
    </button>
  </div>

  <div v-else class="properties-panel properties-panel--empty">
    Выберите комнату на плане
  </div>
</template>

<style scoped>
.properties-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid #e1e4ea;
  border-radius: 8px;
  background: #fff;
  min-width: 220px;
}

.properties-panel__title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2430;
}

.properties-panel label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #5b6472;
}

.properties-panel input {
  padding: 6px 8px;
  border: 1px solid #d6dae1;
  border-radius: 4px;
  font-size: 14px;
}

.properties-panel__delete {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e0554f;
  background: #fff;
  color: #e0554f;
  font-size: 14px;
  cursor: pointer;
}

.properties-panel__delete:hover {
  background: #fdecec;
}

.properties-panel--empty {
  color: #8a93a2;
  font-size: 14px;
  justify-content: center;
  align-items: center;
}
</style>
