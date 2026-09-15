// Типы API-слоя (граница Nuxt <-> Go backend). Отдельно от app/types/building.ts:
// там — доменная модель здания, здесь — форма HTTP-контракта (DTO с snake_case,
// как отдаёт Go, плюс нормализованные camelCase-версии для остального фронтенда).

import type { BuildingDocument } from '~/types/building'

export interface ApiError {
  status: number
  code: string
  message: string
  details?: unknown
}

// Ровно то, что возвращает GET/POST/PUT /api/v1/projects/{id} — см.
// projectResponse в remont-back/internal/interfaces/http/dto.go.
export interface ProjectDto {
  id: string
  name: string
  status: string
  building: BuildingDocument
  created_at: string
  updated_at: string
}

// GET /api/v1/projects — метаданные без Building JSON (projectListItem).
export interface ProjectListItemDto {
  id: string
  name: string
  status: string
  created_at: string
  updated_at: string
}

export interface CreateProjectPayload {
  name: string
  status: string
  building: BuildingDocument
}

export interface UpdateProjectPayload {
  name: string
  status: string
  building: BuildingDocument
}

// Нормализованные формы для остального фронтенда (camelCase).
export interface Project {
  id: string
  name: string
  status: string
  building: BuildingDocument
  createdAt: string
  updatedAt: string
}

export interface ProjectSummary {
  id: string
  name: string
  status: string
  createdAt: string
  updatedAt: string
}

// ---- Auth ----
// Wire DTOs mirror remont-back/internal/interfaces/http/auth_dto.go exactly
// (snake_case). The refresh token itself never appears here — it only ever
// travels as an HttpOnly cookie, never JSON reachable from JavaScript.

export type AuthPurpose = 'register' | 'login'

export interface AuthResponseDto {
  access_token: string
  token_type: string
  expires_in: number
}

export interface MeResponseDto {
  id: string
  phone: string
  created_at: string
  updated_at: string
}

// Нормализованные формы для остального фронтенда (camelCase).
export interface AuthSession {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface AuthUser {
  id: string
  phone: string
  createdAt: string
  updatedAt: string
}
