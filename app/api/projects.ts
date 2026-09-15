// Типизированные методы для /api/v1/projects. Единственный слой, который
// знает про конкретные пути/HTTP-методы backend'а; composables выше вызывают
// только эти функции, а не apiFetch напрямую.
import type { BuildingDocument } from '~/types/building'
import { apiFetch } from './client'
import type { Project, ProjectDto, ProjectListItemDto, ProjectSummary } from './types'

function toProject(dto: ProjectDto): Project {
  return {
    id: dto.id,
    name: dto.name,
    status: dto.status,
    building: dto.building,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

function toProjectSummary(dto: ProjectListItemDto): ProjectSummary {
  return {
    id: dto.id,
    name: dto.name,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

export interface PersistProjectInput {
  name: string
  status: string
  building: BuildingDocument
}

export async function getProjects(options: { signal?: AbortSignal } = {}): Promise<ProjectSummary[]> {
  const items = await apiFetch<ProjectListItemDto[]>('/api/v1/projects', { signal: options.signal })
  return items.map(toProjectSummary)
}

export async function getProject(id: string, options: { signal?: AbortSignal } = {}): Promise<Project> {
  const dto = await apiFetch<ProjectDto>(`/api/v1/projects/${encodeURIComponent(id)}`, { signal: options.signal })
  return toProject(dto)
}

export async function createProject(input: PersistProjectInput): Promise<Project> {
  const dto = await apiFetch<ProjectDto>('/api/v1/projects', { method: 'POST', body: input })
  return toProject(dto)
}

export async function updateProject(id: string, input: PersistProjectInput): Promise<Project> {
  const dto = await apiFetch<ProjectDto>(`/api/v1/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: input })
  return toProject(dto)
}

export async function deleteProject(id: string, options: { signal?: AbortSignal } = {}): Promise<void> {
  await apiFetch<void>(`/api/v1/projects/${encodeURIComponent(id)}`, { method: 'DELETE', signal: options.signal })
}
