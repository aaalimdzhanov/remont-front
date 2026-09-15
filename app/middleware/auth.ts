// Защищает /projects, /projects/new, /projects/{id}. Session restore
// требует HttpOnly refresh cookie, которую сервер не может прочитать в этой
// архитектуре (нет SSR cookie-forwarding — см. app.vue) — поэтому проверка
// сознательно client-only: на SSR-проходе просто пропускаем навигацию не
// трогая её (иначе КАЖДЫЙ SSR-рендер защищённой страницы редиректил бы на
// /auth/login, даже у реально залогиненных пользователей, т.к. на сервере
// accessToken всегда пуст). Реальное решение принимается при hydration.
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const { isInitialized, isAuthenticated, initialize } = useAuth()
  if (!isInitialized.value) await initialize()

  if (!isAuthenticated.value) {
    return navigateTo('/auth/login')
  }
})
