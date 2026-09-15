<script setup lang="ts">
const { document: buildingDocument, hasBuilding, createBuilding } = useBuilding()

const width = ref(10)
const length = ref(12)
const showJson = ref(false)
const viewMode = ref<'2d' | '3d'>('2d')

function submitBuildingForm() {
  if (width.value <= 0 || length.value <= 0) return
  createBuilding(width.value, length.value)
}
</script>

<template>
  <div class="builder">
    <div v-if="!hasBuilding" class="builder__setup">
      <div class="card builder__setup-card">
        <h2 class="text-h2">
          Создание здания
        </h2>
        <p class="text-secondary builder__setup-hint">
          Укажите внешние размеры здания, чтобы начать планировку.
        </p>
        <form class="builder__setup-form" @submit.prevent="submitBuildingForm">
          <label class="field">
            <span class="field__label">Ширина, м</span>
            <input v-model.number="width" type="number" min="1" step="0.1" class="input" required>
          </label>
          <label class="field">
            <span class="field__label">Длина, м</span>
            <input v-model.number="length" type="number" min="1" step="0.1" class="input" required>
          </label>
          <button type="submit" class="btn btn-primary">
            Создать здание
          </button>
        </form>
      </div>
    </div>

    <div v-else class="builder__workspace">
      <aside class="builder__tools panel">
        <BuilderRoomTool />
        <BuilderOpeningTool />
      </aside>

      <div class="builder__canvas-area">
        <div class="builder__canvas-toolbar">
          <div class="builder__view-switch">
            <button
              type="button"
              class="builder__view-btn"
              :class="{ 'builder__view-btn--active': viewMode === '2d' }"
              @click="viewMode = '2d'"
            >
              <UiIcon name="grid-2d" :size="16" />
              2D
            </button>
            <button
              type="button"
              class="builder__view-btn"
              :class="{ 'builder__view-btn--active': viewMode === '3d' }"
              @click="viewMode = '3d'"
            >
              <UiIcon name="cube-3d" :size="16" />
              3D
            </button>
          </div>

          <button type="button" class="btn btn-ghost btn-sm" @click="showJson = !showJson">
            {{ showJson ? 'Скрыть JSON' : 'Building JSON' }}
          </button>
        </div>

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

        <pre v-if="showJson" class="builder__json">{{ JSON.stringify(buildingDocument, null, 2) }}</pre>
      </div>

      <div class="builder__sidebar">
        <BuilderPropertiesPanel />
        <BuilderCalculationsSummary />
      </div>
    </div>
  </div>
</template>

<style scoped>
.builder {
  padding: var(--space-6);
}

.builder__setup {
  display: flex;
  justify-content: center;
  padding-top: var(--space-16);
}

.builder__setup-card {
  padding: var(--space-8);
  max-width: 360px;
  width: 100%;
}

.builder__setup-hint {
  margin: var(--space-2) 0 var(--space-6);
}

.builder__setup-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.builder__workspace {
  display: grid;
  grid-template-columns: 168px 1fr 260px;
  gap: var(--space-5);
  align-items: start;
}

.builder__tools {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  position: sticky;
  top: var(--space-4);
}

.builder__canvas-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.builder__canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.builder__view-switch {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  overflow: hidden;
}

.builder__view-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: none;
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-small-size);
  cursor: pointer;
  color: var(--color-text-secondary);
}

.builder__view-btn + .builder__view-btn {
  border-left: 1px solid var(--color-border);
}

.builder__view-btn--active {
  background: var(--color-primary-subtle);
  color: var(--color-text);
  font-weight: 500;
}

.builder__viewer-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 480px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  color: var(--color-text-muted);
  font-size: var(--font-body-size);
  background: var(--color-surface);
}

.builder__plan {
  /* Без этого флекс/grid-элемент не может сжаться уже своего контента: канвас
     3D-сцены передаёт свой width-атрибут как контентный минимум, из-за чего
     ResizeObserver в Viewer3D.vue раз за разом чуть увеличивал контейнер,
     canvas подстраивался под новый размер — и так по кругу, без остановки
     (в Chrome это видно, в Safari — нет, там другая реализация flexbox). */
  min-width: 0;
}

.builder__sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  position: sticky;
  top: var(--space-4);
}

.builder__json {
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-panel);
  background: #1f2430;
  color: #d7e0ea;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 400px;
}

@media (max-width: 1100px) {
  .builder__workspace {
    grid-template-columns: 1fr;
  }

  .builder__tools {
    position: static;
  }

  .builder__sidebar {
    position: static;
  }
}

/* Mobile composition, не "сжатый desktop": инструменты — компактная
   горизонтальная прокручиваемая полоса над канвасом (а не левая колонка,
   которая на узком экране просто налезала бы на остальное), свойства и
   расчёты — блоками под канвасом. Editor logic не меняется, только layout. */
@media (max-width: 640px) {
  .builder {
    padding: var(--space-3);
  }

  .builder__workspace {
    gap: var(--space-3);
  }

  .builder__tools {
    flex-direction: row;
    overflow-x: auto;
    gap: var(--space-2);
    -webkit-overflow-scrolling: touch;
  }

  .builder__tools :deep(.tool-btn) {
    flex: 0 0 auto;
    width: auto;
  }

  .builder__tools :deep(.room-tool__form),
  .builder__tools :deep(.opening-tool__hint) {
    position: fixed;
    left: var(--space-3);
    right: var(--space-3);
    bottom: var(--space-3);
    z-index: 20;
    box-shadow: var(--shadow-modal);
  }

  .builder__canvas-toolbar {
    flex-wrap: wrap;
  }
}
</style>
