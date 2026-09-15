// Защищает /auth/login, /auth/register от уже авторизованных пользователей.
// Тот же client-only принцип, что и в auth.ts — см. комментарий там.
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const { isInitialized, isAuthenticated, initialize } = useAuth()
  if (!isInitialized.value) await initialize()

  if (isAuthenticated.value) {
    return navigateTo('/projects')
  }
})
