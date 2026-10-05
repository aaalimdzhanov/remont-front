<script setup lang="ts">
// Миниатюра плана проекта на marketplace-карточках заявок ("Мои заявки",
// /marketplace/requests/{id} для владельца — см. финальный отчёт задачи
// "Marketplace request plan thumbnail"). ЭТО НЕ вторая Geometry Engine:
// вся геометрия по-прежнему считается ровно там же, где и в Work Builder —
// buildBuildingPreview()/buildRoomPreview() (app/geometry/preview.ts)
// внутри уже существующего <WorkRoomPreviewThumb> (см. WorkRoomStep.vue —
// тот же компонент уже показывает превью одной комнаты/всего проекта в
// списке "выбрать помещение"). Этот компонент — тонкая обёртка НАД ним,
// которая знает только то, чего не знает WorkRoomPreviewThumb: как по
// projectId асинхронно (через useMarketplace().loadProjectPreview(), с
// дедуп-кэшем по projectId — несколько заявок владельца часто указывают на
// один и тот же проект) дойти до Building JSON, и что показать, пока его
// ещё нет/не удалось получить.
//
// room_id (plan thumbnail v2): без него несколько заявок ОДНОГО проекта
// (разные комнаты/виды работ) показывали бы одинаковую миниатюру всего
// здания — неотличимую друг от друга (см. финальный отчёт). roomId=null —
// project-level работа, WorkRoomPreviewThumb сам показывает план всего
// здания в этом случае (тот же режим, что "Весь проект" в WorkRoomStep.vue).
//
// project_id/room_id доступны ТОЛЬКО в приватной ListMine-форме
// MarketplaceRequest (см. api/types.ts MarketplaceRequestListItem) — то
// есть этот компонент годится исключительно для заявок ВЛАДЕЛЬЦА. Открытые
// заявки/публичная деталь заявки (OpenMarketplaceRequest/
// PublicMarketplaceRequest) их никогда не содержат (сознательная
// privacy-граница backend — подрядчик/гость не должен узнать, чей это
// проект), поэтому там этот компонент не используется вообще, а не "с
// пустым fallback".
import type { Building, BuildingType } from '~/types/building'

const props = defineProps<{ projectId: string, roomId: string | null }>()

const { projectPreviewCache, loadProjectPreview } = useMarketplace()

onMounted(() => {
  void loadProjectPreview(props.projectId)
})

// Тривиальная "пустая" геометрия — не второй fallback-рисунок: передана в
// WorkRoomPreviewThumb, она даёт buildBuildingPreview()/buildRoomPreview()
// hasContent=false, и компонент сам рисует свой обычный placeholder — тот
// единственный fallback, а не ещё один, нарисованный здесь заново.
const EMPTY_BUILDING: Building = {
  id: '',
  type: 'house' as BuildingType,
  dimensions: { width: 0, length: 0 },
  floors: [],
  rooms: [],
  walls: [],
  openings: [],
  stairs: [],
  roof: null,
  elements: [],
}

// undefined = ещё не грузили/грузится сейчас; null = точно нет (404/сеть) —
// в обоих случаях показываем ту же пустую геометрию (см. EMPTY_BUILDING
// выше), разница только в pulse-анимации skeleton, пока запрос летит.
const cached = computed(() => projectPreviewCache.value[props.projectId])
const isLoading = computed(() => cached.value === undefined)
const building = computed<Building>(() => cached.value?.building.building ?? EMPTY_BUILDING)
</script>

<template>
  <div class="plan-thumb" :class="{ 'plan-thumb--loading': isLoading }" aria-hidden="true">
    <WorkRoomPreviewThumb :building="building" :room-id="roomId" />
  </div>
</template>

<style scoped>
.plan-thumb {
  width: 100%;
  height: 100%;
}

.plan-thumb--loading {
  animation: plan-thumb-pulse 1.4s ease-in-out infinite;
}

@keyframes plan-thumb-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
