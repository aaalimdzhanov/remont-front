import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Регрессия на реальный баг (см. BuilderWorksCta "+ Добавить работы" клик
// не работал): Nuxt file-based routing трактует `pages/foo.vue` рядом с
// директорией `pages/foo/` как РОДИТЕЛЬСКИЙ route для всего, что внутри
// `foo/` (child-маршруты рендерятся только через <NuxtPage/> внутри foo.vue).
// `app/pages/projects/draft.vue` существовал рядом с `app/pages/projects/draft/
// works.vue` — Nuxt сгенерировал `projects-draft-works` ДОЧЕРНИМ route
// `projects-draft` (см. скомпилированный router manifest: `children:[...]`),
// а draft.vue не рендерил <NuxtPage/> — поэтому URL менялся, но контент
// `/projects/draft/works` никогда не появлялся (клик "не работал"). Починено
// переносом draft.vue → draft/index.vue (тот же паттерн, что уже
// используется для projects/[id]/index.vue + projects/[id]/works.vue —
// обычные flat-соседи в одной директории, без неявной вложенности).
//
// Этот тест — общий guard против ВСЕГО класса таких багов в app/pages:
// падает, если где-либо появится файл `X.vue` рядом с директорией `X/`.
const PAGES_DIR = join(__dirname, '../../app/pages')

function findConflicts(dir: string, trail: string[] = []): string[] {
  const entries = readdirSync(dir)
  const files = new Set(entries.filter(e => e.endsWith('.vue')).map(e => e.slice(0, -4)))
  const dirs = entries.filter(e => statSync(join(dir, e)).isDirectory())

  const conflicts: string[] = []
  for (const d of dirs) {
    if (files.has(d)) conflicts.push([...trail, `${d}.vue`].join('/') + ` (alongside directory "${d}/")`)
    conflicts.push(...findConflicts(join(dir, d), [...trail, d]))
  }
  return conflicts
}

describe('app/pages — no accidental Nuxt nested-route conflicts', () => {
  it('no page file "X.vue" sits next to a same-named directory "X/" (that silently nests all its routes as unreachable children)', () => {
    expect(findConflicts(PAGES_DIR)).toEqual([])
  })
})
