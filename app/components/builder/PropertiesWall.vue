<script setup lang="ts">
import type { Wall } from '~/types/building'
import { wallLength } from '~/geometry/walls'

const props = defineProps<{ wall: Wall }>()

const { t } = useI18n()

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
        {{ t('builder.wall') }}
      </span>
    </div>

    <label class="field">
      <span class="field__label">{{ t('builder.wallTypeLabel') }}</span>
      <input :value="wall.type === 'interior' ? t('builder.wallType.interior') : t('builder.wallType.exterior')" type="text" class="input" readonly disabled>
    </label>

    <label class="field">
      <span class="field__label">{{ t('builder.lengthShort') }}</span>
      <div class="field__unit-input">
        <input :value="length.toFixed(2)" type="text" class="input" readonly disabled>
        <span class="field__unit">{{ t('builder.unit.m') }}</span>
      </div>
    </label>

    <label class="field">
      <span class="field__label">{{ t('builder.heightLabel') }}</span>
      <div class="field__unit-input">
        <input :value="wall.height.toFixed(2)" type="text" class="input" readonly disabled>
        <span class="field__unit">{{ t('builder.unit.m') }}</span>
      </div>
    </label>

    <label class="field">
      <span class="field__label">{{ t('builder.thicknessLabel') }}</span>
      <div class="field__unit-input">
        <input :value="Math.round(wall.thickness * 1000)" type="text" class="input" readonly disabled>
        <span class="field__unit">{{ t('builder.unit.mm') }}</span>
      </div>
    </label>

    <p class="text-caption text-muted">
      {{ t('builder.wallReadonlyHint') }}
    </p>
  </div>
</template>
