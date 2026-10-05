<script setup lang="ts">
// Единственный logo-компонент бренда ishonchliusta. Источник — утверждённый
// PNG, предоставленный пользователем (public/brand/ — два пиксель-точных
// кропа ОДНОГО и того же файла, изображение нигде не перерисовывается и не
// генерируется заново):
//   ishonchliusta-full.png  — весь лок-ап (знак + wordmark + tagline
//                              "UYINGIZ UCHUN ISHONCHLI TANLOV"), только
//                              обрезаны прозрачные поля вокруг контента.
//   ishonchliusta-icon.png  — только фирменный знак (крыша + монограмма
//                              "iu"), тот же кроп, что и в full.
//
// variant="full"    — полный лок-ап (знак+wordmark+tagline из approved PNG),
//                      используется там, где достаточно места по вертикали
//                      (auth-страницы).
// variant="compact" — только знак (approved PNG-кроп), для самых тесных мест
//                      (Builder desktop toolbar) и как основа favicon/app-icon.
// variant="header"  — Header consistency: единый application header (см.
//                      AppHeader.vue) везде показывает ОДИН И ТОТ ЖЕ файл,
//                      ishonchliusta-full.png (тот же approved PNG, что и у
//                      variant="full"), без текстового fallback — только
//                      уменьшен под высоту строки header (см. стили ниже).
withDefaults(defineProps<{ variant?: 'full' | 'compact' | 'header' }>(), {
  variant: 'full',
})
</script>

<template>
  <span class="brand-logo" :class="{ 'brand-logo--compact': variant === 'compact', 'brand-logo--header': variant === 'header' }">
    <img
      v-if="variant === 'full' || variant === 'header'"
      src="/brand/ishonchliusta-full.png"
      alt="ishonchliusta — uyingiz uchun ishonchli tanlov"
      class="brand-logo__img"
      :class="variant === 'header' ? 'brand-logo__img--header' : 'brand-logo__img--full'"
    >
    <img
      v-else
      src="/brand/ishonchliusta-icon.png"
      alt="ishonchliusta"
      class="brand-logo__img brand-logo__img--compact"
    >
  </span>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  /* Логотип часто оборачивается в <NuxtLink> (переход на /projects) — не
     наследовать браузерное подчёркивание/цвет ссылки. text-decoration:none
     здесь подавляет и линию, унаследованную от ancestor-ссылки, для ЛЮБОГО
     текста внутри (см. bugfix: "ishonchliusta" был подчёркнут именно так). */
  text-decoration: none;
  color: inherit;
}

.brand-logo__img {
  display: block;
}

/* Пропорции всегда сохраняются: у каждого варианта фиксирован только ОДИН
   размер (соответствующий его реальному месту использования), второй —
   auto, из естественного aspect ratio PNG. Никогда не задаются оба сразу —
   иначе изображение растягивалось бы. */
.brand-logo__img--full {
  width: 200px;
  height: auto;
}

.brand-logo__img--compact {
  height: 32px;
  width: auto;
}

/* Тот же PNG, что и variant="full", просто уменьшен под высоту строки
   header (app-header__top min-height: 40px, см. AppHeader.vue) — только
   height фиксирован, width auto из реального aspect ratio файла. */
.brand-logo__img--header {
  height: 32px;
  width: auto;
}
</style>
