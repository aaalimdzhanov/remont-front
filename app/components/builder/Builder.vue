<script setup lang="ts">
const { document: buildingDocument, hasBuilding, createBuilding } = useBuilding()

const width = ref(10)
const length = ref(12)
const showJson = ref(true)

function submitBuildingForm() {
  if (width.value <= 0 || length.value <= 0) return
  createBuilding(width.value, length.value)
}
</script>

<template>
  <div class="builder">
    <div v-if="!hasBuilding" class="builder__setup">
      <h2>Создание здания</h2>
      <form class="builder__setup-form" @submit.prevent="submitBuildingForm">
        <label>
          Ширина, м
          <input v-model.number="width" type="number" min="1" step="0.1" required>
        </label>
        <label>
          Длина, м
          <input v-model.number="length" type="number" min="1" step="0.1" required>
        </label>
        <button type="submit">Создать здание</button>
      </form>
    </div>

    <div v-else class="builder__workspace">
      <div class="builder__toolbar">
        <BuilderRoomTool />
        <label class="builder__json-toggle">
          <input v-model="showJson" type="checkbox">
          Показать JSON
        </label>
      </div>

      <div class="builder__main">
        <BuilderPlan2D class="builder__plan" />
        <BuilderPropertiesPanel class="builder__properties" />
      </div>

      <pre v-if="showJson" class="builder__json">{{ JSON.stringify(buildingDocument, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.builder {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.builder__setup {
  padding: 20px;
  border: 1px solid #e1e4ea;
  border-radius: 8px;
  background: #fff;
  max-width: 360px;
}

.builder__setup h2 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #1f2430;
}

.builder__setup-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.builder__setup-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #5b6472;
}

.builder__setup-form input {
  padding: 7px 8px;
  border: 1px solid #d6dae1;
  border-radius: 4px;
  font-size: 14px;
}

.builder__setup-form button {
  margin-top: 4px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #2f7fd1;
  background: #2f7fd1;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.builder__workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.builder__toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.builder__json-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #5b6472;
  cursor: pointer;
}

.builder__main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.builder__plan {
  flex: 1 1 480px;
}

.builder__properties {
  flex: 0 0 240px;
}

.builder__json {
  margin: 0;
  padding: 12px;
  border: 1px solid #e1e4ea;
  border-radius: 8px;
  background: #1f2430;
  color: #d7e0ea;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 400px;
}
</style>
