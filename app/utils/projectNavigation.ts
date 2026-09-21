// Чистая логика active-state для ProjectNavigation.vue, вынесенная отдельно,
// чтобы её можно было юнит-тестировать без монтирования компонента (в проекте
// нет @vue/test-utils, и новые зависимости добавлять нельзя — см. задание).
// Единственный источник истины — путь текущего route, никакого отдельного
// activeTab state и никакого localStorage/sessionStorage.
export function isWorksRouteActive(path: string): boolean {
  return path.endsWith('/works')
}
