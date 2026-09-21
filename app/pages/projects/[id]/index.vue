<script setup lang="ts">
// Полноценный редактор конкретного проекта. GET по id из route — при
// hard-refresh проект восстанавливается ровно так же, как при обычном
// заходе (единый механизм, не localStorage). Пока идёт загрузка, Builder
// не рендерится вообще — иначе пустой Building JSON мог бы на мгновение
// выглядеть как "проект и правда пустой".
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { document: buildingDocument } = useBuilding()
const { loadProject, isDirty, error, cleanup } = useProjectPersistence()
const { isLoggingOut } = useAuth()

// Реактивный заголовок: как только loadProject() подгрузит документ, вкладка
// показывает реальное имя проекта (см. пример "my house — ishonchliusta" в
// задаче на branding migration) — titleTemplate в nuxt.config добавляет
// суффикс бренда сам, здесь достаточно короткого title.
useHead({ title: computed(() => buildingDocument.value.project.name) })

type Phase = 'loading' | 'not-found' | 'error' | 'ready'
const phase = ref<Phase>('loading')

onMounted(async () => {
  const id = route.params.id
  if (typeof id !== 'string' || id.length === 0) {
    phase.value = 'not-found'
    return
  }
  const ok = await loadProject(id)
  if (ok) {
    phase.value = 'ready'
    return
  }
  // apiFetch уже попытался refresh+retry внутри себя (см. app/api/client.ts) —
  // 401 здесь означает, что сессия действительно не восстановилась.
  if (error.value?.status === 401) {
    await navigateTo('/auth/login')
    return
  }
  phase.value = error.value?.status === 404 ? 'not-found' : 'error'
})

// Единая точка защиты от потери данных при уходе со страницы — покрывает
// клик по "← Проекты" (обычный NuxtLink), browser back/forward и любую
// другую программную навигацию, а не только один конкретный обработчик клика.
onBeforeRouteLeave(() => {
  // Logout уже показал собственный confirm с корректной формулировкой
  // ("Выйти без сохранения?") — не спрашивать второй раз тем же диалогом.
  if (isLoggingOut.value) return true
  if (phase.value !== 'ready' || !isDirty.value) return true
  return window.confirm('Есть несохранённые изменения. Вернуться к проектам?')
})

// Отменяет pending autosave/in-flight-save прежнего проекта и возвращает
// Building JSON к нейтральному состоянию — следующий заход в editor (тот же
// или другой проект) всегда стартует через свежий loadProject(), без "хвоста"
// чужой revision.
onBeforeUnmount(() => {
  cleanup()
})
</script>

<template>
  <main class="page">
    <div v-if="phase === 'loading'" class="page__status">
      <div class="page__spinner" aria-hidden="true" />
      <p class="text-secondary">
        Загрузка проекта…
      </p>
    </div>

    <div v-else-if="phase === 'not-found'" class="page__status">
      <UiIcon name="alert" :size="28" class="page__status-icon" />
      <p class="text-h3">
        Проект не найден
      </p>
      <NuxtLink to="/projects" class="btn btn-secondary">
        Вернуться к проектам
      </NuxtLink>
    </div>

    <div v-else-if="phase === 'error'" class="page__status">
      <UiIcon name="alert" :size="28" class="page__status-icon" />
      <p class="text-h3">
        Не удалось загрузить проект
      </p>
      <p v-if="error" class="text-secondary">
        {{ error.message }}
      </p>
      <NuxtLink to="/projects" class="btn btn-secondary">
        Вернуться к проектам
      </NuxtLink>
    </div>

    <template v-else>
      <BuilderEditorHeader />
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

.page__status-icon {
  color: var(--color-warning);
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
