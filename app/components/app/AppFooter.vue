<script setup lang="ts">
// Единый публичный Footer (Footer v1) — подключается через layouts/app.vue
// (все authenticated+public страницы, использующие layout:'app') и
// layouts/public.vue (layout-less detail-страницы с собственным inline
// back-link header — public/contractors/{id} и marketplace/requests/{id},
// см. их doc comments) — НЕ отдельный компонент на каждой странице.
//
// НЕ дублирует основную навигацию (см. задание, секция 4): никаких
// Профиль/Проекты/Мои заявки/Мои предложения/Заказы/Отзывы — это
// private-разделы, уже доступные через AppHeader/AppModeNav/ProfileMenu.
// Footer — только публичная навигация + справочная информация, один и тот
// же набор для клиента и мастера (mode здесь не читается вообще).
//
// Логотип — тот же UiBrandLogo variant="header", что и AppHeader.vue (см.
// его комментарий "Header consistency": везде один и тот же approved PNG),
// ведёт на /marketplace — единственную публичную точку входа.
//
// "Услуги"/"Мастера" — оба ведут на /marketplace?tab=masters (реальный,
// существующий route/query — см. pages/marketplace/index.vue activeTab):
// отдельной "все услуги маркетплейса" страницы в архитектуре нет, услуги
// показываются только внутри профиля конкретного мастера, поэтому это
// честное существующее назначение, а не выдуманный отдельный route.
//
// "Как это работает"/"Помощь"/"Контакты" — для них сейчас нет ни одной
// реальной страницы в проекте (не придумывать новую бизнес-логику/фейковые
// страницы) — отрендерены как некликабельный текст (span, не NuxtLink), не
// ведут в никуда. Когда появятся реальные страницы — заменить конкретный
// span на NuxtLink, ничего больше в разметке менять не нужно.
//
// Footer v3 (см. задание "Обнови Footer по текущему макету"):
//   - слоган "Надёжный выбор для ремонта и строительства" убран полностью —
//     footer начинается сразу с логотипа, без .app-footer__tagline;
//   - колонка "Документы" (Пользовательское соглашение/Политика
//     конфиденциальности) убрана — текущий макет описывает ровно 2 группы
//     ссылок (Навигация/Помощь) и на mobile, и на desktop, без третьей;
//   - copyright-строка объединена в одну ("© {year} Ishonchli Usta ·
//     Узбекистан", один i18n-ключ) вместо двух отдельных строк/spans;
//   - иконки соцсетей НЕ добавлены — задание просило их "если они уже
//     предусмотрены дизайном" (design system), а telegram/instagram/youtube
//     не существуют ни в UiIcon.vue, ни где-либо ещё в проекте — добавление
//     означало бы новую icon library, что противоречит правилу проекта "не
//     создавать новую icon library" (см. также память frontend-dev-conventions).
//   - Active state по-прежнему нигде не читается (задание: "не подсвечивать
//     активную ссылку") — ни один footer-класс не завязан на
//     useRoute()/activeTab, все ссылки визуально идентичны независимо от
//     текущей страницы.
const { t } = useI18n()

const year = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__inner">
      <NuxtLink to="/marketplace" class="app-footer__logo-link" :aria-label="t('footer.brandAriaLabel')">
        <UiBrandLogo variant="header" />
      </NuxtLink>

      <div class="app-footer__nav-grid">
        <nav class="app-footer__col" :aria-label="t('footer.publicNavAriaLabel')">
          <p class="app-footer__col-title">
            {{ t('footer.publicTitle') }}
          </p>
          <NuxtLink to="/marketplace" class="app-footer__link">
            {{ t('footer.linkRequests') }}
          </NuxtLink>
          <NuxtLink to="/marketplace?tab=masters" class="app-footer__link">
            {{ t('footer.linkMasters') }}
          </NuxtLink>
          <NuxtLink to="/marketplace?tab=masters" class="app-footer__link">
            {{ t('footer.linkServices') }}
          </NuxtLink>
        </nav>

        <nav class="app-footer__col" :aria-label="t('footer.helpNavAriaLabel')">
          <p class="app-footer__col-title">
            {{ t('footer.helpTitle') }}
          </p>
          <span class="app-footer__link app-footer__link--static">{{ t('footer.linkHowItWorks') }}</span>
          <span class="app-footer__link app-footer__link--static">{{ t('footer.linkHelp') }}</span>
          <span class="app-footer__link app-footer__link--static">{{ t('footer.linkContacts') }}</span>
        </nav>
      </div>
    </div>

    <div class="app-footer__bottom">
      <span class="app-footer__meta">{{ t('footer.copyright', { year }) }}</span>
    </div>
  </footer>
</template>

<style scoped>
/* Обычный document-flow блок — НЕ fixed и НЕ sticky — прижимается к низу
   через layout-flexbox родителя (.app-shell/.public-shell: min-height:100vh
   + flex-direction:column, content-обёртка flex:1), а не позиционированием
   самого футера. */
.app-footer {
  flex-shrink: 0;
  /* Очень светлый warm-beige фон — тот же --color-bg, что и у самой
     страницы (.app-shell/.public-shell), а не белая поверхность карточки
     (--color-surface) — footer должен сливаться с концом страницы, а не
     выглядеть отдельным белым блоком поверх неё. */
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

.app-footer__inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5) var(--space-5);
}

.app-footer__logo-link {
  display: inline-flex;
  align-self: flex-start;
  text-decoration: none;
}

/* Обе nav-колонки рядом уже на 360px, примерно 50/50 — компактный
   двухколоночный блок, а не список, растянутый на всю страницу. */
.app-footer__nav-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4) var(--space-3);
}

.app-footer__col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  /* Компактный gap между ссылками (14-18px) — не растянутое "длинное меню". */
  gap: var(--space-4);
}

.app-footer__col-title {
  margin: 0;
  font-size: var(--font-small-size);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.app-footer__link {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  color: var(--color-text-secondary);
  font-size: var(--font-body-lg-size);
  line-height: 1.25;
  text-decoration: none;
}

.app-footer__link:hover {
  color: var(--color-primary);
}

/* Пока без реальной страницы (см. doc comment выше) — некликабельно,
   поэтому и без hover-accent, чтобы не выглядеть как рабочая ссылка. */
.app-footer__link--static {
  cursor: default;
  color: var(--color-text-muted);
}

.app-footer__bottom {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}

.app-footer__meta {
  color: var(--color-text-muted);
  font-size: var(--font-caption-size);
}

@media (min-width: 768px) {
  .app-footer__inner {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-10);
    padding: var(--space-6) var(--space-6);
  }

  .app-footer__nav-grid {
    display: flex;
    gap: var(--space-10);
    margin-left: auto;
  }

  .app-footer__col {
    flex: 0 0 auto;
  }

  .app-footer__bottom {
    padding: var(--space-4) var(--space-6);
  }
}
</style>
