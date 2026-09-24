// Presentation/pure-logic хелперы для Portfolio ("Мои работы") — ничего не
// запрашивает и не хранит; drag-reorder в MarketplacePortfolioGrid.vue
// использует moveItem() как единственную чистую функцию пересчёта порядка
// (тестируется отдельно, без монтирования компонента — см. задание, секция
// TESTS и общий паттерн проекта: vitest, environment 'node', без
// @vue/test-utils).
export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex
    || fromIndex < 0 || fromIndex >= items.length
    || toIndex < 0 || toIndex >= items.length
  ) {
    return items
  }
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved as T)
  return next
}

// alt-текст для фото работы (см. задание, секция ACCESSIBILITY): реальный
// title, если он заполнен, иначе честный fallback — никогда пустой alt и
// никогда не выдуманное описание содержимого фото.
export function portfolioImageAlt(title: string): string {
  const trimmed = title.trim()
  return trimmed ? trimmed : 'Работа мастера'
}

// ---- Frontend pre-validation (см. задание, секция FRONTEND VALIDATION) ----
// Только предварительная UX-проверка — backend сам проверяет реальные magic
// bytes и является source of truth (см. portfolio_handler.go Create: "не
// доверять только Content-Type"). Значения ниже — РЕАЛЬНЫЕ backend-лимиты,
// не выдуманные: 10MB см. maxPortfolioImageBytes в portfolio_handler.go;
// jpeg/png/webp см. AllowedImageContentTypes в application/portfolio/
// service.go; 200/2000 символов см. MaxTitleLength/MaxDescriptionLength в
// domain/portfolio/portfolio_item.go.
export const PORTFOLIO_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const PORTFOLIO_MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const PORTFOLIO_MAX_TITLE_LENGTH = 200
export const PORTFOLIO_MAX_DESCRIPTION_LENGTH = 2000

export function isAllowedPortfolioImageType(mimeType: string): boolean {
  return (PORTFOLIO_ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)
}

export function isPortfolioImageSizeValid(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= PORTFOLIO_MAX_IMAGE_BYTES
}

// Возвращает первую найденную ошибку файла (тип или размер) — null, если
// файл проходит обе проверки. Один общий валидатор, чтобы форма не
// дублировала порядок проверок в двух местах.
export function validatePortfolioImageFile(file: File): string | null {
  if (!isAllowedPortfolioImageType(file.type)) {
    return 'Поддерживаются только JPG, PNG и WebP.'
  }
  if (!isPortfolioImageSizeValid(file.size)) {
    return 'Размер файла не должен превышать 10 МБ.'
  }
  return null
}

export function isPortfolioTitleValid(title: string): boolean {
  return title.length <= PORTFOLIO_MAX_TITLE_LENGTH
}

export function isPortfolioDescriptionValid(description: string): boolean {
  return description.length <= PORTFOLIO_MAX_DESCRIPTION_LENGTH
}
