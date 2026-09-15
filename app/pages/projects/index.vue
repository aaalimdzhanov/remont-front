<script setup lang="ts">
// Управление проектами (список/создание/удаление) — отдельно от editor'а.
// Ни 2D Builder, ни Three.js Viewer сюда не подключаются: эта страница
// только вызывает useProjectPersistence(), никаких прямых HTTP-запросов.
definePageMeta({ middleware: 'auth', layout: 'app' })
useHead({ title: 'Мои проекты — REMONT' })

const { projects, isLoadingProjects, error, refreshProjects, removeProject } = useProjectPersistence()

onMounted(() => {
  void refreshProjects()
})

function handleNew() {
  navigateTo('/projects/new')
}

function handleOpen(id: string) {
  navigateTo(`/projects/${id}`)
}

const pendingDelete = ref<{ id: string, name: string } | null>(null)

function handleDelete(id: string, name: string) {
  pendingDelete.value = { id, name }
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  await removeProject(pendingDelete.value.id)
  pendingDelete.value = null
}
</script>

<template>
  <main class="page">
    <div class="page__header">
      <div>
        <h1 class="text-h1">
          Мои проекты
        </h1>
        <p class="text-secondary page__subtitle">
          Создавайте, редактируйте и управляйте своими проектами.
        </p>
      </div>
      <button type="button" class="btn btn-primary" @click="handleNew">
        <UiIcon name="plus" :size="16" />
        Новый проект
      </button>
    </div>

    <div v-if="isLoadingProjects" class="page__grid" aria-busy="true" aria-label="Загрузка проектов">
      <div v-for="n in 3" :key="n" class="skeleton-card">
        <div class="skeleton-card__preview" />
        <div class="skeleton-card__line skeleton-card__line--wide" />
        <div class="skeleton-card__line skeleton-card__line--narrow" />
      </div>
    </div>

    <div v-else-if="error" class="page__state card">
      <UiIcon name="alert" :size="28" class="page__state-icon" />
      <p class="text-h3">
        Не удалось загрузить проекты.
      </p>
      <p class="text-secondary">
        Проверьте подключение к серверу и попробуйте ещё раз.
      </p>
      <button type="button" class="btn btn-secondary" @click="refreshProjects">
        Повторить
      </button>
    </div>

    <div v-else-if="projects.length === 0" class="page__state page__state--empty">
      <svg class="page__empty-sketch" viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="112" height="82" rx="2" stroke="var(--color-border-strong)" stroke-width="1.5" />
        <path d="M4 34h112M46 34v52M4 60h42M78 4v82M78 22h38" stroke="var(--color-border-strong)" stroke-width="1.5" />
        <path d="M20 20l6-8 6 8" stroke="var(--color-border-strong)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <p class="text-h3">
        У вас пока нет проектов
      </p>
      <p class="text-secondary">
        Создайте первый проект и начните планировать своё пространство.
      </p>
      <button type="button" class="btn btn-primary" @click="handleNew">
        <UiIcon name="plus" :size="16" />
        Создать проект
      </button>
    </div>

    <ProjectsProjectList
      v-else
      :projects="projects"
      @open="handleOpen"
      @delete="handleDelete"
    />

    <UiConfirmDialog
      :open="pendingDelete !== null"
      title="Удалить проект?"
      :message="`Проект «${pendingDelete?.name}» будет удалён безвозвратно.`"
      confirm-text="Удалить"
      danger
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />
  </main>
</template>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-6) var(--space-16);
}

.page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-8);
}

.page__subtitle {
  margin-top: var(--space-1);
}

.page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-5);
}

.skeleton-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-card__preview {
  height: 140px;
  border-radius: var(--radius-input);
  background: var(--color-surface-subtle);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

.skeleton-card__line {
  height: 12px;
  border-radius: 4px;
  background: var(--color-surface-subtle);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

.skeleton-card__line--wide { width: 70%; }
.skeleton-card__line--narrow { width: 40%; }

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.page__state {
  padding: var(--space-16) var(--space-6);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.page__state-icon {
  color: var(--color-warning);
  margin-bottom: var(--space-2);
}

.page__state--empty {
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-card-lg);
  background: var(--color-surface-subtle);
}

.page__empty-sketch {
  width: 140px;
  height: auto;
  margin-bottom: var(--space-4);
}

.page__state .btn {
  margin-top: var(--space-3);
}
</style>
