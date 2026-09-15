// Типизированные методы для /api/v1/auth/*. Единственный слой, который
// знает про конкретные пути этой части backend'а; useAuth() вызывает только
// эти функции, а не apiFetch напрямую.
import { apiFetch } from './client'
import type { AuthPurpose, AuthResponseDto, AuthSession, AuthUser, MeResponseDto } from './types'

function toAuthSession(dto: AuthResponseDto): AuthSession {
  return { accessToken: dto.access_token, tokenType: dto.token_type, expiresIn: dto.expires_in }
}

function toAuthUser(dto: MeResponseDto): AuthUser {
  return { id: dto.id, phone: dto.phone, createdAt: dto.created_at, updatedAt: dto.updated_at }
}

// Ни один из этих запросов не несёт Authorization — либо токена ещё нет
// (sms/send, verify), либо это и есть его выдача (refresh). Сам refresh
// token нигде здесь не фигурирует — он живёт только в HttpOnly cookie,
// которую браузер прикладывает сам ($fetch credentials:'include' в client.ts).
export async function sendSMS(phone: string, purpose: AuthPurpose): Promise<void> {
  await apiFetch<void>('/api/v1/auth/sms/send', { method: 'POST', auth: false, body: { phone, purpose } })
}

export async function registerVerify(phone: string, code: string): Promise<AuthSession> {
  const dto = await apiFetch<AuthResponseDto>('/api/v1/auth/register/verify', {
    method: 'POST',
    auth: false,
    body: { phone, code },
  })
  return toAuthSession(dto)
}

export async function loginVerify(phone: string, code: string): Promise<AuthSession> {
  const dto = await apiFetch<AuthResponseDto>('/api/v1/auth/login/verify', {
    method: 'POST',
    auth: false,
    body: { phone, code },
  })
  return toAuthSession(dto)
}

export async function refresh(): Promise<AuthSession> {
  const dto = await apiFetch<AuthResponseDto>('/api/v1/auth/refresh', { method: 'POST', auth: false })
  return toAuthSession(dto)
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/api/v1/auth/logout', { method: 'POST', auth: false })
}

// auth: true (по умолчанию) — единственный auth-эндпоинт, которому
// действительно нужен Authorization: Bearer <accessToken>.
export async function me(): Promise<AuthUser> {
  const dto = await apiFetch<MeResponseDto>('/api/v1/auth/me')
  return toAuthUser(dto)
}
