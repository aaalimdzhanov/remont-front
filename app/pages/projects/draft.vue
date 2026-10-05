<script setup lang="ts">
// Публичный entry point в Builder — см. задание "РАЗРЕШИТЬ
// НЕАВТОРИЗОВАННОМУ ПОЛЬЗОВАТЕЛЮ ИСПОЛЬЗОВАТЬ BUILDER". Сознательно НЕТ
// middleware:'auth' — единственная "дыра" в auth-защите /projects/** и
// сделана осознанно: сам Builder (рисование комнат/стен/дверей/окон, 2D/3D,
// расчёты) становится публичным, persistence (Save) остаётся
// authenticated — см. DraftHeader.vue handleSave(). /projects, /projects/new
// и /projects/{id} по-прежнему защищены как раньше, эта страница не
// открывает доступ ни к списку, ни к чужим/реальным проектам — только к
// новому, ещё не сохранённому локальному draft.
//
// НЕТ layout (как и у /projects/{id}/index.vue — полноценного editor'а, а
// не Dashboard-страницы): AppFooter/AppModeNav из layouts/app.vue здесь
// неуместны на редакторском экране, вся чрома — через DraftHeader.vue.
//
// Главная задача — не потерять нарисованный план на пути
// Builder → Login/Register → обратно. useBuilding()'s `document` — обычный
// useState-синглтон: обычная client-side навигация на /auth/login и назад
// НЕ перезагружает страницу, поэтому сам по себе переживает этот путь без
// доп. кода. localStorage (utils/builderDraft.ts) нужен для ДВУХ других
// случаев — hard refresh посреди рисования ДО нажатия "Сохранить" (см.
// SaveButton.vue handleSave()), и обычный уход через ←/logo (см.
// DraftHeader.vue — "Продолжить план" на /marketplace читает тот же ключ).
const route = useRoute()
const { t } = useI18n()
const { document: buildingDocument, documentRevision, loadDocument } = useBuilding()
const { isAuthenticated, isInitialized, initialize } = useAuth()
const { error, createProjectFromDraft, cleanup } = useProjectPersistence()

useHead({ title: computed(() => buildingDocument.value.project.name) })

type Phase = 'resuming' | 'ready'
const phase = ref<Phase>('ready')

// ?save=1 — см. DraftHeader.vue handleSave(): проставляется ТОЛЬКО когда
// гость уже нарисовал план и нажал "Сохранить проект", но не был
// авторизован. После успешного login/register (см. resolveAuthRedirect())
// пользователь возвращается именно сюда с этим флагом — здесь (и только
// здесь) сохранение проекта происходит автоматически, без повторного клика
// и без повторного рисования дома (см. задание: "Это КРИТИЧЕСКИ ВАЖНО").
const isResumingAfterLogin = computed(() => route.query.save === '1')

async function finishPendingSave() {
  phase.value = 'resuming'
  const id = await createProjectFromDraft(buildingDocument.value)
  if (id) {
    clearDraftStorage()
    await navigateTo(`/projects/${id}`)
    return
  }
  // createProjectFromDraft() уже выставил error — остаёмся на странице,
  // пользователь видит Builder с тем же планом и может повторить вручную
  // через DraftHeader.
  phase.value = 'ready'
}

onMounted(async () => {
  if (!isInitialized.value) await initialize()

  if (isResumingAfterLogin.value && isAuthenticated.value) {
    // Восстанавливаем ИЗ localStorage ещё раз перед самим save — обычная
    // client-side навигация Builder → /auth/login → обратно и так сохраняет
    // in-memory document (см. doc comment выше), но если пользователь успел
    // сделать hard refresh прямо на /auth/login (редкий, но реальный
    // случай), in-memory state сбросился бы до пустого — localStorage
    // (записанный ПЕРЕД уходом на login, см. DraftHeader.vue handleSave())
    // остаётся единственным, что переживает и такой путь тоже.
    const stored = loadDraftFromStorage()
    if (stored) loadDocument(stored)
    await finishPendingSave()
    return
  }

  // Обычный/свежий заход. cleanup() сбрасывает Building JSON и projectId к
  // нейтральному состоянию — без этого только что сохранённый (в этой же
  // SPA-сессии) проект мог бы "утечь" в новый draft, если пользователь
  // вернулся на /projects/draft ещё раз (см. doc comment в
  // useProjectPersistence.ts cleanup()). localStorage — единственный
  // источник истины для "был ли прерванный черновик", тем же принципом, что
  // GET по id — для настоящего проекта.
  cleanup()
  const stored = loadDraftFromStorage()
  if (stored) loadDocument(stored)
})

// Лёгкая локальная персистентность черновика (SCENARIO 3: hard refresh
// посреди рисования) — debounce тем же порядком величины, что и autosave
// реального проекта, но это чисто синхронная запись в localStorage, без
// гонок/race-protection реального save pipeline (см. useProjectPersistence
// requestSave()) — они здесь не нужны, пишем всегда самый свежий snapshot.
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null
watch(documentRevision, () => {
  if (draftSaveTimer) clearTimeout(draftSaveTimer)
  draftSaveTimer = setTimeout(() => {
    draftSaveTimer = null
    syncDraftToStorage(buildingDocument.value)
  }, 500)
}, { flush: 'sync' })

onBeforeUnmount(() => {
  if (draftSaveTimer) clearTimeout(draftSaveTimer)
})
</script>

<template>
  <main class="page">
    <template v-if="phase === 'resuming'">
      <div class="page__status">
        <div class="page__spinner" aria-hidden="true" />
        <p class="text-secondary">
          {{ t('builder.draftSaving') }}
        </p>
        <p v-if="error" class="text-secondary">
          {{ error.message }}
        </p>
      </div>
    </template>
    <template v-else>
      <BuilderDraftHeader />
      <Builder />
    </template>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--color-bg);
  box-sizing: border-box;
}

.page__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  min-height: 60vh;
  text-align: center;
  padding: var(--space-4);
}

.page__spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  animation: page-spinner-spin 0.7s linear infinite;
}

@keyframes page-spinner-spin {
  to { transform: rotate(360deg); }
}
</style>
