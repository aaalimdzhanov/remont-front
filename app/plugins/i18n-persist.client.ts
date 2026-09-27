// detectBrowserLanguage:false (см. nuxt.config.ts) отключает не только
// auto-redirect по Accept-Language, но и встроенный cookie-механизм
// @nuxtjs/i18n целиком — без этого плагина явный выбор языка в ProfileMenu
// (setLocale()) не переживал бы обычный reload/повторный заход. Только
// localStorage, ничего похожего на auto-detect по браузеру: значение сюда
// попадает исключительно из явного клика пользователя по переключателю.
// useNuxtApp().$i18n, а не useI18n(): composable useI18n() рассчитан на
// вызов внутри setup() компонента, здесь (top-level плагина) он бросает
// "Must be called at the top of a setup function" — $i18n тот же composer,
// но безопасен вне component setup (тем же паттерном, что и app/api/client.ts).
const STORAGE_KEY = 'ishonchliusta:locale'

export default defineNuxtPlugin((nuxtApp) => {
  const i18n = nuxtApp.$i18n

  const saved = localStorage.getItem(STORAGE_KEY)
  if ((saved === 'ru' || saved === 'uz') && saved !== i18n.locale.value) {
    i18n.setLocale(saved)
  }

  watch(i18n.locale, (value) => {
    localStorage.setItem(STORAGE_KEY, value)
  })
})
