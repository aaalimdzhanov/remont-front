<script setup lang="ts">
import { wallLength } from '~/geometry/walls'
import { snapToGrid } from '~/geometry/snapping'

const {
  selectedRoom,
  selectedWall,
  selectedOpening,
  resizeRoom,
  renameRoom,
  removeRoom,
  moveOpening,
  resizeOpening,
  setOpeningSillHeight,
  removeOpening,
  isRoomIntersecting,
  getIntersectingRoomNames,
  isOpeningIntersecting,
  getIntersectingOpeningLabels,
} = useBuilding()

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
  if (!selectedRoom.value) return
  resizeRoom(selectedRoom.value.id, width.value, length.value)
  // resizeRoom привязывает размеры к сетке 0.1 м и минимуму 0.5 м —
  // синхронизируем поля формы с фактически сохранённым значением.
  const geometry = selectedRoom.value.geometry
  if (geometry.type === 'rectangle') {
    width.value = geometry.width
    length.value = geometry.length
  }
}

function handleDelete() {
  if (!selectedRoom.value) return
  removeRoom(selectedRoom.value.id)
}

const hasConflict = computed(() => (selectedRoom.value ? isRoomIntersecting(selectedRoom.value.id) : false))
const conflictNames = computed(() => (selectedRoom.value ? getIntersectingRoomNames(selectedRoom.value.id) : []))

const openingWidth = ref(0)
const openingHeight = ref(0)
const openingPosition = ref(0)
const openingSill = ref(0)

watch(
  selectedOpening,
  (opening) => {
    if (!opening) return
    openingWidth.value = opening.dimensions.width
    openingHeight.value = opening.dimensions.height
    openingPosition.value = opening.position.offset
    openingSill.value = opening.position.bottom
  },
  { immediate: true },
)

function applyOpeningSize() {
  if (!selectedOpening.value) return
  resizeOpening(selectedOpening.value.id, openingWidth.value, openingHeight.value)
  // resizeOpening привязывает к сетке/границам стены — синхронизируем форму
  // с фактически сохранёнными значениями (ширина могла подвинуть позицию).
  const opening = selectedOpening.value
  openingWidth.value = opening.dimensions.width
  openingHeight.value = opening.dimensions.height
  openingPosition.value = opening.position.offset
  openingSill.value = opening.position.bottom
}

function applyOpeningPosition() {
  if (!selectedOpening.value) return
  moveOpening(selectedOpening.value.id, snapToGrid(openingPosition.value))
  openingPosition.value = selectedOpening.value.position.offset
}

function applyOpeningSill() {
  if (!selectedOpening.value) return
  setOpeningSillHeight(selectedOpening.value.id, openingSill.value)
  openingSill.value = selectedOpening.value.position.bottom
}

function handleDeleteOpening() {
  if (!selectedOpening.value) return
  removeOpening(selectedOpening.value.id)
}

const openingHasConflict = computed(() => (selectedOpening.value ? isOpeningIntersecting(selectedOpening.value.id) : false))
const openingConflictLabels = computed(() =>
  selectedOpening.value ? getIntersectingOpeningLabels(selectedOpening.value.id) : [],
)
</script>

<template>
  <div v-if="selectedRoom && selectedRoom.geometry.type === 'rectangle'" class="properties-panel">
    <h3 class="properties-panel__title">
      {{ selectedRoom.name }}
    </h3>

    <label>
      Название
      <input v-model="name" type="text" @change="applyName">
    </label>

    <label>
      Ширина, м
      <input v-model.number="width" type="number" min="0" step="any" @change="applySize">
    </label>

    <label>
      Длина, м
      <input v-model.number="length" type="number" min="0" step="any" @change="applySize">
    </label>

    <button type="button" class="properties-panel__delete" @click="handleDelete">
      Удалить
    </button>

    <div class="properties-panel__status">
      <div class="properties-panel__status-row">
        <span class="properties-panel__status-label">Размер:</span>
        <span>{{ selectedRoom.geometry.width.toFixed(1) }} × {{ selectedRoom.geometry.length.toFixed(1) }} м</span>
      </div>
      <div class="properties-panel__status-row">
        <span class="properties-panel__status-label">Позиция:</span>
        <span>X: {{ selectedRoom.geometry.position.x.toFixed(1) }} м, Y: {{ selectedRoom.geometry.position.z.toFixed(1) }} м</span>
      </div>

      <p v-if="hasConflict" class="properties-panel__conflict">
        ⚠ Пересечение с комнатой «{{ conflictNames.join('», «') }}»
      </p>
      <p v-else class="properties-panel__ok">
        ✓ Пересечений нет
      </p>
    </div>
  </div>

  <div v-else-if="selectedWall" class="properties-panel">
    <h3 class="properties-panel__title">
      Стена
    </h3>

    <div class="properties-panel__status">
      <div class="properties-panel__status-row">
        <span class="properties-panel__status-label">Тип:</span>
        <span>{{ selectedWall.type === 'interior' ? 'Внутренняя' : 'Внешняя' }}</span>
      </div>
      <div class="properties-panel__status-row">
        <span class="properties-panel__status-label">Длина:</span>
        <span>{{ wallLength(selectedWall).toFixed(1) }} м</span>
      </div>
      <div class="properties-panel__status-row">
        <span class="properties-panel__status-label">Толщина:</span>
        <span>{{ selectedWall.thickness.toFixed(1) }} м</span>
      </div>
    </div>
  </div>

  <div v-else-if="selectedOpening" class="properties-panel">
    <h3 class="properties-panel__title">
      {{ selectedOpening.type === 'door' ? 'Дверь' : 'Окно' }}
    </h3>

    <label>
      Ширина, м
      <input v-model.number="openingWidth" type="number" min="0" step="any" @change="applyOpeningSize">
    </label>

    <label>
      Высота, м
      <input v-model.number="openingHeight" type="number" min="0" step="any" @change="applyOpeningSize">
    </label>

    <label>
      Позиция, м
      <input v-model.number="openingPosition" type="number" min="0" step="any" @change="applyOpeningPosition">
    </label>

    <label v-if="selectedOpening.type === 'window'">
      Высота от пола, м
      <input v-model.number="openingSill" type="number" min="0" step="any" @change="applyOpeningSill">
    </label>

    <button type="button" class="properties-panel__delete" @click="handleDeleteOpening">
      Удалить
    </button>

    <div class="properties-panel__status">
      <p v-if="openingHasConflict" class="properties-panel__conflict">
        ⚠ Пересечение с проёмом: {{ openingConflictLabels.join(', ') }}
      </p>
      <p v-else class="properties-panel__ok">
        ✓ Пересечений нет
      </p>
    </div>
  </div>

  <div v-else class="properties-panel properties-panel--empty">
    Выберите комнату, стену или проём на плане
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

.properties-panel__status {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid #edf0f3;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #5b6472;
}

.properties-panel__status-row {
  display: flex;
  gap: 6px;
}

.properties-panel__status-label {
  color: #8a93a2;
}

.properties-panel__ok {
  margin: 4px 0 0;
  color: #2f9e5c;
  font-size: 12px;
}

.properties-panel__conflict {
  margin: 4px 0 0;
  color: #d33a30;
  font-size: 12px;
}

.properties-panel--empty {
  color: #8a93a2;
  font-size: 14px;
  justify-content: center;
  align-items: center;
}
</style>
