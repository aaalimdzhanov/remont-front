// Единственное место, которое переводит код активной i18n-локали ('ru'|'uz')
// в BCP-47 тег для Intl.*/toLocaleString — переиспользуется везде, где раньше
// был захардкожен 'ru-RU' (formatPrice/formatMarketplaceDate в
// utils/marketplace.ts, formatDate в EditorHeader.vue, formatUpdatedAt в
// ProjectCard.vue). Один helper вместо копии этой логики в каждом файле.
export function localeTag(locale: string): string {
  return locale === 'uz' ? 'uz-UZ' : 'ru-RU'
}

// Chromium (подтверждено вручную реальным Chromium QA, не только в Node) не
// знает названия месяцев для узбекского — Intl.*.toLocaleString с
// month:'short'/'long' возвращает мусор вида "M09" вместо "sen" для ЛЮБОГО
// варианта uz-тега (проверено uz, uz-UZ, uz-Latn, uz-Latn-UZ — везде
// одинаково). Свой short-array вместо Intl только для этого случая; всё
// остальное форматирование (числа, время, day:'numeric') Intl отдаёт
// корректно на обоих языках, там он не тронут.
const UZ_SHORT_MONTHS = ['yan', 'fev', 'mart', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek']

export function formatShortDate(date: Date, locale: string): string {
  if (locale === 'uz') {
    return `${date.getDate()}-${UZ_SHORT_MONTHS[date.getMonth()]}`
  }
  return date.toLocaleDateString(localeTag(locale), { day: 'numeric', month: 'short' })
}
