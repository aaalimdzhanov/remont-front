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
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
}

.calculations__title {
  margin: 0 0 var(--space-3);
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
}

.calculations__areas {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.calculations__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
}

.calculations__row--emphasis {
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  color: var(--color-text);
  font-weight: 600;
}

.calculations__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.calculations__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 56px;
}

.calculations__stat-value {
  font-size: var(--font-h3-size);
  font-weight: 600;
  color: var(--color-text);
}

.calculations__stat-label {
  font-size: var(--font-caption-size);
  color: var(--color-text-muted);
}

.calculations__warnings {
  margin: var(--space-4) 0 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-input);
  background: var(--color-warning-subtle);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--font-caption-size);
  list-style: none;
}

.calculations__warnings li + li {
  margin-top: var(--space-1);
}
</style>
