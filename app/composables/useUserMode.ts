// User Mode — frontend-only UI preference, не auth role (см. utils/userMode.ts
// и задание, секция 17: "Frontend mode НЕ является security boundary").
// Тот же useState-паттерн, что и остальные composables проекта (НЕ Pinia/Vuex).
// Единственный источник истины для режима — один useState-ключ здесь, ничего
// не дублируется в других composables.
import { clearStoredUserMode, getModeHomeRoute, readStoredUserMode, writeStoredUserMode } from '~/utils/userMode'
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

  // Header/body mode desync bugfix: setMode — единственный существующий
  // вход для смены режима (вызывается только ProfileMenu.selectMode) — до
  // этой правки менял только это useState, ничего не зная о текущем route.
  // Header (AppModeNav/AppHeader) реактивно читает mode и перерисовывался
  // сразу; body оставался от старого route — получалось "header одного
  // режима, body другого" (см. баг-репорт). Вместо воркэраунда в вызывающем
  // компоненте, переход на главную страницу режима встроен прямо сюда —
  // единственную точку изменения mode, — чтобы mode и route не могли
  // разойтись независимо от того, кто в будущем вызовет setMode.
  // navigateTo(..., {replace:true}) — тот же паттерн, что и в
  // middleware/home.ts и pages/marketplace/index.vue: смена режима — это
  // смена рабочего контекста, а не обычный переход, и replace (не push) не
  // оставляет в истории Back/Forward "устаревшую" страницу, на которой
  // route уже не соответствует новому активному mode.
  async function setMode(next: UserMode): Promise<void> {
    const changed = mode.value !== next
    mode.value = next
    writeStoredUserMode(next)
    if (changed) await navigateTo(getModeHomeRoute(next), { replace: true })
  }

  function toggleMode(): void {
    void setMode(mode.value === 'client' ? 'contractor' : 'client')
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
