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
// Почему знак и wordmark-с-tagline не режутся из одного кропа для header'ов:
// в исходном PNG знак по вертикали пересекается с tagline (низ буквы "u"
// заходит ниже верхней границы tagline) — единой горизонтальной линией
// вырезать "wordmark без tagline" невозможно, не обрезав сам знак.
//
// variant="full"    — полный лок-ап (знак+wordmark+tagline из approved PNG),
//                      используется там, где достаточно места по вертикали
//                      (auth-страницы).
// variant="compact" — только знак (approved PNG-кроп), для самых тесных мест
//                      и как основа favicon/app-icon.
// variant="header"  — знак (тот же approved PNG-кроп, пиксели не менялись) +
//                      обычный текст "ishonchliusta" рядом — по заданию
//                      Dashboard header должен показывать "[знак] ishonchliusta",
//                      а не только иконку; полный PNG-лок-ап с tagline для
//                      этого не подходит (см. выше — слишком высокий для
//                      строки header). Это не "новый логотип" и не перерисовка
//                      знака — тот же самый approved PNG-файл, просто рядом с
//                      обычной подписью брендового имени, без tagline.
withDefaults(defineProps<{ variant?: 'full' | 'compact' | 'header' }>(), {
  variant: 'full',
})
</script>

<template>
  <span class="brand-logo" :class="{ 'brand-logo--compact': variant === 'compact', 'brand-logo--header': variant === 'header' }">
    <img
      v-if="variant === 'full'"
      src="/brand/ishonchliusta-full.png"
      alt="ishonchliusta — uyingiz uchun ishonchli tanlov"
      class="brand-logo__img brand-logo__img--full"
    >
    <template v-else-if="variant === 'header'">
      <img src="/brand/ishonchliusta-icon.png" alt="" class="brand-logo__img brand-logo__img--header-icon">
      <span class="brand-logo__wordmark" aria-label="ishonchliusta">
        <span class="brand-logo__word-dark">ishonchli</span><span class="brand-logo__word-accent">usta</span>
      </span>
    </template>
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

.brand-logo__img--compact,
.brand-logo__img--header-icon {
  height: 32px;
  width: auto;
}

.brand-logo__wordmark {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  text-decoration: none;
}

/* Двухцветный wordmark по approved branding: "ishonchli" — графит,
   "usta" — фирменный оранжевый (те же токены, что и по всему приложению). */
.brand-logo__word-dark {
  color: var(--color-graphite);
}

.brand-logo__word-accent {
  color: var(--color-primary);
}

/* На совсем узких экранах (условный минимум для мобильного веб-браузера)
   wordmark уходит сам — остаётся только знак, ничего не обрезается. */
@media (max-width: 340px) {
  .brand-logo--header .brand-logo__wordmark {
    display: none;
  }
}
</style>
