// Public Marketplace as the Landing Page v1: `/` больше не "управление
// проектами" — публичная биржа заявок (/marketplace, уже полностью
// guest-ready) теперь единственная и безусловная точка входа продукта для
// ВСЕХ (гость/клиент/мастер, см. задание, секция 3: "Это сознательное
// решение") — никакой auth-проверки здесь нет и не должно быть. Отдельный
// middleware вместо прежнего `await navigateTo()` прямо в pages/index.vue —
// тот же паттерн, что и auth.ts/guest.ts (обычная функция), а НЕ потому что
// тут есть auth-логика: она тестируется тем же способом (см.
// tests/middleware/home.test.ts), не требуя @vue/test-utils.
export default defineNuxtRouteMiddleware(() => {
  return navigateTo('/marketplace', { replace: true })
})
