<script setup lang="ts">
import type { Opening } from '~/types/building'

const props = defineProps<{ opening: Opening }>()

const {
  moveOpening,
  resizeOpening,
  setOpeningSillHeight,
  removeOpening,
  isOpeningIntersecting,
  getIntersectingOpeningLabels,
} = useBuilding()

const widthMm = ref(0)
const heightMm = ref(0)
const offsetMm = ref(0)
const sillMm = ref(0)

watch(
  () => props.opening,
  (opening) => {
    widthMm.value = Math.round(opening.dimensions.width * 1000)
    heightMm.value = Math.round(opening.dimensions.height * 1000)
    offsetMm.value = Math.round(opening.position.offset * 1000)
    sillMm.value = Math.round(opening.position.bottom * 1000)
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
  sillMm.value = Math.round(props.opening.position.bottom * 1000)
}

function applyOffset() {
  moveOpening(props.opening.id, offsetMm.value / 1000)
  offsetMm.value = Math.round(props.opening.position.offset * 1000)
}

function applySill() {
  setOpeningSillHeight(props.opening.id, sillMm.value / 1000)
  sillMm.value = Math.round(props.opening.position.bottom * 1000)
}

function handleDelete() {
  removeOpening(props.opening.id)
}
</script>

<template>
  <div class="properties">
    <div class="properties__header">
      <span class="properties__header-title">
        <UiIcon name="window" :size="18" />
        Окно
      </span>
      <button type="button" class="btn btn-ghost btn-icon" aria-label="Удалить окно" @click="handleDelete">
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
      <span class="field__label">Высота подоконника</span>
      <div class="field__unit-input">
        <input v-model.number="sillMm" type="number" min="0" step="100" class="input" @change="applySill">
        <span class="field__unit">мм</span>
      </div>
    </label>

    <p v-if="hasConflict" class="properties__conflict">
      <UiIcon name="alert" :size="14" />
      Пересечение с проёмом «{{ conflictLabels.join('», «') }}»
    </p>
  </div>
</template>
