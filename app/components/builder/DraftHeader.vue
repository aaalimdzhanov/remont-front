<script setup lang="ts">
// Header страницы /projects/draft — публичный entry point в Builder.
// [←][logo] ... [RU][user] — см. doc comment в draft.vue.
//
// Save — BuilderSaveButton.vue (не менялась), но больше НЕ рендерится здесь
// (см. задание "ПЕРЕРАЗМЕСТИТЬ 'СОХРАНИТЬ ПРОЕКТ' В BUILDER"): Header
// смешивал навигацию/язык/user с действием над Builder — теперь Save живёт
// в control row самого Builder.vue (.builder__canvas-toolbar, рядом с
// "Размеры"), этот файл его больше не монтирует вообще. Компонент и его save
// handler (saveSessionAfterAuth/createProjectFromDraft) не менялись — только
// переехало место монтирования.
//
// ← и logo — ОДНО и то же действие, см. задание "УПРОСТИТЬ ВЫХОД ИЗ GUEST
// BUILDER": никакого confirm/"Покинуть редактор?" на обычном выходе —
// Builder должен ощущаться как свободный инструмент, а не редактор с
// защитой от выхода. Вместо диалога — тихая персистентность: перед уходом
// текущий Building синхронизируется в localStorage (syncDraftToStorage,
// см. utils/builderDraft.ts — пишет, только если draft содержательный, то
// есть есть хотя бы одна комната; иначе чистит ключ, не оставляя пустой
// черновик). Дальше пользователь попадает на /marketplace, где
// MarketplaceBuilderHero сам показывает "Продолжить план", если draft
// остался (см. тот компонент).
//
// Единственное место, где confirm действительно нужен, — "Начать новый
// план" (явное удаление существующего draft) — живёт на /marketplace, не
// здесь (см. MarketplaceBuilderHero.vue): уход из Builder как таковой —
// не деструктивное действие, ничего не удаляется безвозвратно.
//
// AppLangSwitch (см. задание "Вынести переключатель языка RU/UZ из profile
// dropdown в общий глобальный Header") — у этой страницы нет AppHeader
// вообще (публичный entry point, свой минимальный header) — переключатель
// добавлен явно, перед Save.
//
// AppProfileMenu (см. задание "унифицировать глобальный Header между Builder
// и Work Builder") — раньше здесь не было ВООБЩЕ никакого user-icon/auth
// entry point (единственный способ войти/зарегистрироваться был уйти на
// /marketplace, где он уже есть в AppHeader.vue) — теперь тот же компонент,
// что уже отвечает за guest/authenticated ветвление в AppHeader.vue/
// EditorHeader.vue (см. задание "упростить Header для гостя" — сам
// AppProfileMenu не менялся, просто ещё один потребитель уже существующего
// компонента). Никакой новой auth-логики/redirect'а — AppProfileMenu сам
// читает useAuth()/redirectQuery, этот файл их не трогает.
const { document: buildingDocument } = useBuilding()
const { t } = useI18n()

function handleBack() {
  syncDraftToStorage(buildingDocument.value)
  navigateTo('/marketplace')
}
</script>

<template>
  <header class="draft-header">
    <button type="button" class="draft-header__back" :aria-label="t('navigation.backToMarketplace')" @click="handleBack">
      <UiIcon name="chevron-left" :size="18" />
    </button>

    <!-- variant="header" — тот же approved ishonchliusta-full.png (знак +
         wordmark), что и AppHeader.vue, уменьшенный под высоту строки
         (32px, см. BrandLogo.vue). Кликабелен — то же действие, что и ←
         (см. doc comment в script). -->
    <button type="button" class="draft-header__brand" @click="handleBack">
      <UiBrandLogo variant="header" />
    </button>

    <div class="draft-header__spacer" />

    <!-- "Работы" была здесь как header-ссылка в Header — явно удалена (см.
         задание "УДАЛИТЬ 'РАБОТЫ' ИЗ HEADER"): единственный entry point в
         Work Builder теперь — BuilderWorksCta.vue (большая кнопка под
         Builder canvas, см. pages/projects/draft/index.vue), намеренно без
         второй/дублирующей точки входа здесь. -->
    <AppLangSwitch />
    <AppProfileMenu />
  </header>
</template>

<style scoped>
.draft-header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  /* Горизонтальный padding сознательно var(--space-2), не -3 — см. задание
     "АККУРАТНО ДОБАВИТЬ/УНИФИЦИРОВАТЬ RU/UZ В MOBILE HEADER": сегментированный
     AppLangSwitch (88-96px) шире прежних двух отдельных кнопок — экономия
     по-прежнему оставлена как есть (Save с тех пор уехал из этой строки
     в Builder.vue, но запас по ширине лишним не бывает). */
  padding: var(--space-2);
  padding-top: max(var(--space-2), env(safe-area-inset-top));
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.draft-header__back {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-button);
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.draft-header__back:hover {
  background: var(--color-surface-subtle);
  color: var(--color-text);
}

.draft-header__brand {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 0;
  border: none;
  background: none;
  padding: var(--space-1);
  color: inherit;
  cursor: pointer;
}

.draft-header__brand:hover {
  opacity: 0.85;
}

.draft-header__spacer {
  flex: 1 1 auto;
}

@media (min-width: 768px) {
  .draft-header {
    height: 64px;
    padding: 0 var(--space-4);
  }
}
</style>
