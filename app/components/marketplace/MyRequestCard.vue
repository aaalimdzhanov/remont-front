<script setup lang="ts">
// Карточка "моей" заявки (owner-вид, приватный список ListMine).
//
// My Requests Card v2 (см. задание "улучшить UI/UX /my-requests"): раньше
// карточка не могла показать название работы вообще — приватная форма
// (MarketplaceRequestListItem, см. api/types.ts) содержит projectWorkId, но
// НИКОГДА work_type/work_type_id напрямую (backend сознательно не отдаёт
// WorkType-проекцию в этом ответе). Единственным заметным текстом было
// количество ("1 шт"/"42.75 м²") — пользователь не понимал, что это за
// заявка. Реального нового backend-поля это НЕ потребовало: то же самое
// privacy-safe разрешение project_id -> реальные данные владельца, что уже
// делает миниатюра плана (см. MarketplaceProjectPlanThumbnail.vue
// loadProjectPreview), только для ProjectWork-списка: project_id ->
// GET /projects/{id}/works (useMarketplace.loadProjectWorks, тот же
// эндпоинт, что уже использует pages/projects/[id]/works.vue) -> найти
// нужную работу по projectWorkId -> её work_type_id -> имя из уже
// загружаемого Work Catalog (catalogWorkTypes, loadFilterCatalog — тот же
// каталог, что форма "Добавить услугу" на /marketplace/contractor). Работает
// и для 'draft': в отличие от публичного GET /marketplace-requests/{id}
// (которое 404 для draft), ProjectWork существует независимо от статуса
// заявки — то же самое название работы, которое пользователь публикует.
// Пока имя ещё резолвится (или ProjectWork/проект удалён — orphan-заявка),
// честный fallback — количество, как и было раньше, а не пустая строка.
//
// Marketplace request plan thumbnail v1: project_id/room_id дают путь к
// Building JSON владельца — см. MarketplaceProjectPlanThumbnail.vue (тонкая
// обёртка над уже существующим ProjectsProjectPreview/Geometry Engine).
// Тот же project preview (уже кэшированный для миниатюры) даёт и название
// проекта, и его Location (Project.location) — тот же formatLocation(), что
// уже использует OpenRequestCard.vue, второй форматтер не заводится.
//
// Draft → Publish v1: карточка со статусом 'draft' НЕ ссылается на публичный
// /marketplace/requests/{id} — backend намеренно исключает draft из
// GetPublicByID (WHERE status != 'draft'), переход туда дал бы честному
// владельцу его же заявки "не найдено". Вместо ссылки — просто некликабельная
// карточка с подсказкой опубликовать со страницы «Работы» (см. задание,
// секции DRAFT В PRIVATE UI/REQUEST DETAIL). Эта бизнес-логика не менялась.
import type { MarketplaceRequestListItem } from '~/api/types'
// Bugfix (найден при QA переходов по карточкам этой задачи): :is="isDraft ?
// 'div' : 'NuxtLink'" со строкой 'NuxtLink' рендерился как буквальный
// нераспознанный тег <nuxtlink to="..."> без href и БЕЗ обработчика клика
// вообще — Nuxt авто-импортирует <NuxtLink> компилятором конкретно под этот
// файл, а не регистрирует его в runtime-реестре глобальных компонентов,
// который смотрит resolveDynamicComponent() по строковому имени. Карточка
// была нерабочей (клик никуда не вёл) для ЛЮБОГО непубликованного статуса —
// не связано с миниатюрой плана, но обнаружено и исправлено в рамках задачи
// (её же переходы по карточкам явно проверялись). Фикс — передавать сам
// компонент (импорт из '#components'), а не его имя строкой.
import { NuxtLink } from '#components'

const props = defineProps<{ request: MarketplaceRequestListItem }>()

const { t, locale } = useI18n()
const {
  projectPreviewCache, loadProjectPreview,
  projectWorksCache, loadProjectWorks,
  catalogWorkTypes, loadFilterCatalog,
} = useMarketplace()

onMounted(() => {
  void loadProjectPreview(props.request.projectId)
  void loadProjectWorks(props.request.projectId)
  void loadFilterCatalog()
})

const isDraft = computed(() => props.request.status === 'draft')

const project = computed(() => projectPreviewCache.value[props.request.projectId])
const projectWork = computed(() =>
  projectWorksCache.value[props.request.projectId]?.find(w => w.id === props.request.projectWorkId) ?? null,
)
// null — ещё резолвится (project/works/catalog не загружены) ИЛИ orphan
// (ProjectWork/проект реально удалён) — в обоих случаях честный quantity-
// fallback ниже, никогда не выдуманное название.
const workTypeName = computed(() => {
  const work = projectWork.value
  if (!work) return null
  return catalogWorkTypes.value.find(w => w.id === work.workTypeId)?.name ?? null
})

const quantityLabel = computed(() => formatQuantity(props.request.quantity, props.request.unit, t))
const locationLabel = computed(() => (project.value ? formatLocation(project.value.location, locale.value) : null))
const projectName = computed(() => project.value?.name ?? null)
</script>

<template>
  <component
    :is="isDraft ? 'div' : NuxtLink"
    :to="isDraft ? undefined : `/marketplace/requests/${request.id}`"
    class="my-request-card"
    :class="{ 'my-request-card--draft': isDraft }"
  >
    <div class="my-request-card__main">
      <div class="my-request-card__thumb">
        <MarketplaceProjectPlanThumbnail :project-id="request.projectId" :room-id="request.roomId" />
      </div>

      <div class="my-request-card__info">
        <div class="my-request-card__head">
          <p class="my-request-card__title">
            {{ workTypeName ?? quantityLabel }}
          </p>
          <span class="my-request-card__status" :class="`my-request-card__status--${request.status}`">
            {{ marketplaceRequestStatusLabel(request.status, t) }}
          </span>
        </div>

        <p v-if="workTypeName" class="my-request-card__quantity">
          {{ quantityLabel }}
        </p>

        <p v-if="projectName" class="my-request-card__meta">
          {{ t('marketplaceRequest.projectLabel', { name: projectName }) }}
        </p>
        <p v-if="locationLabel" class="my-request-card__meta">
          <UiIcon name="pin" :size="14" />
          {{ locationLabel }}
        </p>
      </div>
    </div>

    <div class="my-request-card__foot" :class="{ 'my-request-card__foot--draft': isDraft }">
      <span class="text-caption text-muted">
        {{ t('marketplaceRequest.createdAt', { date: formatMarketplaceDate(request.createdAt, locale) }) }}
      </span>
      <span v-if="isDraft" class="text-caption text-muted my-request-card__hint">
        {{ t('marketplaceRequest.publishHint') }}
      </span>
      <span v-else class="btn btn-secondary btn-sm my-request-card__cta">
        {{ t('marketplaceRequest.viewOffers') }}
      </span>
    </div>
  </component>
</template>

<style scoped>
.my-request-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  text-decoration: none;
  color: inherit;
}

.my-request-card:hover {
  border-color: var(--color-border-strong);
}

.my-request-card--draft {
  cursor: default;
}

.my-request-card--draft:hover {
  border-color: var(--color-border);
}

.my-request-card__main {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

/* Второстепенный акцент, не рекламный баннер (см. задание): маленький
   квадрат слева от текста, ~64px на mobile — заметно меньше 30-35% типичной
   ширины карточки. Визуальный контекст, но название работы теперь главный
   идентификатор заявки, а не миниатюра сама по себе (см. задание). */
.my-request-card__thumb {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-input);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
}

.my-request-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.my-request-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

/* Главный элемент карточки (см. задание: "Название работы должно быть
   значительно заметнее количества") — тот же визуальный вес/line-clamp, что
   и .open-request-card__title на /marketplace (OpenRequestCard.vue), чтобы
   "своя" и "чужая открытая" заявка читались как один и тот же язык карточек. */
.my-request-card__title {
  margin: 0;
  font-weight: 600;
  font-size: var(--font-body-lg-size);
  line-height: var(--font-h3-line);
  color: var(--color-text);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow-wrap: break-word;
  word-break: break-word;
}

.my-request-card__status {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: var(--font-caption-size);
  padding: 2px var(--space-2);
  border-radius: 999px;
  white-space: nowrap;
}

.my-request-card__status--draft { color: var(--color-warning); background: var(--color-warning-subtle); }
.my-request-card__status--open { color: var(--color-success); background: var(--color-success-subtle); }
.my-request-card__status--cancelled { color: var(--color-text-muted); background: var(--color-surface-subtle); }
.my-request-card__status--closed { color: var(--color-text-secondary); background: var(--color-surface-subtle); }

/* Вторичная информация (см. задание: "количество — не главный
   идентификатор") — показывается только когда над ней уже есть настоящее
   название работы (иначе quantityLabel и так уже занимает место title, см.
   template — дублировать её строкой ниже не нужно). */
.my-request-card__quantity {
  margin: 0;
  font-weight: 500;
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
}

.my-request-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-small-size);
  color: var(--color-text-secondary);
}

.my-request-card__meta .icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

/* Опубликованная заявка — дата+CTA в один ряд, тот же паттерн, что и
   .open-request-card__foot на /marketplace (OpenRequestCard.vue). Draft —
   вместо CTA идёт объясняющая подсказка ("Опубликуйте заявку..."), которая
   на mobile не помещается в одну строку с датой, поэтому там колонка
   (см. --draft модификатор ниже), а не одна и та же раскладка для обоих
   случаев. */
.my-request-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.my-request-card__foot--draft {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
}

.my-request-card__cta {
  flex-shrink: 0;
  min-height: 44px;
}

.my-request-card__hint {
  margin: 0;
}

@media (min-width: 768px) {
  .my-request-card__thumb {
    width: 88px;
    height: 88px;
  }
}
</style>
