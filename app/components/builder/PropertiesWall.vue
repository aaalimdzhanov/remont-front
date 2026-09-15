<script setup lang="ts">
import type { Wall } from '~/types/building'
import { wallLength } from '~/geometry/walls'

const props = defineProps<{ wall: Wall }>()

// Стена — производная геометрия комнат (см. app/geometry/walls.ts): тип,
// толщина и длина пересчитываются заново при КАЖДОМ изменении комнат, ручное
// значение здесь было бы молча стёрто при следующем move/resize. Поэтому эти
// поля — честно readonly, а не притворно editable input, который ничего не
// сохраняет. Высота отражает floor.height (редактируется через "Помещение").
const length = computed(() => wallLength(props.wall))
</script>

<template>
  <div class="properties">
    <div class="properties__header">
      <span class="properties__header-title">
        <UiIcon name="wall" :size="18" />
        Стена
      </span>
    </div>

    <label class="field">
      <span class="field__label">Тип стены</span>
      <input :value="wall.type === 'interior' ? 'Внутренняя' : 'Внешняя'" type="text" class="input" readonly disabled>
    </label>

    <label class="field">
      <span class="field__label">Длина</span>
      <div class="field__unit-input">
        <input :value="length.toFixed(2)" type="text" class="input" readonly disabled>
        <span class="field__unit">м</span>
      </div>
    </label>

    <label class="field">
      <span class="field__label">Высота</span>
      <div class="field__unit-input">
        <input :value="wall.height.toFixed(2)" type="text" class="input" readonly disabled>
        <span class="field__unit">м</span>
      </div>
    </label>

    <label class="field">
      <span class="field__label">Толщина</span>
      <div class="field__unit-input">
        <input :value="Math.round(wall.thickness * 1000)" type="text" class="input" readonly disabled>
        <span class="field__unit">мм</span>
      </div>
    </label>

    <p class="text-caption text-muted">
      Стена определяется границами помещений — чтобы изменить её,
      измените или удалите смежное помещение.
    </p>
  </div>
</template>
