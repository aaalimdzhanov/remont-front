<script setup lang="ts">
// Переиспользуемый confirmation modal (сейчас — для delete project, и из
// списка, и из редактора). Не заменяет существующий window.confirm() для
// dirty-navigation/logout — те завязаны на синхронный возврат значения в
// местах, которые лучше не трогать сейчас; здесь — новый, явно запрошенный
// UI-паттерн для деструктивных действий.
const { t } = useI18n()

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  // Блокирует confirm-кнопку, пока действие выполняется (см. задание Draft
  // → Publish, секция PUBLISH FLOW: "disable button... не допускать double
  // click") — cancel остаётся кликабельным, закрыть диалог можно всегда.
  confirmDisabled?: boolean
}>(), {
  danger: false,
  confirmDisabled: false,
})
const displayConfirmText = computed(() => props.confirmText ?? t('common.confirm'))
const displayCancelText = computed(() => props.cancelText ?? t('common.cancel'))
const emit = defineEmits<{ confirm: [], cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="confirm-dialog__overlay" @click.self="emit('cancel')">
      <div class="confirm-dialog__panel" role="alertdialog" aria-modal="true" :aria-label="title">
        <h3 class="confirm-dialog__title">
          {{ title }}
        </h3>
        <p class="confirm-dialog__message">
          {{ message }}
        </p>
        <div class="confirm-dialog__actions">
          <button type="button" class="btn btn-secondary" @click="emit('cancel')">
            {{ displayCancelText }}
          </button>
          <button
            type="button"
            class="btn"
            :class="danger ? 'btn-danger' : 'btn-primary'"
            :disabled="confirmDisabled"
            @click="emit('confirm')"
          >
            {{ displayConfirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-dialog__overlay {
  position: fixed;
  inset: 0;
  background: rgba(37, 37, 37, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 100;
  animation: confirm-dialog-fade var(--transition-base);
}

.confirm-dialog__panel {
  width: 100%;
  max-width: 380px;
  background: var(--color-surface);
  border-radius: var(--radius-modal);
  box-shadow: var(--shadow-modal);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  animation: confirm-dialog-rise var(--transition-base);
}

.confirm-dialog__title {
  font-size: var(--font-h3-size);
  line-height: var(--font-h3-line);
  font-weight: 600;
  color: var(--color-text);
}

.confirm-dialog__message {
  font-size: var(--font-body-size);
  line-height: var(--font-body-line);
  color: var(--color-text-secondary);
}

/* Колонка на mobile — некоторые вызывающие используют длинные подписи
   ("Оставить как черновик"/"Опубликовать заявку", см. Draft → Publish v1),
   которые не помещаются в ряд рядом друг с другом (у .btn white-space:
   nowrap, см. main.css) и обрезались бы/наезжали друг на друга. Брейкпоинт
   768px — тот же, что и везде в проекте для mobile/desktop (см.
   EditorHeader.vue/MarketplaceFilters.vue и ещё 16 мест), а не собственное
   произвольное число: предыдущая версия использовала 480px и именно в
   зазоре 480-768px реально ловился баг (см. скриншот в задании) — ряд уже
   включался, но max-width панели (380px) для этой пары длинных подписей
   не хватало, и кнопка вылезала за левый край панели. Это воспроизводилось
   на любой ширине, включая 1280 — там кнопки визуально помещались в
   viewport, но всё равно вылезали за собственную границу панели, просто
   незаметно на фоне тёмного оверлея; отдельно проверено getBoundingClientRect
   кнопок относительно .confirm-dialog__panel, не только viewport. */
.confirm-dialog__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.confirm-dialog__actions .btn {
  width: 100%;
}

@media (min-width: 768px) {
  /* Шире, чем базовые 380px, — специально, чтобы длинные подписи реально
     помещались в один ряд (см. комментарий выше), а не просто выглядели
     помещающимися издалека на широких viewport. flex-wrap: wrap —
     страховка на случай ещё более длинных подписей в будущем: тогда ряд
     аккуратно перенесётся на вторую строку (оба края остаются внутри
     панели), а не вылезет за её границу, как было в исходном баге. */
  .confirm-dialog__panel {
    max-width: 480px;
  }

  .confirm-dialog__actions {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .confirm-dialog__actions .btn {
    width: auto;
  }
}

@keyframes confirm-dialog-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes confirm-dialog-rise {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
