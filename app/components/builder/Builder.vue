<script setup lang="ts">
const { hasBuilding, createBuilding, cancelPlacingOpening, deleteSelected, selectedObject, clearSelection, pendingOpeningType } = useBuilding()
const { showDimensions, toggleDimensions, roomDrawActive, deactivateRoomDraw } = useEditorView()
const { t } = useI18n()

const width = ref(10)
const length = ref(12)
const viewMode = ref<'2d' | '3d'>('2d')

// "Выделить" — активный инструмент по умолчанию, пока не включён режим
// рисования помещения или ожидания клика для двери/окна (см. RoomTool.vue/
// OpeningTool.vue — у них уже есть свой active-индикатор через те же
// roomDrawActive/pendingOpeningType, здесь просто зеркальное условие).
const isSelectToolActive = computed(() => !roomDrawActive.value && !pendingOpeningType.value)

function submitBuildingForm() {
  if (width.value <= 0 || length.value <= 0) return
  createBuilding(width.value, length.value)
}

// Инструмент "Выделить" должен снимать любой активный режим ожидания клика —
// и "+ Дверь"/"+ Окно" (уже было), и рисование помещения протяжкой (новое).
function activateSelectTool() {
  cancelPlacingOpening()
  deactivateRoomDraw()
}

// 2D = редактирование, 3D = просмотр (см. задание "ИСПРАВИТЬ UX BUILDER В
// РЕЖИМЕ 3D"). Переключение в любую сторону сбрасывает активный
// инструмент в Select — заходя в 3D, нельзя "унести" туда открытый
// pending opening/room draw (иначе Plan2D, которого в 3D даже нет в DOM,
// никогда не получит клик, которого ждёт подсказка "Нарисуйте
// прямоугольник..." — ровно баг из задания); выходя обратно в 2D,
// пользователь намеренно не получает старый инструмент автоматически
// (задание, секция 4: "более предсказуемый UX") — сам решает, что делать
// дальше. Room/Door/Window-кнопки в 3D скрыты в template ниже (v-if), сами
// addRoom/addOpening не менялись.
watch(viewMode, activateSelectTool)

// Клавиатурные шорткаты (V/R/D/O/M/Delete/Escape) — только в 2D-режиме и
// только пока фокус не в поле ввода (иначе, например, буква "р" при наборе
// "Гостиная" переключала бы инструмент вместо ввода текста). W/T/Ctrl+Z не
// назначены — в редакторе нет инструмента стен, текстовых аннотаций и истории
// отмены (см. итоговый отчёт — это осознанно отложено, а не забыто).
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function triggerTool(tool: string) {
  document.querySelector<HTMLElement>(`[data-tool="${tool}"]`)?.click()
}

function onKeydown(event: KeyboardEvent) {
  if (viewMode.value !== '2d') return
  if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return

  switch (event.key) {
    case 'v':
    case 'V':
      activateSelectTool()
      break
    case 'r':
    case 'R':
      triggerTool('room')
      break
    case 'd':
    case 'D':
      triggerTool('door')
      break
    case 'o':
    case 'O':
      triggerTool('window')
      break
    case 'm':
    case 'M':
      toggleDimensions()
      break
    case 'Delete':
    case 'Backspace':
      event.preventDefault()
      deleteSelected()
      break
    case 'Escape':
      // Во время рисования помещения — отменяет текущий preview, ничего не
      // создавая (Plan2D сбрасывает свою локальную drag-протяжку по watch за
      // roomDrawActive). Если рисование не активно — снимает режим ожидания
      // клика для двери/окна, если он был включён. Building JSON не трогается.
      activateSelectTool()
      break
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="builder">
    <div v-if="!hasBuilding" class="builder__setup">
      <div class="card builder__setup-card">
        <h2 class="text-h2">
          {{ t('builder.setupTitle') }}
        </h2>
        <p class="text-secondary builder__setup-hint">
          {{ t('builder.setupHint') }}
        </p>
        <form class="builder__setup-form" @submit.prevent="submitBuildingForm">
          <label class="field">
            <span class="field__label">{{ t('builder.widthLabel') }}</span>
            <input v-model.number="width" type="number" min="1" step="0.1" class="input" required>
          </label>
          <label class="field">
            <span class="field__label">{{ t('builder.lengthLabel') }}</span>
            <input v-model.number="length" type="number" min="1" step="0.1" class="input" required>
          </label>
          <button type="submit" class="btn btn-primary">
            {{ t('builder.createBuilding') }}
          </button>
        </form>
      </div>
    </div>

    <div v-else class="builder__workspace">
      <aside class="builder__tools panel">
        <button
          type="button"
          class="tool-btn"
          :class="{ 'tool-btn--active': isSelectToolActive }"
          data-tool="select"
          :aria-label="t('builder.selectToolAriaLabel')"
          :aria-pressed="isSelectToolActive"
          @click="activateSelectTool"
        >
          <UiIcon name="select" :size="18" />
          {{ t('builder.select') }}
        </button>
        <!-- 3D = просмотр, не редактирование (см. задание "ИСПРАВИТЬ UX
             BUILDER В РЕЖИМЕ 3D") — Помещение/Дверь/Окно скрыты, а не
             disabled: в 3D создавать геометрию нельзя в принципе (Plan2D,
             на клик по которому они рассчитаны, здесь даже не в DOM). -->
        <template v-if="viewMode === '2d'">
          <BuilderRoomTool />
          <BuilderOpeningTool />
        </template>
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

          <!-- "Размеры" — та же showDimensions/toggleDimensions из
               useEditorView(), что и клавиша M (см. onKeydown выше) и что
               раньше показывалась отдельной кнопкой в левой панели
               инструментов: один и тот же state, просто здесь ей место
               рядом с переключателем вида, а не среди инструментов
               рисования. Building JSON (техническая деталь архитектуры)
               сюда больше не выводится — пользователь не должен её видеть,
               сам документ никуда не делся (см. useBuilding()). -->
          <button
            type="button"
            class="builder__dimensions-toggle"
            :class="{ 'builder__dimensions-toggle--active': showDimensions }"
            :aria-label="t('builder.dimensionsAriaLabel')"
            :aria-pressed="showDimensions"
            @click="toggleDimensions"
          >
            <UiIcon v-if="showDimensions" name="check" :size="14" />
            <UiIcon v-else name="dimension" :size="16" />
            {{ t('builder.dimensions') }}
          </button>
        </div>

        <BuilderPlan2D v-if="viewMode === '2d'" class="builder__plan" />
        <div v-else class="builder__plan">
          <ClientOnly>
            <BuilderViewer3D />
            <template #fallback>
              <div class="builder__viewer-fallback">
                {{ t('builder.loading3d') }}
              </div>
            </template>
          </ClientOnly>
        </div>

        <BuilderStatusBar v-if="viewMode === '2d'" />
      </div>

      <div class="builder__sidebar">
        <!-- На мобильном (см. @media 640px ниже) эта же панель становится
             bottom sheet, а не просто блоком под канвасом: открывается по
             выделению объекта, закрывается кнопкой/тапом по фону — на
             десктопе класс и кнопка закрытия ничего не меняют. -->
        <div class="builder__properties" :class="{ 'builder__properties--sheet': selectedObject }">
          <button
            v-if="selectedObject"
            type="button"
            class="btn btn-ghost btn-sm builder__sheet-close"
            :aria-label="t('builder.closePropertiesAriaLabel')"
            @click="clearSelection"
          >
            <UiIcon name="close" :size="14" />
            {{ t('common.close') }}
          </button>
          <BuilderPropertiesPanel />
        </div>
        <BuilderCalculationsSummary />
      </div>

      <div
        v-if="selectedObject"
        class="builder__sheet-backdrop"
        aria-hidden="true"
        @click="clearSelection"
      />
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

.builder__sheet-close {
  display: none;
}

.builder__sheet-backdrop {
  display: none;
}

.builder__dimensions-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 32px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-button);
  background: var(--color-surface);
  font-family: var(--font-family);
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.builder__dimensions-toggle:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.builder__dimensions-toggle--active {
  background: var(--color-primary-subtle);
  border-color: var(--color-primary);
  color: var(--color-text);
  font-weight: 500;
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

  /* 4 равные колонки (25% каждая), а не flex-row + justify-content:center —
     тот подход центрировал ГРУППУ как единый блок, но сами колонки внутри
     оставались неравными (ширина каждой кнопки зависела от длины текста).
     minmax(0,1fr) даёт колонкам одинаковую ширину и позволяет им сжиматься
     ниже natural content width, не создавая horizontal overflow. */
  .builder__tools {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-1);
    padding: var(--space-2);
  }

  /* .room-tool/.opening-tool — обёртки, нужные для desktop-колонки (там это
     просто div с одной/двумя кнопками). На mobile display:contents убирает
     сам div из раскладки, и его кнопки (в т.ч. обе — Дверь и Окно) становятся
     прямыми grid-элементами .builder__tools — иначе "Дверь"+"Окно" оказались
     бы зажаты вдвоём в одну четверть ширины вместо того, чтобы занять по
     отдельной равной колонке каждая. Их fixed-position hint-блоки (см. ниже)
     это не затрагивает — position:fixed выводит их из grid-раскладки. */
  .builder__tools :deep(.room-tool),
  .builder__tools :deep(.opening-tool) {
    display: contents;
  }

  /* Компактная квадратная кнопка (иконка сверху, подпись снизу), каждая
     занимает свою колонку целиком и центрирует содержимое внутри неё. */
  .builder__tools :deep(.tool-btn) {
    width: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 52px;
    padding: var(--space-1);
    font-size: 11px;
    line-height: 1.2;
    white-space: normal;
    text-align: center;
  }

  .builder__tools :deep(.room-tool__hint),
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

  /* Properties Panel как bottom sheet: открывается по выделению объекта,
     не перекрывает экран целиком (max-height), закрывается кнопкой или
     тапом по затемнённому фону — а не остаётся просто блоком под канвасом. */
  .builder__properties--sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    max-height: 70vh;
    overflow-y: auto;
    background: var(--color-surface);
    border-top-left-radius: var(--radius-modal);
    border-top-right-radius: var(--radius-modal);
    box-shadow: var(--shadow-modal);
    padding-top: var(--space-2);
  }

  .builder__properties--sheet .builder__sheet-close {
    display: flex;
    margin: 0 var(--space-2) var(--space-2) auto;
  }

  .builder__sheet-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 25;
    background: rgba(37, 37, 37, 0.28);
  }
}

/* <768px: ProjectBottomNav (EditorHeader.vue) занимает низ экрана —
   содержимое страницы не должно прятаться под ней. Отдельный breakpoint от
   640px выше, т.к. именно на этой ширине появляется/пропадает bottom nav
   (см. ProjectBottomNav.vue), а не там, где меняется раскладка инструментов. */
@media (max-width: 767px) {
  .builder {
    padding-bottom: calc(var(--space-3) + 64px + env(safe-area-inset-bottom));
  }
}
</style>
