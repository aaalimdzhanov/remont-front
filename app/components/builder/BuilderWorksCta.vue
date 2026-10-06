<script setup lang="ts">
// Entry point из Builder в Work Builder — ОДНА большая CTA-кнопка. Раньше
// монтировалась сиблингом ПОСЛЕ <Builder/> на page-уровне, из-за чего на
// стековой (<1100px) раскладке оказывалась в самом низу, после "Выберите
// объект"/"Расчёты" — неверный UX (см. задание "Поднять кнопку
// непосредственно под Builder canvas"). Теперь монтируется ВНУТРИ Builder.vue
// (см. .builder__works-cta-slot там), между .builder__canvas-area и
// .builder__sidebar — ровно необходимый минимум, чтобы оказаться в нужном
// месте DOM/grid; сам канвас/инструменты/геометрия этим не затронуты. Своё
// место в сетке (desktop grid-column/grid-row vs mobile auto-stack) этот файл
// не знает — целиком отвечает родитель через класс builder__works-cta-slot.
//
// Один компонент на оба режима: mode определяется тем же существующим
// сигналом, что уже использует весь остальной Work Builder
// (projectId===null → guest/draft, иначе → authenticated) — см.
// resolveWorksCtaHref() в utils/projectNavigation.ts, а не отдельным route/
// флагом. hasBuilding больше не читается здесь: раз компонент теперь монтируется
// внутри `v-else` ветки Builder.vue (т.е. только когда здание уже создано),
// отдельная проверка стала избыточной. Компонент сознательно НЕ содержит
// ничего, кроме визуала, navigation и i18n (см. задание, секция COMPONENT) —
// ни calculation, ни guest work state, ни ProjectWork logic.
const { projectId } = useProjectPersistence()
const { t } = useI18n()

const worksHref = computed(() => resolveWorksCtaHref(projectId.value))
</script>

<template>
  <NuxtLink :to="worksHref" class="btn btn-primary works-cta">
    <UiIcon name="plus" :size="18" />
    <span>{{ t('builder.worksCta.button') }}</span>
    <UiIcon name="chevron-left" :size="18" class="works-cta__arrow" />
  </NuxtLink>
</template>

<style scoped>
.works-cta {
  width: 100%;
  /* 48px → 44px (финальная полировка, см. задание) — остаётся ровно на
     рекомендованном минимуме touch target, визуально чуть компактнее, не
     теряя статус primary CTA. */
  height: 44px;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 0 var(--space-5);
}

.works-cta__arrow {
  transform: rotate(180deg);
}
</style>
