// Presentation/pre-validation хелперы для Contractor Profile Photo v1 — тот
// же паттерн, что и utils/portfolio.ts (честная UX-подсказка ДО отправки,
// backend всё равно перепроверяет реальные magic bytes и остаётся source of
// truth, см. contractor_photo_handler.go). Отдельный файл, а не
// расширение portfolio.ts: лимит размера другой (5MB, не 10MB, см.
// maxProfilePhotoBytes в contractor_photo_handler.go) — общий константный
// набор дал бы неверное число в сообщении об ошибке для одной из двух фич.
export const CONTRACTOR_PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const CONTRACTOR_PHOTO_MAX_BYTES = 5 * 1024 * 1024

export function isAllowedContractorPhotoType(mimeType: string): boolean {
  return (CONTRACTOR_PHOTO_ALLOWED_TYPES as readonly string[]).includes(mimeType)
}

export function isContractorPhotoSizeValid(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= CONTRACTOR_PHOTO_MAX_BYTES
}

// errors.invalid_image_type переиспользуется как есть (тот же текст, что и
// у Portfolio, не завязан на конкретный размер) — только "слишком большой"
// нужен свой текст с верным числом (contractorProfile.photoTooLarge).
export function validateContractorPhotoFile(file: File, t: (key: string) => string): string | null {
  if (!isAllowedContractorPhotoType(file.type)) {
    return t('errors.invalid_image_type')
  }
  if (!isContractorPhotoSizeValid(file.size)) {
    return t('contractorProfile.photoTooLarge')
  }
  return null
}
