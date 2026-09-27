// Project Location v1 — справочник city/district для выбора при создании/
// редактировании проекта (см. api/types.ts Location — тот же тип, что уже
// использует Contractor.ServiceLocation/Marketplace Request, здесь не
// дублируется). Backend хранит только { city, district } (или null) — без
// точного адреса/GPS (см. locationResponse на backend: "must never gain
// fields like latitude/longitude/address").
//
// Backend НЕ предоставляет endpoint для списка городов/районов (только
// GET /work-categories, /work-types — это про виды работ, не про
// местоположение) — поэтому это frontend-only справочник ВЫБОРА, а не
// пользовательские данные: реальные крупные города Узбекистана (областные
// центры), Ташкент — с настоящими 11 районами (тумани), остальные города —
// с одним обобщённым "Центр" (v1, без точного административного деления по
// каждому городу — не выдумываем то, в чём не уверены).
import type { Location } from '~/api/types'

export interface LocationCityOption {
  city: string
  districts: string[]
}

export const LOCATION_CATALOG: LocationCityOption[] = [
  {
    city: 'Ташкент',
    districts: [
      'Алмазарский',
      'Бектемирский',
      'Мирабадский',
      'Мирзо-Улугбекский',
      'Сергелийский',
      'Учтепинский',
      'Чиланзарский',
      'Шайхантахурский',
      'Юнусабадский',
      'Яккасарайский',
      'Яшнабадский',
    ],
  },
  { city: 'Самарканд', districts: ['Центр'] },
  { city: 'Бухара', districts: ['Центр'] },
  { city: 'Андижан', districts: ['Центр'] },
  { city: 'Наманган', districts: ['Центр'] },
  { city: 'Фергана', districts: ['Центр'] },
  { city: 'Нукус', districts: ['Центр'] },
  { city: 'Карши', districts: ['Центр'] },
  { city: 'Термез', districts: ['Центр'] },
  { city: 'Ургенч', districts: ['Центр'] },
  { city: 'Джизак', districts: ['Центр'] },
  { city: 'Навои', districts: ['Центр'] },
  { city: 'Гулистан', districts: ['Центр'] },
  { city: 'Коканд', districts: ['Центр'] },
]

export const LOCATION_CITIES: string[] = LOCATION_CATALOG.map(entry => entry.city)

export function districtsForCity(city: string): string[] {
  return LOCATION_CATALOG.find(entry => entry.city === city)?.districts ?? []
}

// ---- Локализация ОТОБРАЖЕНИЯ (не значения) ----
// Канонические значения city/district (см. LOCATION_CATALOG выше) — это
// ровно то, что уходит в Location.city/district на backend и хранится там
// как opaque-строка (нет своего каталога на backend — см. комментарий
// сверху файла). Эти значения НИКОГДА не меняются в зависимости от языка
// интерфейса — иначе один и тот же реальный город выглядел бы как два
// разных значения в зависимости от того, на каком языке пользователь его
// выбрал при создании проекта, и уже сохранённые локации перестали бы
// находить свои районы/сравниваться при смене языка. Локализуется только
// то, что видит пользователь — подпись в <select>/на карточке, через
// locationDisplayName(), при этом сохраняемое/сравниваемое значение остаётся
// каноническим (RU) текстом.
const CITY_DISPLAY_UZ: Record<string, string> = {
  'Ташкент': 'Toshkent',
  'Самарканд': 'Samarqand',
  'Бухара': 'Buxoro',
  'Андижан': 'Andijon',
  'Наманган': 'Namangan',
  'Фергана': 'Farg\'ona',
  'Нукус': 'Nukus',
  'Карши': 'Qarshi',
  'Термез': 'Termiz',
  'Ургенч': 'Urganch',
  'Джизак': 'Jizzax',
  'Навои': 'Navoiy',
  'Гулистан': 'Guliston',
  'Коканд': 'Qo\'qon',
}

const DISTRICT_DISPLAY_UZ: Record<string, string> = {
  'Алмазарский': 'Olmazor',
  'Бектемирский': 'Bektemir',
  'Мирабадский': 'Mirobod',
  'Мирзо-Улугбекский': 'Mirzo Ulug\'bek',
  'Сергелийский': 'Sergeli',
  'Учтепинский': 'Uchtepa',
  'Чиланзарский': 'Chilonzor',
  'Шайхантахурский': 'Shayxontohur',
  'Юнусабадский': 'Yunusobod',
  'Яккасарайский': 'Yakkasaroy',
  'Яшнабадский': 'Yashnobod',
  'Центр': 'Markaz',
}

export function locationDisplayName(canonicalName: string, locale: string): string {
  if (locale !== 'uz') return canonicalName
  return CITY_DISPLAY_UZ[canonicalName] ?? DISTRICT_DISPLAY_UZ[canonicalName] ?? canonicalName
}

// ---- Draft city/district -> Location | null (правила выбора, секция 18) ----
// Пустой city всегда означает "location не выбран" — никакого сохранения
// district без city. Смена city сбрасывает ранее выбранный district (нельзя
// получить { city: "Самарканд", district: "Юнусабадский" }).

export function setLocationCity(city: string): Location | null {
  if (!city) return null
  return { city, district: '' }
}

export function setLocationDistrict(current: Location | null, district: string): Location | null {
  if (!current || !current.city) return current
  return { ...current, district }
}
