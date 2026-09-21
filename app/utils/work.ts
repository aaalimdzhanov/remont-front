// Presentation-only хелперы для Work Builder: форматирование значений,
// пришедших от backend (Work Catalog/ProjectWork API), и deterministic
// маппинг категория/вид работы → существующая line-иконка (UiIcon). Ничего
// здесь не считает quantity и не дублирует backend business-логику — только
// человекочитаемые подписи для уже готовых enum-значений/чисел.
import type { MeasurementSource, WorkStatus, WorkUnit } from '~/api/types'

export function unitLabel(unit: WorkUnit): string {
  switch (unit) {
    case 'm2': return 'м²'
    case 'm': return 'м'
    case 'pcs': return 'шт'
  }
}

// 5.6 → "5.60 м²", 12.5 → "12.50 м", 4 → "4 шт" — см. задание, секция
// AUTOMATIC QUANTITY DISPLAY. Значение не трогается, только вид.
export function formatQuantity(quantity: number, unit: WorkUnit): string {
  const number = unit === 'pcs' ? String(Math.round(quantity)) : quantity.toFixed(2)
  return `${number} ${unitLabel(unit)}`
}

const MEASUREMENT_SOURCE_LABELS: Record<MeasurementSource, string> = {
  floor_area: 'Площадь пола',
  ceiling_area: 'Площадь потолка',
  wall_net_area: 'Площадь стен',
  door_count: 'Количество дверей',
  window_count: 'Количество окон',
  fixed: 'Ввод вручную',
}

export function measurementSourceLabel(source: MeasurementSource): string {
  return MEASUREMENT_SOURCE_LABELS[source]
}

const STATUS_LABELS: Record<WorkStatus, string> = {
  planned: 'Запланировано',
  in_progress: 'В работе',
  completed: 'Выполнено',
}

export function statusLabel(status: WorkStatus): string {
  return STATUS_LABELS[status]
}

export const WORK_STATUS_OPTIONS: WorkStatus[] = ['planned', 'in_progress', 'completed']

// Иконка категории по её slug (см. миграцию 006_create_work_catalog.sql на
// backend — эти 8 slug'ов реальные, не выдуманные). 'room' — нейтральный
// fallback для категории, которую backend может добавить позже.
const CATEGORY_ICONS: Record<string, IconNameForWork> = {
  walls: 'wall',
  floors: 'layers',
  tiles: 'grid',
  ceilings: 'ceiling',
  electrical: 'bolt',
  plumbing: 'faucet',
  'doors-windows': 'door',
  demolition: 'hammer',
}

// Локальный тип вместо импорта из Icon.vue (компонент не экспортирует
// IconName) — используем только те имена, что реально объявлены там.
type IconNameForWork =
  | 'wall' | 'layers' | 'grid' | 'ceiling' | 'bolt' | 'faucet' | 'door' | 'window' | 'hammer' | 'roller' | 'room'

export function categoryIcon(slug: string): IconNameForWork {
  return CATEGORY_ICONS[slug] ?? 'room'
}

// Вид работы — более точный keyword-mapping по slug (задание перечисляет
// именно эти ключевые слова), с fallback на иконку категории.
export function workTypeIcon(slug: string, categorySlug: string): IconNameForWork {
  // Порядок важен: некоторые реальные backend-slug'и содержат сразу
  // несколько ключевых слов (например "floor-tiles" — и "floor", и "tile";
  // "tile-demolition" — и "tile", и "demolition") — более специфичный/
  // однозначный признак (demolition) проверяется раньше общего ("floor").
  if (slug.includes('demolition')) return 'hammer'
  if (slug.includes('wallpaper') || slug.includes('paint')) return 'roller'
  if (slug.includes('plaster')) return 'wall'
  if (slug.includes('tile')) return 'grid'
  if (slug.includes('floor') || slug.includes('laminate') || slug.includes('parquet') || slug.includes('linoleum') || slug.includes('screed')) return 'layers'
  if (slug.includes('ceiling')) return 'ceiling'
  if (slug.includes('door')) return 'door'
  if (slug.includes('window')) return 'window'
  if (slug.includes('outlet') || slug.includes('wiring') || slug.includes('electrical')) return 'bolt'
  if (slug.includes('plumbing') || slug.includes('faucet') || slug.includes('pipe') || slug.includes('waterproofing')) return 'faucet'
  return categoryIcon(categorySlug)
}
