// User Mode — frontend-only UI preference, не auth role (см. utils/userMode.ts
// и задание, секция 17: "Frontend mode НЕ является security boundary").
// Тот же useState-паттерн, что и остальные composables проекта (НЕ Pinia/Vuex).
// Единственный источник истины для режима — один useState-ключ здесь, ничего
// не дублируется в других composables.
import { clearStoredUserMode, readStoredUserMode, writeStoredUserMode } from '~/utils/userMode'
import type { UserMode } from '~/utils/userMode'

export function useUserMode() {
  // Инициализатор читает localStorage один раз при первом создании этого
  // useState (т.е. один раз за жизнь JS-приложения — при hard refresh/новой
  // вкладке это снова "первый раз", ровно то самое persistence-поведение,
  // которое просит задание). auth/api-состояние сюда не попадает — см.
  // utils/userMode.ts, комментарий в шапке.
  const mode = useState<UserMode>('user-mode', () => readStoredUserMode() ?? 'client')

  const isClient = computed(() => mode.value === 'client')
  const isContractor = computed(() => mode.value === 'contractor')

  function setMode(next: UserMode): void {
    mode.value = next
    writeStoredUserMode(next)
  }

  function toggleMode(): void {
    setMode(mode.value === 'client' ? 'contractor' : 'client')
  }

  // Вызывается useAuth().logout() (см. задание, секция 13: "После logout
  // mode можно сбрасывать в client") — новый логин всегда начинается с
  // 'client', если явно не решено иначе.
  function resetMode(): void {
    mode.value = 'client'
    clearStoredUserMode()
  }

  return {
    mode,
    isClient,
    isContractor,
    setMode,
    toggleMode,
    resetMode,
  }
}
