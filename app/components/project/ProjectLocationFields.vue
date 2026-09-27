<script setup lang="ts">
// Город/Район — два связанных <select>, переиспользуются и в форме
// /projects/new (всегда видимые поля), и в панели редактирования location
// на /projects/{id} (см. EditorHeader.vue) — тот же приём, что уже
// использует MarketplaceFilterFields.vue для категории/вида работы (общий
// компонент полей, а не две копии одной формы).
//
// Контролируемый компонент: сам ничего не сохраняет и не знает про
// Location|null — родитель передаёт текущие city/district строками и решает,
// когда/как собрать их в Location для API (см. utils/location.ts
// setLocationCity/setLocationDistrict — тем же местом, где это тестируется
// как чистые функции, раз тут нет @vue/test-utils для рендер-тестов).
import { districtsForCity, LOCATION_CITIES, locationDisplayName } from '~/utils/location'

const props = defineProps<{ city: string, district: string }>()
const emit = defineEmits<{ 'update:city': [string], 'update:district': [string] }>()

const { t, locale } = useI18n()

const districts = computed(() => districtsForCity(props.city))
function displayName(name: string): string {
  return locationDisplayName(name, locale.value)
}

function handleCityChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update:city', value)
  // Смена города всегда сбрасывает район (см. задание, секция VALIDATION:
  // "если city изменился — старый district должен быть сброшен").
  emit('update:district', '')
}

function handleDistrictChange(event: Event) {
  emit('update:district', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="project-location-fields">
    <label class="field">
      <span class="field__label">{{ t('location.city') }}</span>
      <select class="input" :value="city" @change="handleCityChange">
        <option value="">
          {{ t('location.selectCity') }}
        </option>
        <option v-for="c in LOCATION_CITIES" :key="c" :value="c">
          {{ displayName(c) }}
        </option>
      </select>
    </label>

    <label class="field">
      <span class="field__label">{{ t('location.district') }}</span>
      <select class="input" :value="district" :disabled="!city" @change="handleDistrictChange">
        <option value="">
          {{ city ? t('location.selectDistrict') : t('location.selectCityFirst') }}
        </option>
        <option v-for="d in districts" :key="d" :value="d">
          {{ displayName(d) }}
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.project-location-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
