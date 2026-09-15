<script setup lang="ts">
import type { Opening } from '~/types/building'

const props = defineProps<{ opening: Opening }>()

const {
  moveOpening,
  resizeOpening,
  removeOpening,
  setDoorSwingDirection,
  isOpeningIntersecting,
  getIntersectingOpeningLabels,
} = useBuilding()

// Ширина/высота/отступ — модель хранит их в метрах, но для двери
// удобнее и точнее вводить мм (см. секцию 15 задания). round() при выводе
// убирает шум плавающей точки после snapToGrid (0.1 м -> 100 мм ровно).
const widthMm = ref(0)
const heightMm = ref(0)
const offsetMm = ref(0)

watch(
  () => props.opening,
  (opening) => {
    widthMm.value = Math.round(opening.dimensions.width * 1000)
    heightMm.value = Math.round(opening.dimensions.height * 1000)
    offsetMm.value = Math.round(opening.position.offset * 1000)
  },
  { immediate: true },
)

const hasConflict = computed(() => isOpeningIntersecting(props.opening.id))
const conflictLabels = computed(() => getIntersectingOpeningLabels(props.opening.id))

function applySize() {
  resizeOpening(props.opening.id, widthMm.value / 1000, heightMm.value / 1000)
  widthMm.value = Math.round(props.opening.dimensions.width * 1000)
  heightMm.value = Math.round(props.opening.dimensions.height * 1000)
  offsetMm.value = Math.round(props.opening.position.offset * 1000)
}

function applyOffset() {
  moveOpening(props.opening.id, offsetMm.value / 1000)
  offsetMm.value = Math.round(props.opening.position.offset * 1000)
}

function applySwing(event: Event) {
  setDoorSwingDirection(props.opening.id, (event.target as HTMLSelectElement).value as 'left' | 'right')
}

function handleDelete() {
  removeOpening(props.opening.id)
}
</script>

<template>
  <div class="properties">
    <div class="properties__header">
      <span class="properties__header-title">
        <UiIcon name="door" :size="18" />
        Дверь
      </span>
      <button type="button" class="btn btn-ghost btn-icon" aria-label="Удалить дверь" @click="handleDelete">
        <UiIcon name="trash" :size="16" />
      </button>
    </div>

    <label class="field">
      <span class="field__label">Ширина</span>
      <div class="field__unit-input">
        <input v-model.number="widthMm" type="number" min="500" step="100" class="input" @change="applySize">
        <span class="field__unit">мм</span>
      </div>
    </label>

    <label class="field">
      <span class="field__label">Высота</span>
      <div class="field__unit-input">
        <input v-model.number="heightMm" type="number" min="500" step="100" class="input" @change="applySize">
        <span class="field__unit">мм</span>
      </div>
    </label>

    <label class="field">
      <span class="field__label">Отступ от начала стены</span>
      <div class="field__unit-input">
        <input v-model.number="offsetMm" type="number" min="0" step="100" class="input" @change="applyOffset">
        <span class="field__unit">мм</span>
      </div>
    </label>

    <label class="field">
      <span class="field__label">Открывание</span>
      <select :value="opening.swing?.direction ?? 'left'" class="input" @change="applySwing">
        <option value="left">
          Налево
        </option>
        <option value="right">
          Направо
        </option>
      </select>
    </label>

    <p v-if="hasConflict" class="properties__conflict">
      <UiIcon name="alert" :size="14" />
      Пересечение с проёмом «{{ conflictLabels.join('», «') }}»
    </p>
  </div>
</template>
