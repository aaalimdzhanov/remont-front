// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  // strategy:'no_prefix' — язык не появляется в URL (/ru/..., /uz/...), ни
  // один существующий маршрут не меняется. detectBrowserLanguage:false —
  // переключение только вручную через переключатель в ProfileMenu, никакого
  // auto-redirect/auto-select по Accept-Language браузера. ВАЖНО:
  // detectBrowserLanguage:false отключает и встроенный cookie-механизм
  // модуля целиком (это одна и та же опция) — поэтому персистентность
  // явного выбора пользователя реализована отдельно, см.
  // app/plugins/i18n-persist.client.ts (localStorage, не влияет на
  // detectBrowserLanguage/auto-redirect).
  i18n: {
    locales: [
      { code: 'ru', name: 'Русский', file: 'ru.json' },
      { code: 'uz', name: 'Oʻzbekcha', file: 'uz.json' },
    ],
    defaultLocale: 'ru',
    langDir: '../locales/',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
  },
  app: {
    head: {
      title: 'ishonchliusta',
      // %s подставляется из useHead({ title }) конкретной страницы — единая
      // точка суффикса бренда вместо "— ishonchliusta" в конце каждого title.
      titleTemplate: '%s — ishonchliusta',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
        },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      // Переопределяется через NUXT_PUBLIC_API_BASE_URL (см. .env.example).
      // Никогда не хардкодить http://localhost:8080 в компонентах/составных.
      apiBaseUrl: 'http://localhost:8080',
    },
  },
  // Session restore зависит от HttpOnly refresh-cookie, которую сервер в
  // этой архитектуре не форвардит в SSR-запрос (см. middleware/auth.ts,
  // middleware/guest.ts — сознательно client-only). Без этого SSR рендерил
  // бы auth-зависимые страницы "как будто unauthenticated", а клиентский
  // редирект после этого вызывал бы hydration mismatch (подтверждено вручную:
  // /projects без сессии сначала SSR-рендерил пустой список, потом
  // JS-редиректил на /auth/login поверх уже отрисованного DOM). ssr:false
  // именно для этих routes — самый простой способ убрать причину, не отключая
  // SSR для всего приложения и не добавляя cookie-forwarding.
  routeRules: {
    '/': { ssr: false },
    '/auth/login': { ssr: false },
    '/auth/register': { ssr: false },
    '/projects': { ssr: false },
    '/projects/**': { ssr: false },
    '/marketplace': { ssr: false },
    '/marketplace/**': { ssr: false },
    '/orders': { ssr: false },
    '/orders/**': { ssr: false },
    '/reviews': { ssr: false },
    '/reviews/**': { ssr: false },
  },
})
