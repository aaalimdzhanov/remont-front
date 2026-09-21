<script setup lang="ts">
// Screen 2 — выбор помещения. Комнаты берутся из реального Building JSON
// (useBuilding), никакого hardcode. room_id, который в итоге уйдёт в
// ProjectWork, — это room.id как есть, без генерации нового id (см. задание).
import { calculateRoomArea } from '~/geometry/calculations'

const emit = defineEmits<{ select: [roomId: string | null] }>()

const { document: buildingDocument } = useBuilding()
const rooms = computed(() => buildingDocument.value.building.rooms)
</script>

<template>
  <div class="room-step">
    <p class="text-h3 room-step__title">
      Выберите помещение
    </p>

    <div v-if="rooms.length === 0" class="room-step__empty text-secondary">
      В плане пока нет ни одной комнаты — можно добавить работу для всего проекта.
    </div>

    <ul v-else class="room-step__list">
      <li v-for="room in rooms" :key="room.id">
        <button type="button" class="room-step__item" @click="emit('select', room.id)">
          <span class="room-step__thumb">
            <WorkRoomPreviewThumb :building="buildingDocument.building" :room-id="room.id" />
          </span>
          <span class="room-step__info">
            <span class="room-step__name">{{ room.name }}</span>
            <span class="text-caption text-muted">{{ calculateRoomArea(room).toFixed(1) }} м²</span>
          </span>
          <UiIcon name="chevron-left" :size="16" class="room-step__chevron" />
        </button>
      </li>
    </ul>

    <button type="button" class="room-step__project-level" @click="emit('select', null)">
      <span class="room-step__checkbox" aria-hidden="true" />
      <span>
        Работа для всего проекта
        <span class="text-caption text-muted room-step__project-hint">(не привязана к комнате)</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.room-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.room-step__title {
  margin: 0;
}

.room-step__empty {
  padding: var(--space-4);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card);
}

.room-step__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.room-step__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.room-step__item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.room-step__thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
}

.room-step__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.room-step__name {
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-step__chevron {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transform: rotate(180deg);
}

.room-step__project-level {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: none;
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: var(--font-body-size);
  cursor: pointer;
  text-align: left;
}

.room-step__project-level:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-subtle);
}

.room-step__checkbox {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: 1px solid var(--color-border-strong);
  border-radius: 4px;
}

.room-step__project-hint {
  display: block;
}
</style>
