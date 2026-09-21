// Типизированные методы для /api/v1/projects/{id}/works — ProjectWork CRUD +
// recalculate (см. remont-back internal/interfaces/http/project_work_handler.go).
// quantity в CreateProjectWorkPayload игнорируется backend'ом для WorkType с
// quantity_mode='automatic' (используется только для 'manual') — фронтенд
// никогда не передаёт его как source of truth, только отображает то, что
// вернул backend в ответе.
import { apiFetch } from './client'
import type { CreateProjectWorkPayload, ProjectWork, ProjectWorkDto, WorkStatus } from './types'

function toProjectWork(dto: ProjectWorkDto): ProjectWork {
  return {
    id: dto.id,
    projectId: dto.project_id,
    roomId: dto.room_id,
    workTypeId: dto.work_type_id,
    status: dto.status,
    quantity: dto.quantity,
    unit: dto.unit,
    quantityMode: dto.quantity_mode,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export async function listProjectWorks(projectId: string, options: { signal?: AbortSignal } = {}): Promise<ProjectWork[]> {
  const items = await apiFetch<ProjectWorkDto[]>(`/api/v1/projects/${encodeURIComponent(projectId)}/works`, { signal: options.signal })
  return items.map(toProjectWork)
}

export async function createProjectWork(projectId: string, payload: CreateProjectWorkPayload): Promise<ProjectWork> {
  const dto = await apiFetch<ProjectWorkDto>(`/api/v1/projects/${encodeURIComponent(projectId)}/works`, {
    method: 'POST',
    body: payload,
  })
  return toProjectWork(dto)
}

export async function updateProjectWorkStatus(projectId: string, workId: string, status: WorkStatus): Promise<ProjectWork> {
  const dto = await apiFetch<ProjectWorkDto>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/works/${encodeURIComponent(workId)}/status`,
    { method: 'PATCH', body: { status } },
  )
  return toProjectWork(dto)
}

export async function deleteProjectWork(projectId: string, workId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/projects/${encodeURIComponent(projectId)}/works/${encodeURIComponent(workId)}`, { method: 'DELETE' })
}

// Backend возвращает только количество пересчитанных работ, не сам список
// (см. project_work_handler.go) — актуальные quantity нужно забирать
// последующим listProjectWorks().
export async function recalculateProjectWorks(projectId: string): Promise<{ updated: number }> {
  return await apiFetch<{ updated: number }>(`/api/v1/projects/${encodeURIComponent(projectId)}/works/recalculate`, { method: 'POST' })
}
