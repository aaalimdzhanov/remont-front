import { describe, expect, it } from 'vitest'
import { categoryIcon, formatQuantity, measurementSourceLabel, statusLabel, unitLabel, workTypeIcon } from '~/utils/work'

const t = (key: string) => key

describe('formatQuantity', () => {
  it('formats m2 with 2 decimal places', () => {
    expect(formatQuantity(5.6, 'm2', t)).toBe('5.60 builder.unit.m2')
    expect(formatQuantity(38.4, 'm2', t)).toBe('38.40 builder.unit.m2')
  })

  it('formats m with 2 decimal places', () => {
    expect(formatQuantity(12.5, 'm', t)).toBe('12.50 builder.unit.m')
  })

  it('formats pcs as a rounded whole number', () => {
    expect(formatQuantity(4, 'pcs', t)).toBe('4 builder.unit.pcs')
    expect(formatQuantity(4.0, 'pcs', t)).toBe('4 builder.unit.pcs')
  })
})

describe('unitLabel', () => {
  it('resolves every backend unit through the builder.unit.* i18n namespace', () => {
    expect(unitLabel('m2', t)).toBe('builder.unit.m2')
    expect(unitLabel('m', t)).toBe('builder.unit.m')
    expect(unitLabel('pcs', t)).toBe('builder.unit.pcs')
  })
})

describe('measurementSourceLabel', () => {
  it('resolves every backend measurement_source through builder.measurementSource.*', () => {
    expect(measurementSourceLabel('floor_area', t)).toBe('builder.measurementSource.floor_area')
    expect(measurementSourceLabel('ceiling_area', t)).toBe('builder.measurementSource.ceiling_area')
    expect(measurementSourceLabel('wall_net_area', t)).toBe('builder.measurementSource.wall_net_area')
    expect(measurementSourceLabel('door_count', t)).toBe('builder.measurementSource.door_count')
    expect(measurementSourceLabel('window_count', t)).toBe('builder.measurementSource.window_count')
    expect(measurementSourceLabel('fixed', t)).toBe('builder.measurementSource.fixed')
  })
})

describe('statusLabel', () => {
  it('resolves every backend status through status.work.*', () => {
    expect(statusLabel('planned', t)).toBe('status.work.planned')
    expect(statusLabel('in_progress', t)).toBe('status.work.in_progress')
    expect(statusLabel('completed', t)).toBe('status.work.completed')
  })
})

describe('categoryIcon', () => {
  it('maps every real backend category slug (migration 006) to an icon', () => {
    expect(categoryIcon('walls')).toBe('wall')
    expect(categoryIcon('floors')).toBe('layers')
    expect(categoryIcon('tiles')).toBe('grid')
    expect(categoryIcon('ceilings')).toBe('ceiling')
    expect(categoryIcon('electrical')).toBe('bolt')
    expect(categoryIcon('plumbing')).toBe('faucet')
    expect(categoryIcon('doors-windows')).toBe('door')
    expect(categoryIcon('demolition')).toBe('hammer')
  })

  it('falls back to a neutral icon for an unknown category slug', () => {
    expect(categoryIcon('something-new')).toBe('room')
  })
})

describe('workTypeIcon', () => {
  // Реальные slug'и из migrations/006_create_work_catalog.sql — некоторые
  // содержат несколько ключевых слов сразу (floor-tiles, tile-demolition),
  // порядок проверки в workTypeIcon() должен разрешать это осмысленно.
  it('prefers the tile icon for floor-tiles (contains both "floor" and "tile")', () => {
    expect(workTypeIcon('floor-tiles', 'tiles')).toBe('grid')
  })

  it('prefers the demolition icon for tile-demolition (contains both "tile" and "demolition")', () => {
    expect(workTypeIcon('tile-demolition', 'demolition')).toBe('hammer')
  })

  it('maps wallpaper/painting to roller', () => {
    expect(workTypeIcon('wallpaper-installation', 'walls')).toBe('roller')
    expect(workTypeIcon('wall-painting', 'walls')).toBe('roller')
  })

  it('maps laminate/parquet flooring to layers', () => {
    expect(workTypeIcon('laminate-flooring', 'floors')).toBe('layers')
  })

  it('maps door/window installation to their own icons', () => {
    expect(workTypeIcon('interior-door-installation', 'doors-windows')).toBe('door')
    expect(workTypeIcon('window-installation', 'doors-windows')).toBe('window')
  })

  it('maps fixed/manual outlet & wiring work to electrical icons', () => {
    expect(workTypeIcon('outlet-installation', 'electrical')).toBe('bolt')
    expect(workTypeIcon('electrical-wiring', 'electrical')).toBe('bolt')
  })

  it('falls back to the category icon when no keyword matches', () => {
    expect(workTypeIcon('some-unrecognized-slug', 'plumbing')).toBe('faucet')
  })
})
