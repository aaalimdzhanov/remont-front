// Чистая логика active-state для ProjectNavigation.vue, вынесенная отдельно,
// чтобы её можно было юнит-тестировать без монтирования компонента (в проекте
// нет @vue/test-utils, и новые зависимости добавлять нельзя — см. задание).
// Единственный источник истины — путь текущего route, никакого отдельного
// activeTab state и никакого localStorage/sessionStorage.
export function isWorksRouteActive(path: string): boolean {
  return path.endsWith('/works')
}

// Entry-point route для BuilderWorksCta.vue (CTA под Builder canvas) — тот же
// mode-сигнал, что уже использует весь остальной Work Builder: projectId
// (из useProjectPersistence) null означает guest/ещё-не-сохранённый draft,
// любое другое значение — реальный authenticated-проект. Вынесено отдельно
// по тому же принципу, что isWorksRouteActive выше — юнит-тест без
// монтирования компонента.
export function resolveWorksCtaHref(projectId: string | null): string {
  return projectId ? `/projects/${projectId}/works` : '/projects/draft/works'
}
