<script setup lang="ts">
import type { Room, RoomType } from '~/types/building'

const props = defineProps<{ room: Room }>()

const {
  document: buildingDocument,
  resizeRoom,
  renameRoom,
  setRoomType,
  setFloorHeight,
  removeRoom,
  isRoomIntersecting,
  getIntersectingRoomNames,
} = useBuilding()

const { t } = useI18n()

const roomTypeValues: RoomType[] = ['living_room', 'bedroom', 'kitchen', 'bathroom', 'hallway', 'other']

const name = ref('')
const width = ref(0)
const length = ref(0)
const ceilingHeight = ref(0)
const sizeWarning = ref('')

const floor = computed(() => buildingDocument.value.building.floors.find(f => f.id === props.room.floor_id) ?? null)

watch(
  () => props.room,
  (room) => {
    if (room.geometry.type !== 'rectangle') return
    name.value = room.name
    width.value = room.geometry.width
    length.value = room.geometry.length
    sizeWarning.value = ''
  },
  { immediate: true },
)

watch(floor, (f) => {
  ceilingHeight.value = f?.height ?? 0
}, { immediate: true })

const area = computed(() => (props.room.geometry.type === 'rectangle' ? props.room.geometry.width * props.room.geometry.length : 0))
const perimeter = computed(() => (props.room.geometry.type === 'rectangle' ? 2 * (props.room.geometry.width + props.room.geometry.length) : 0))

const hasConflict = computed(() => isRoomIntersecting(props.room.id))
const conflictNames = computed(() => getIntersectingRoomNames(props.room.id))

function applyName() {
  renameRoom(props.room.id, name.value.trim() || props.room.name)
}

function applySize() {
  resizeRoom(props.room.id, width.value, length.value)
  const geometry = props.room.geometry
  if (geometry.type !== 'rectangle') return
  // resizeRoom привязывает к сетке 0.1 м и минимуму 0.5 м — если запрошенное
  // значение отличается от фактически сохранённого, это и есть тот самый
  // constraint модели, который стоит показать пользователю (не NaN/silent).
  const widthClamped = Math.abs(geometry.width - width.value) > 1e-6
  const lengthClamped = Math.abs(geometry.length - length.value) > 1e-6
  sizeWarning.value = widthClamped || lengthClamped ? t('builder.minRoomSizeWarning') : ''
  width.value = geometry.width
  length.value = geometry.length
}

function applyType(event: Event) {
  setRoomType(props.room.id, (event.target as HTMLSelectElement).value as RoomType)
}

function applyCeilingHeight() {
  if (!floor.value) return
  setFloorHeight(floor.value.id, ceilingHeight.value)
  ceilingHeight.value = floor.value.height
}

function handleDelete() {
  removeRoom(props.room.id)
}
</script>

<template>
  <div class="properties">
    <div class="properties__header">
      <span class="properties__header-title">
        <UiIcon name="room" :size="18" />
        {{ t('builder.room') }}
      </span>
      <button type="button" class="btn btn-ghost btn-icon" :aria-label="t('builder.deleteRoomAriaLabel')" @click="handleDelete">
        <UiIcon name="trash" :size="16" />
      </button>
    </div>

    <label class="field">
      <span class="field__label">{{ t('builder.nameLabel') }}</span>
      <input v-model="name" type="text" class="input" @change="applyName">
    </label>

    <div class="properties__row">
      <label class="field">
        <span class="field__label">{{ t('builder.widthShort') }}</span>
        <div class="field__unit-input">
          <input v-model.number="width" type="number" min="0.5" step="0.1" class="input" @change="applySize">
          <span class="field__unit">{{ t('builder.unit.m') }}</span>
        </div>
      </label>
      <label class="field">
        <span class="field__label">{{ t('builder.lengthShort') }}</span>
        <div class="field__unit-input">
          <input v-model.number="length" type="number" min="0.5" step="0.1" class="input" @change="applySize">
          <span class="field__unit">{{ t('builder.unit.m') }}</span>
        </div>
      </label>
    </div>
    <p v-if="sizeWarning" class="properties__warning">
      {{ sizeWarning }}
    </p>

    <label class="field">
      <span class="field__label">{{ t('builder.areaLabel') }}</span>
      <div class="field__unit-input">
        <input :value="area.toFixed(1)" type="text" class="input" readonly disabled>
        <span class="field__unit">{{ t('builder.unit.m2') }}</span>
      </div>
    </label>

    <label class="field">
      <span class="field__label">{{ t('builder.perimeterLabel') }}</span>
      <div class="field__unit-input">
        <input :value="perimeter.toFixed(1)" type="text" class="input" readonly disabled>
        <span class="field__unit">{{ t('builder.unit.m') }}</span>
      </div>
    </label>

    <label class="field">
      <span class="field__label">{{ t('builder.ceilingHeightLabel') }}</span>
      <div class="field__unit-input">
        <input v-model.number="ceilingHeight" type="number" min="2" step="0.1" class="input" @change="applyCeilingHeight">
        <span class="field__unit">{{ t('builder.unit.m') }}</span>
      </div>
    </label>

    <label class="field">
      <span class="field__label">{{ t('builder.roomTypeLabel') }}</span>
      <select :value="room.type" class="input" @change="applyType">
        <option v-for="value in roomTypeValues" :key="value" :value="value">
          {{ t(`builder.roomTypes.${value}`) }}
        </option>
      </select>
    </label>

    <p v-if="hasConflict" class="properties__conflict">
      <UiIcon name="alert" :size="14" />
      {{ t('builder.roomIntersection', { names: conflictNames.join('», «') }) }}
    </p>
  </div>
</template>

<style scoped>
.properties__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
</style>
