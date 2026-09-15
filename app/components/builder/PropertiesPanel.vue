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
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  min-width: 220px;
}

.properties-panel__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
}

.properties-panel label {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
}

.properties-panel input {
  height: 36px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-input);
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  color: var(--color-text);
}

.properties-panel input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.properties-panel__delete {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-button);
  border: 1px solid var(--color-error);
  background: var(--color-surface);
  color: var(--color-error);
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  cursor: pointer;
}

.properties-panel__delete:hover {
  background: var(--color-error-subtle);
}

.properties-panel__status {
  margin-top: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--font-caption-size);
  color: var(--color-text-secondary);
}

.properties-panel__status-row {
  display: flex;
  gap: var(--space-2);
}

.properties-panel__status-label {
  color: var(--color-text-muted);
}

.properties-panel__ok {
  margin: var(--space-1) 0 0;
  color: var(--color-success);
  font-size: var(--font-caption-size);
}

.properties-panel__conflict {
  margin: var(--space-1) 0 0;
  color: var(--color-error);
  font-size: var(--font-caption-size);
}

.properties-panel--empty {
  color: var(--color-text-muted);
  font-size: var(--font-body-size);
  justify-content: center;
  align-items: center;
  text-align: center;
}
</style>
