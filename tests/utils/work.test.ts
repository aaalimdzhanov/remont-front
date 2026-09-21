import { describe, expect, it } from 'vitest'
import { categoryIcon, formatQuantity, measurementSourceLabel, statusLabel, unitLabel, workTypeIcon } from '~/utils/work'

describe('formatQuantity', () => {
  it('formats m2 with 2 decimal places', () => {
    expect(formatQuantity(5.6, 'm2')).toBe('5.60 м²')
    expect(formatQuantity(38.4, 'm2')).toBe('38.40 м²')
  })

  it('formats m with 2 decimal places', () => {
    expect(formatQuantity(12.5, 'm')).toBe('12.50 м')
  })

  it('formats pcs as a rounded whole number', () => {
    expect(formatQuantity(4, 'pcs')).toBe('4 шт')
    expect(formatQuantity(4.0, 'pcs')).toBe('4 шт')
  })
})

describe('unitLabel', () => {
  it('maps every backend unit to its Russian label', () => {
    expect(unitLabel('m2')).toBe('м²')
    expect(unitLabel('m')).toBe('м')
    expect(unitLabel('pcs')).toBe('шт')
  })
})

describe('measurementSourceLabel', () => {
  it('maps every backend measurement_source to a human-readable label', () => {
    expect(measurementSourceLabel('floor_area')).toBe('Площадь пола')
    expect(measurementSourceLabel('ceiling_area')).toBe('Площадь потолка')
    expect(measurementSourceLabel('wall_net_area')).toBe('Площадь стен')
    expect(measurementSourceLabel('door_count')).toBe('Количество дверей')
    expect(measurementSourceLabel('window_count')).toBe('Количество окон')
    expect(measurementSourceLabel('fixed')).toBe('Ввод вручную')
  })
})

describe('statusLabel', () => {
  it('maps every backend status to a human-readable label', () => {
    expect(statusLabel('planned')).toBe('Запланировано')
    expect(statusLabel('in_progress')).toBe('В работе')
    expect(statusLabel('completed')).toBe('Выполнено')
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
