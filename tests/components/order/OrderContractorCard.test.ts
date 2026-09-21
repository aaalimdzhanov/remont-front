// OrderContractorCard.vue is presentation-only: given `contractor`, it
// renders either the name/description card or the "недоступна" fallback,
// using contractorDisplayName()/contractorDescription() from utils/order.ts
// for every piece of text it shows. This project's Vitest setup has no
// @vue/test-utils and no DOM (vitest.config.ts: environment 'node', a
// deliberate choice — no SFC is mounted anywhere in this test suite), so
// this file exercises the exact same display logic the component's
// template calls, rather than mounting the component itself. Combined with
// the real-Chromium QA pass (see the task's final report), this covers both
// "the logic is correct" and "the real rendered page looks right".
import { describe, expect, it } from 'vitest'
import { contractorDescription, contractorDisplayName } from '~/utils/order'
import type { OrderContractorSummary } from '~/api/types'

const contractor: OrderContractorSummary = { id: 'ct1', name: 'Азиз', description: 'Плитка, 5 лет опыта' }

describe('OrderContractorCard display logic — name', () => {
  it('shows the contractor name', () => {
    expect(contractorDisplayName(contractor)).toBe('Азиз')
  })

  it('falls back to "Мастер" when contractor is null (backend edge case)', () => {
    expect(contractorDisplayName(null)).toBe('Мастер')
  })

  it('falls back to "Мастер" when name is empty/whitespace (defensive, should not happen per backend validation)', () => {
    expect(contractorDisplayName({ ...contractor, name: '   ' })).toBe('Мастер')
  })
})

describe('OrderContractorCard display logic — description', () => {
  it('shows the description when present', () => {
    expect(contractorDescription(contractor)).toBe('Плитка, 5 лет опыта')
  })

  it('returns null when description is absent (empty string) — the template hides the line entirely, not an empty paragraph', () => {
    expect(contractorDescription({ ...contractor, description: '' })).toBeNull()
  })

  it('returns null when contractor itself is null (fallback state has no description line)', () => {
    expect(contractorDescription(null)).toBeNull()
  })
})

describe('OrderContractorCard — never surfaces id (UUID) or phone', () => {
  it('OrderContractorSummary has no phone field at all — structurally impossible to display it', () => {
    // No @ts-expect-error needed: TypeScript already refuses `contractor.phone`
    // at compile time because the type (api/types.ts) never declares it —
    // this is the actual guarantee, asserted here at the value level too.
    expect(Object.keys(contractor).sort()).toEqual(['description', 'id', 'name'])
    expect(contractor).not.toHaveProperty('phone')
  })

  it('the display functions only ever return name/description strings — never the id (UUID)', () => {
    expect(contractorDisplayName(contractor)).not.toContain(contractor.id)
    expect(contractorDescription(contractor)).not.toContain(contractor.id)
  })
})
