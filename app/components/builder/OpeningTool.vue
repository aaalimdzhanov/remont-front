<script setup lang="ts">
const { pendingOpeningType, beginPlacingOpening, cancelPlacingOpening } = useBuilding()
</script>

<template>
  <div class="opening-tool">
    <template v-if="!pendingOpeningType">
      <button type="button" class="opening-tool__btn" @click="beginPlacingOpening('door')">
        + Дверь
      </button>
      <button type="button" class="opening-tool__btn" @click="beginPlacingOpening('window')">
        + Окно
      </button>
    </template>

    <div v-else class="opening-tool__hint">
      <span>
        Кликните по стене, чтобы добавить {{ pendingOpeningType === 'door' ? 'дверь' : 'окно' }}
      </span>
      <button type="button" class="opening-tool__cancel" @click="cancelPlacingOpening">
        Отмена
      </button>
    </div>
  </div>
</template>

<style scoped>
.opening-tool {
  display: flex;
  align-items: center;
  gap: 8px;
}

.opening-tool__btn {
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid #d6dae1;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
}

.opening-tool__btn:hover {
  background: #f5f6f8;
}

.opening-tool__hint {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #fff4de;
  border: 1px solid #e8c67a;
  font-size: 13px;
  color: #6b5116;
}

.opening-tool__cancel {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #d6dae1;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
</style>
