<script setup lang="ts">
// Второй CTA на /marketplace, сразу после BuilderHero.vue (см. doc comment
// там же). Визуальный reference — предоставленный design mockup (icon слева
// сверху, title/description/CTA в левой колонке, калькулятор + 2 price-badge
// + "Без регистрации" в правой). Намеренно компактнее и без slider —
// визуальная иерархия с Builder держится на разнице в размере/содержимом
// блоков (slider/feature-row у Builder, здесь — нет), а не на цвете CTA
// (кнопка — тот же .btn-primary, что и у Builder, по заданию reference).
//
// .renovation-card__visual — калькулятор/бейджи/note всегда position:
// absolute ВНУТРИ него (единственный positioning context), независимо от
// breakpoint'а — только сам .visual меняет своё позиционирование:
//  - <560px (настоящий узкий телефон, см. doc comment у media query ниже) —
//    .visual САМ absolute и "плавает" справа поверх/рядом с .content
//    (floating visual), а не идёт блоком ПОСЛЕ content в normal flow — это
//    и держит высоту карточки на телефоне компактной (~500-560px, не 800+).
//  - >=560px — .visual обычный relative-блок в grid-колонке (LEFT|RIGHT).
// Внутри .visual дети остаются absolute одинаково на всех breakpoint'ах —
// меняются только px-размеры по media query, не механизм позиционирования.
//
// "3D calculator" иллюстрация — НЕ фото/растровый asset (в проекте такого
// нет, а подключать stock/remote image задание прямо запрещает). Вместо
// этого — тот же приём, что уже применяет BuilderHero.vue для 2D-плана:
// рисованный inline-SVG (body/screen/button-grid), собранный из простых
// rect — стилизованный, не photorealistic, но читаемый как "калькулятор" и
// полностью локальный, без новых image-assets/библиотек.
//
// Price-бейджи ("≈ 85–110 млн сум", "≈ 1.3–1.7 млн сум/м²") — статичный
// illustrative teaser (см. задание: "НЕ делать текст динамическим, НЕ
// подключать API"), поэтому не завязаны на formatPrice()/реальные данные
// заявок — это разные, не связанные источники чисел.
const { t } = useI18n()

interface CalcButton { x: number, y: number, accent: boolean }

// 4×4 grid кнопок калькулятора, последняя колонка — accent (как orange
// операторы +/−/×/÷ на reference image).
const CALC_COLS = [18, 38, 58, 78]
const CALC_ROWS = [58, 78, 98, 118]
const calcButtons: CalcButton[] = CALC_ROWS.flatMap(y =>
  CALC_COLS.map((x, colIndex) => ({ x, y, accent: colIndex === CALC_COLS.length - 1 })),
)
</script>

<template>
  <section class="renovation-card" :aria-label="t('marketplace.renovationEstimateTitle')">
    <div class="renovation-card__content">
      <span class="renovation-card__icon"><UiIcon name="calculator" :size="24" /></span>
      <h2 class="renovation-card__title">
        {{ t('marketplace.renovationEstimateTitle') }}
      </h2>
      <p class="renovation-card__description">
        {{ t('marketplace.renovationEstimateDescription') }}
      </p>
      <NuxtLink to="/renovation-estimate" class="btn btn-primary renovation-card__cta">
        {{ t('marketplace.renovationEstimateCta') }}
        <UiIcon name="chevron-left" :size="18" class="renovation-card__cta-icon" />
      </NuxtLink>
    </div>

    <div class="renovation-card__visual">
      <!-- Price-бейджи и сам калькулятор — чисто декоративный teaser, см. doc
           comment в script: не настоящие цифры, скрыты от screen reader. -->
      <div class="renovation-card__badge renovation-card__badge--price" aria-hidden="true">
        <span class="renovation-card__badge-icon"><UiIcon name="chart" :size="13" /></span>
        <span class="renovation-card__badge-text">
          <strong>{{ t('marketplace.renovationEstimatePriceValue') }}</strong>
          <small>{{ t('marketplace.renovationEstimatePriceUnit') }}</small>
        </span>
      </div>

      <div class="renovation-card__calc-wrap" aria-hidden="true">
        <span class="renovation-card__circle" />
        <svg viewBox="0 0 120 152" class="renovation-card__calc">
          <rect x="8" y="6" width="104" height="140" rx="16" class="renovation-card__calc-body" />
          <rect x="18" y="18" width="84" height="30" rx="6" class="renovation-card__calc-screen" />
          <rect x="68" y="36" width="26" height="6" rx="3" class="renovation-card__calc-digits" />
          <rect
            v-for="(btn, i) in calcButtons"
            :key="i"
            :x="btn.x"
            :y="btn.y"
            width="16"
            height="16"
            rx="4"
            class="renovation-card__calc-btn"
            :class="{ 'renovation-card__calc-btn--accent': btn.accent }"
          />
        </svg>
      </div>

      <div class="renovation-card__badge renovation-card__badge--price-m2" aria-hidden="true">
        <span class="renovation-card__badge-icon"><UiIcon name="home" :size="13" /></span>
        <span class="renovation-card__badge-text">
          <strong>{{ t('marketplace.renovationEstimatePricePerM2Value') }}</strong>
          <small>{{ t('marketplace.renovationEstimatePricePerM2Unit') }}</small>
        </span>
      </div>

      <!-- "Без регистрации" — реальная информация (не fake-число), поэтому,
           в отличие от соседних badge, НЕ aria-hidden. -->
      <p class="renovation-card__note">
        <UiIcon name="lock" :size="12" />
        {{ t('marketplace.renovationEstimateNote') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
/* <560px (см. doc comment в script) — .renovation-card САМ positioning
   context: .content в normal flow слева (width:68%), .visual — floating
   absolute справа, ПОВЕРХ/рядом с .content, а не блоком после него. Это
   единственное, что держит высоту карточки на телефоне ~500-560px вместо
   800+ (раньше .visual шёл обычным block ПОСЛЕ .content — отсюда и
   огромная суммарная высота). overflow:hidden — чтобы decorative circle и
   floating badge (чуть выходящий за левый край .visual, см. ниже) не
   вылезали за скруглённые углы самой карточки. */
.renovation-card {
  position: relative;
  padding: var(--space-5) var(--space-4);
  border-radius: 20px;
  overflow: hidden;
  /* Тёплый cream-фон с лёгким orange tint — производный от двух уже
     существующих токенов (не новый "случайный" цвет), см. задание секция 1. */
  background: color-mix(in srgb, var(--color-bg) 88%, var(--color-primary-subtle) 12%);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.renovation-card__content {
  position: relative;
  z-index: 3;
  width: 68%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.renovation-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: var(--space-3);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-primary-hover);
}

.renovation-card__title {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--color-graphite);
}

.renovation-card__description {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 17px;
  line-height: 1.4;
}

.renovation-card__cta {
  position: relative;
  z-index: 4;
  margin-top: var(--space-2);
  min-height: 56px;
  padding: 0 var(--space-4);
  font-weight: 600;
}

.renovation-card__cta-icon {
  transform: rotate(180deg);
}

/* ---- Floating visual zone: калькулятор + 2 price-бейджа + note ----
   position:absolute ОТНОСИТЕЛЬНО .renovation-card (не relative-блок в
   потоке, как было) — именно это выносит .visual из document flow, не
   добавляя своей высоты к высоте карточки. top/height подобраны так,
   чтобы кластер визуально вертикально центрировался на зоне title+
   description (не заезжая на CTA снизу). Дети внутри — position:absolute
   ОТНОСИТЕЛЬНО ЭТОГО блока (единственный positioning context для них, см.
   doc comment в script) — тот же механизм, что и на desktop/tablet ниже,
   меняются только px-размеры. */
.renovation-card__visual {
  position: absolute;
  right: 0;
  top: 52px;
  width: 150px;
  height: 268px;
  z-index: 2;
}

.renovation-card__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.renovation-card__badge--price {
  position: absolute;
  /* Чуть левее и ниже жёсткого угла .visual — привязан к calculator
     (сидит над его верхним краем), а не к правому краю карточки. Значения
     per-tier ниже (560/768/1024px), т.к. ширина .visual разная. */
  top: 10px;
  right: 20px;
}

.renovation-card__badge--price-m2 {
  position: absolute;
  bottom: 26px;
  /* Небольшой выход влево за левый край .visual — floating badge, как в
     reference (см. задание секция PRICE PER M2); overflow:hidden на
     .renovation-card не даёт ему вылезти за сам край карточки. */
  left: -18px;
}

.renovation-card__badge-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.renovation-card__badge-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.renovation-card__badge-text strong {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-graphite);
}

.renovation-card__badge-text small {
  font-size: 10px;
  color: var(--color-text-muted);
}

.renovation-card__calc-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  /* На <560px title/description физически заходят в зону .visual (см. doc
     comment в script — 230px+ для 2-строчного title + 150px visual не
     умещаются в 311px карточки на 375px). Вместо текста, "обрезанного" о
     жёсткий край белой SVG-карточки калькулятора, здесь — намеренный
     overlap: калькулятор+circle плавно растворяются (mask-fade) к своему
     левому краю, именно там, где текст может на них заходить, — overlap
     читается как стиль, а не как сломанный layout. На >=560px (grid,
     overlap'а нет) маска снимается, см. media query ниже. */
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 65%);
  mask-image: linear-gradient(to right, transparent 0%, black 65%);
}

/* Мягкая декоративная "подложка" за калькулятором — сплошной цвет с
   opacity, без gradient (см. задание секция 9: "не делать сильный
   gradient" / секция 1: "не использовать gradients" для фона карточки). */
.renovation-card__circle {
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: var(--color-primary-subtle);
  opacity: 0.55;
}

.renovation-card__calc {
  position: relative;
  width: 108px;
  height: auto;
  filter: drop-shadow(0 6px 14px rgba(23, 33, 43, 0.14));
}

.renovation-card__calc-body {
  fill: var(--color-surface);
  stroke: var(--color-border-strong);
  stroke-width: 1;
}

.renovation-card__calc-screen {
  fill: var(--color-graphite);
}

.renovation-card__calc-digits {
  fill: var(--color-surface);
  opacity: 0.85;
}

.renovation-card__calc-btn {
  fill: var(--color-surface-subtle);
  stroke: var(--color-border);
  stroke-width: 1;
}

.renovation-card__calc-btn--accent {
  fill: var(--color-primary);
  stroke: var(--color-primary);
}

.renovation-card__note {
  position: absolute;
  bottom: 0;
  right: 4px;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-caption-size);
  font-weight: 500;
  white-space: nowrap;
}

/* 560px — НЕ один из стандартных breakpoint'ов страницы (768/1024), а
   минимальная ширина, при которой 2-колоночный grid (content ~55% / visual
   ~45%) ещё помещает CTA и визуальный кластер без обрезки (см. doc comment
   в script: баг был в том, что ниже 768px карточка оставалась одноколоночной
   даже на широких "мобильных" окнах/планшетах — большой фикс-max-width
   кластер 300px выглядел потерянным/маленьким посреди во много раз более
   широкой карточки). Единственная по-настоящему однoколоночная зона теперь
   — узкие телефоны <560px, где текст и калькулятор физически не влезают
   рядом. Grid вместо flex-row — колонка задана процентом контейнера
   напрямую, без flex-basis арифметики, align-items:center центрирует обе
   колонки по высоте без height/min-height на самой .renovation-card (см.
   задание, секция CARD HEIGHT — карточка растёт по контенту). */
@media (min-width: 560px) {
  /* Grid-раскладка с этой ширины не создаёт overlap text/visual (разные
     колонки) — mask-fade (см. doc comment у .renovation-card__calc-wrap)
     нужен только мобильной floating-композиции, здесь снимается. */
  .renovation-card__calc-wrap {
    -webkit-mask-image: none;
    mask-image: none;
  }

  .renovation-card {
    display: grid;
    grid-template-columns: 55% 45%;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-5) var(--space-6);
    border-radius: 22px;
    overflow: visible;
  }

  /* Сбрасывает floating-позиционирование <560px (см. doc comment в script
     и у .renovation-card выше) обратно на обычный grid-column flow. */
  .renovation-card__content {
    position: static;
    width: auto;
    justify-content: center;
    gap: var(--space-2);
  }

  .renovation-card__icon {
    width: 48px;
    height: 48px;
    margin-bottom: 0;
  }

  .renovation-card__title {
    max-width: 285px;
    font-size: var(--font-h2-size);
    line-height: 1.2;
  }

  .renovation-card__description {
    max-width: 36ch;
    font-size: var(--font-small-size);
    line-height: 1.5;
  }

  .renovation-card__cta {
    min-height: 48px;
    padding: 0 var(--space-5);
  }

  .renovation-card__visual {
    position: relative;
    right: auto;
    top: auto;
    width: 100%;
    max-width: 230px;
    height: auto;
    min-height: 190px;
    margin: 0 auto;
  }

  .renovation-card__badge--price-m2 {
    bottom: 28px;
    left: 0;
  }

  .renovation-card__badge--price {
    top: 6px;
    right: 28px;
  }

  .renovation-card__circle {
    width: 108px;
    height: 108px;
  }

  .renovation-card__calc {
    width: 86px;
  }
}

/* Тот же breakpoint, что у остальной /marketplace страницы и у
   BuilderHero.vue — здесь только укрупняем типографику/визуальный кластер,
   сама grid-раскладка уже включена с 560px. */
@media (min-width: 768px) {
  .renovation-card {
    gap: var(--space-6);
    padding: var(--space-6) var(--space-8);
    border-radius: 24px;
  }

  .renovation-card__content {
    gap: var(--space-3);
  }

  .renovation-card__title {
    font-size: 28px;
    max-width: 335px;
  }

  .renovation-card__description {
    font-size: var(--font-body-lg-size);
  }

  .renovation-card__visual {
    max-width: 320px;
    min-height: 220px;
  }

  .renovation-card__badge--price-m2 {
    bottom: 44px;
  }

  .renovation-card__badge--price {
    top: 0;
    right: 40px;
  }

  .renovation-card__circle {
    width: 150px;
    height: 150px;
  }

  .renovation-card__calc {
    width: 120px;
  }
}

@media (min-width: 1024px) {
  .renovation-card__title {
    font-size: 32px;
    max-width: 385px;
  }

  .renovation-card__visual {
    max-width: 340px;
    min-height: 230px;
  }

  .renovation-card__badge--price-m2 {
    bottom: 48px;
  }

  .renovation-card__badge--price {
    top: 0;
    right: 44px;
  }

  .renovation-card__circle {
    width: 165px;
    height: 165px;
  }

  .renovation-card__calc {
    width: 132px;
  }
}
</style>
