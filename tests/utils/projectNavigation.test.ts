import { describe, expect, it } from 'vitest'
import { isWorksRouteActive, resolveWorksCtaHref } from '~/utils/projectNavigation'

describe('isWorksRouteActive', () => {
  it('is false for the Builder route /projects/:id → "План" active', () => {
    expect(isWorksRouteActive('/projects/abc-123')).toBe(false)
  })

  it('is true for the Work Builder route /projects/:id/works → "Работы" active', () => {
    expect(isWorksRouteActive('/projects/abc-123/works')).toBe(true)
  })

  it('reflects a direct URL open the same way as an in-app navigation (route path is the only source of truth)', () => {
    // Открытие /projects/:id/works напрямую по URL или после browser refresh
    // даёт тот же самый route.path, что и обычный переход — значит, то же
    // самое active state, без localStorage/sessionStorage.
    expect(isWorksRouteActive('/projects/9f8e2f25-a394-449e-b328-cc56a8e8d33e/works')).toBe(true)
  })

  it('does not false-positive on a project whose id happens to end in "works"-like text', () => {
    // Единственная проверка — суффикс "/works" самого пути, не substring где угодно.
    expect(isWorksRouteActive('/projects/my-works-project')).toBe(false)
  })
})

// BuilderWorksCta.vue (CTA под Builder canvas) — тот же mode-сигнал
// (projectId), что уже использует весь остальной Work Builder, вынесен сюда
// отдельно по той же причине, что isWorksRouteActive выше.
describe('resolveWorksCtaHref', () => {
  it('guest/draft (projectId === null) → /projects/draft/works', () => {
    expect(resolveWorksCtaHref(null)).toBe('/projects/draft/works')
  })

  it('authenticated project → /projects/{id}/works', () => {
    expect(resolveWorksCtaHref('abc-123')).toBe('/projects/abc-123/works')
  })

  it('a real UUID project id is used as-is, not re-encoded or truncated', () => {
    expect(resolveWorksCtaHref('9f8e2f25-a394-449e-b328-cc56a8e8d33e'))
      .toBe('/projects/9f8e2f25-a394-449e-b328-cc56a8e8d33e/works')
  })
})
