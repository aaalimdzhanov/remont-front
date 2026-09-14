<script setup lang="ts">
const { document: buildingDocument, hasBuilding, createBuilding } = useBuilding()

const width = ref(10)
const length = ref(12)
const showJson = ref(true)
const viewMode = ref<'2d' | '3d'>('2d')

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
        <BuilderOpeningTool />

        <div class="builder__view-switch">
          <button
            type="button"
            class="builder__view-btn"
            :class="{ 'builder__view-btn--active': viewMode === '2d' }"
            @click="viewMode = '2d'"
          >
            План
          </button>
          <button
            type="button"
            class="builder__view-btn"
            :class="{ 'builder__view-btn--active': viewMode === '3d' }"
            @click="viewMode = '3d'"
          >
            3D
          </button>
        </div>

        <label class="builder__json-toggle">
          <input v-model="showJson" type="checkbox">
          Показать JSON
        </label>
      </div>

      <div class="builder__main">
        <BuilderPlan2D v-if="viewMode === '2d'" class="builder__plan" />
        <div v-else class="builder__plan">
          <ClientOnly>
            <BuilderViewer3D />
            <template #fallback>
              <div class="builder__viewer-fallback">
                Загрузка 3D…
              </div>
            </template>
          </ClientOnly>
        </div>

        <div class="builder__sidebar">
          <BuilderPropertiesPanel />
          <BuilderCalculationsSummary />
        </div>
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

.builder__view-switch {
  display: flex;
  border: 1px solid #d6dae1;
  border-radius: 6px;
  overflow: hidden;
}

.builder__view-btn {
  padding: 7px 14px;
  border: none;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  color: #5b6472;
}

.builder__view-btn + .builder__view-btn {
  border-left: 1px solid #d6dae1;
}

.builder__view-btn--active {
  background: #2f7fd1;
  color: #fff;
}

.builder__viewer-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 480px;
  border: 1px solid #e1e4ea;
  border-radius: 8px;
  color: #8a93a2;
  font-size: 14px;
}

.builder__main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.builder__plan {
  flex: 1 1 480px;
  /* Без этого флекс-элемент не может сжаться уже своего контента: канвас
     3D-сцены передаёт свой width-атрибут как контентный минимум, из-за чего
     ResizeObserver в Viewer3D.vue раз за разом чуть увеличивал контейнер,
     canvas подстраивался под новый размер — и так по кругу, без остановки
     (в Chrome это видно, в Safari — нет, там другая реализация flexbox). */
  min-width: 0;
}

.builder__sidebar {
  flex: 0 0 240px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
