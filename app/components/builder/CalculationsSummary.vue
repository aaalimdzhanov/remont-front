<script setup lang="ts">
const { document: buildingDocument } = useBuilding()

const calculated = computed(() => buildingDocument.value.calculated)
</script>

<template>
  <div class="calculations">
    <h3 class="calculations__title">
      Расчёты
    </h3>

    <div class="calculations__areas">
      <div class="calculations__row">
        <span>Площадь пола</span>
        <span>{{ calculated.areas.floor.toFixed(1) }} м²</span>
      </div>
      <div class="calculations__row">
        <span>Площадь потолка</span>
        <span>{{ calculated.areas.ceiling.toFixed(1) }} м²</span>
      </div>
      <div class="calculations__row">
        <span>Площадь стен</span>
        <span>{{ calculated.areas.wallGross.toFixed(1) }} м²</span>
      </div>
      <div class="calculations__row">
        <span>Двери</span>
        <span>{{ calculated.openings.doors.toFixed(1) }} м²</span>
      </div>
      <div class="calculations__row">
        <span>Окна</span>
        <span>{{ calculated.openings.windows.toFixed(1) }} м²</span>
      </div>
      <div class="calculations__row calculations__row--emphasis">
        <span>Чистые стены</span>
        <span>{{ calculated.areas.wallNet.toFixed(1) }} м²</span>
      </div>
    </div>

    <div class="calculations__stats">
      <div class="calculations__stat">
        <span class="calculations__stat-value">{{ calculated.statistics.roomCount }}</span>
        <span class="calculations__stat-label">Комнат</span>
      </div>
      <div class="calculations__stat">
        <span class="calculations__stat-value">{{ calculated.statistics.wallCount }}</span>
        <span class="calculations__stat-label">Стен</span>
      </div>
      <div class="calculations__stat">
        <span class="calculations__stat-value">{{ calculated.statistics.doorCount }}</span>
        <span class="calculations__stat-label">Дверей</span>
      </div>
      <div class="calculations__stat">
        <span class="calculations__stat-value">{{ calculated.statistics.windowCount }}</span>
        <span class="calculations__stat-label">Окон</span>
      </div>
    </div>

    <ul v-if="calculated.warnings.length" class="calculations__warnings">
      <li v-for="warning in calculated.warnings" :key="warning">
        ⚠ {{ warning }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.calculations {
  padding: 16px;
  border: 1px solid #e1e4ea;
  border-radius: 8px;
  background: #fff;
}

.calculations__title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2430;
}

.calculations__areas {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.calculations__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #5b6472;
}

.calculations__row--emphasis {
  padding-top: 6px;
  border-top: 1px solid #edf0f3;
  color: #1f2430;
  font-weight: 600;
}

.calculations__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.calculations__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 56px;
}

.calculations__stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #1f2430;
}

.calculations__stat-label {
  font-size: 11px;
  color: #8a93a2;
}

.calculations__warnings {
  margin: 14px 0 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: #fff4de;
  border: 1px solid #e8c67a;
  color: #6b5116;
  font-size: 12px;
  list-style: none;
}

.calculations__warnings li + li {
  margin-top: 4px;
}
</style>
