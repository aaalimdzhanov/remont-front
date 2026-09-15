<script setup lang="ts">
import type { ProjectSummary } from '~/api/types'

defineProps<{ project: ProjectSummary }>()
defineEmits<{ open: [], delete: [] }>()

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
}

function statusLabel(status: string): string {
  return statusLabels[status] ?? status
}
</script>

<template>
  <li class="project-card card">
    <button type="button" class="project-card__preview" @click="$emit('open')">
      <!-- Building JSON пока не производит реальный preview (см. PROJECT
           PREVIEW в задании) — нейтральная архитектурная штриховка вместо
           stock-фото, до появления preview, производного от плана. -->
      <svg viewBox="0 0 200 140" fill="none" class="project-card__sketch" aria-hidden="true">
        <rect x="20" y="20" width="160" height="100" stroke="var(--color-border-strong)" stroke-width="1.5" />
        <path d="M20 70h160M90 20v100M130 70v50M20 95h70" stroke="var(--color-border-strong)" stroke-width="1.5" />
      </svg>
    </button>

    <div class="project-card__body">
      <button type="button" class="project-card__name" @click="$emit('open')">
        {{ project.name }}
      </button>
      <p class="project-card__meta text-caption text-muted">
        {{ statusLabel(project.status) }} · обновлён {{ formatDate(project.updatedAt) }}
      </p>
    </div>

    <div class="project-card__actions">
      <button type="button" class="btn btn-secondary btn-sm project-card__open-btn" @click="$emit('open')">
        Открыть
      </button>
      <button type="button" class="btn btn-ghost btn-icon" aria-label="Удалить проект" @click="$emit('delete')">
        <UiIcon name="trash" :size="16" />
      </button>
    </div>
  </li>
</template>

<style scoped>
.project-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: box-shadow var(--transition-base), transform var(--transition-base);
}

.project-card:hover {
  box-shadow: 0 4px 16px rgba(37, 37, 37, 0.09);
}

.project-card__preview {
  display: block;
  width: 100%;
  aspect-ratio: 10 / 7;
  padding: 0;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
  cursor: pointer;
}

.project-card__sketch {
  width: 100%;
  height: 100%;
}

.project-card__body {
  padding: var(--space-4) var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
}

.project-card__name {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  font-size: var(--font-body-lg-size);
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.project-card__meta {
  margin: 0;
}

.project-card__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
}

.project-card__open-btn {
  flex: 1;
}
</style>
