// Public Contractor Profile — состояние + API-вызов, тот же useState-паттерн,
// что и остальные composables проекта (НЕ Pinia/Vuex). Отдельный от
// useMarketplace()'s `contractor` (та же useState-переменная хранит
// СОБСТВЕННЫЙ self-profile текущего пользователя, см. app/pages/marketplace/
// contractor.vue) — здесь состояние про ЧУЖОЙ публичный профиль по id из
// route, смешивать их было бы неверно (разные жизненные циклы, разные
// значения одновременно, если пользователь одновременно и сам мастер, и
// смотрит чей-то ещё профиль).
//
// Public Marketplace — «Мастера на платформе» v1: список (GET
// /api/v1/contractors) живёт в ЭТОМ ЖЕ composable, не в отдельном — тот же
// API-модуль (api/contractor.ts), тот же PublicContractorProfile-тип для
// элемента списка (backend отдаёт список через тот же toPublicContractorResponse
// маппер, что и single-GET, см. router.go/public_contractor_handler.go —
// поэтому и на фронте один и тот же тип/маппер, без дублирования).
// contractorsLoaded — тот же guard-паттерн, что и catalogLoaded в
// useMarketplace.ts loadFilterCatalog(): повторный fetchContractors() после
// успеха — no-op (не грузим один и тот же список на каждый re-mount
// страницы); после ОШИБКИ loaded остаётся false, поэтому retry просто
// вызывает fetchContractors() ещё раз без отдельной retry()-обёртки.
import { getPublicContractor, getPublicContractors } from '~/api/contractor'
import { isApiError, toApiError } from '~/api/client'
import type { ApiError, PublicContractorProfile } from '~/api/types'

export function usePublicContractor() {
  // undefined — ещё не грузили; null — реальный 404 (см. contractor_not_found
  // в public_contractor_handler.go); объект — загруженный профиль.
  const contractor = useState<PublicContractorProfile | null | undefined>('public-contractor', () => undefined)
  const isLoading = useState<boolean>('public-contractor-loading', () => false)
  const error = useState<ApiError | null>('public-contractor-error', () => null)

  const contractors = useState<PublicContractorProfile[]>('public-contractors', () => [])
  const contractorsLoading = useState<boolean>('public-contractors-loading', () => false)
  const contractorsError = useState<ApiError | null>('public-contractors-error', () => null)
  const contractorsLoaded = useState<boolean>('public-contractors-loaded', () => false)

  // Guard против конкурентных вызовов (например, если компонент почему-то
  // вызовет это из нескольких мест почти одновременно) и против повторной
  // загрузки уже успешно загруженного списка.
  async function fetchContractors(): Promise<void> {
    if (contractorsLoading.value || contractorsLoaded.value) return
    contractorsLoading.value = true
    contractorsError.value = null
    try {
      contractors.value = await getPublicContractors()
      contractorsLoaded.value = true
    } catch (err) {
      contractorsError.value = isApiError(err) ? err : toApiError(err)
    } finally {
      contractorsLoading.value = false
    }
  }

  // Явный retry для UI ("Повторить" после ошибки) — сбрасывает loaded, чтобы
  // fetchContractors() выше не был заблокирован собственным же guard'ом.
  async function retryContractors(): Promise<void> {
    contractorsLoaded.value = false
    await fetchContractors()
  }

  async function fetchContractor(id: string): Promise<void> {
    isLoading.value = true
    error.value = null
    // Сбрасываем перед загрузкой — иначе при переходе с одного публичного
    // профиля сразу на другой (route param меняется без размонтирования
    // страницы) на экране на мгновение мелькнул бы ПРЕДЫДУЩИЙ мастер вместо
    // честного loading-состояния (см. задание, секция TESTS: "state reset
    // between IDs").
    contractor.value = undefined
    try {
      contractor.value = await getPublicContractor(id)
    } catch (err) {
      if (isApiError(err) && err.status === 404) {
        contractor.value = null
      } else {
        error.value = isApiError(err) ? err : toApiError(err)
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    contractor,
    isLoading,
    error,
    fetchContractor,
    contractors,
    contractorsLoading,
    contractorsError,
    fetchContractors,
    retryContractors,
  }
}
