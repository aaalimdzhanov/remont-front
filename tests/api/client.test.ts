import { describe, expect, it } from 'vitest'
import { isApiError, toApiError } from '~/api/client'

describe('toApiError', () => {
  it('maps a backend error envelope (HTTP error with a known shape)', () => {
    const err = {
      response: {
        status: 404,
        _data: { error: { code: 'project_not_found', message: 'Project not found' } },
      },
    }
    expect(toApiError(err)).toEqual({
      status: 404,
      code: 'project_not_found',
      message: 'Project not found',
      details: err.response._data,
    })
  })

  it('falls back to a generic human message for a malformed/empty response body', () => {
    const err = { response: { status: 500, _data: undefined } }
    const result = toApiError(err)
    expect(result.status).toBe(500)
    expect(result.code).toBe('http_error')
    expect(result.message).not.toMatch(/object Object/)
  })

  it('maps any 401 to a friendly "session expired" message, overriding the raw backend text', () => {
    const err = { response: { status: 401, _data: { error: { code: 'unauthorized', message: 'Invalid or expired access token' } } } }
    const result = toApiError(err)
    expect(result.status).toBe(401)
    expect(result.code).toBe('session_expired')
    expect(result.message).toBe('Сессия истекла. Войдите заново.')
  })

  it.each([
    ['invalid_verification_code', 'Неверный код.'],
    ['verification_expired', 'Срок действия кода истёк.'],
    ['verification_attempts_exceeded', 'Превышено количество попыток.'],
    ['sms_cooldown_active', 'Слишком частый запрос. Попробуйте позже.'],
    ['user_already_exists', 'Пользователь с таким номером уже существует.'],
    ['user_not_found', 'Пользователь не найден.'],
    ['invalid_phone', 'Некорректный номер телефона.'],
    ['verification_not_found', 'Код не найден. Запросите новый код.'],
  ])('maps auth error code %s to a human RU message, overriding the raw backend text', (code, expected) => {
    const err = { response: { status: 400, _data: { error: { code, message: 'some raw backend text' } } } }
    const result = toApiError(err)
    expect(result.code).toBe(code)
    expect(result.message).toBe(expected)
  })

  it('leaves unmapped backend codes (e.g. project errors) untouched', () => {
    const err = { response: { status: 400, _data: { error: { code: 'invalid_building', message: 'building.rooms[0].id: is required' } } } }
    const result = toApiError(err)
    expect(result.code).toBe('invalid_building')
    expect(result.message).toBe('building.rooms[0].id: is required')
  })

  it('classifies a 400 without an error envelope with a readable message', () => {
    const result = toApiError({ response: { status: 400, _data: { unexpected: true } } })
    expect(result.status).toBe(400)
    expect(result.message).toBe('Некорректные данные запроса.')
  })

  it('classifies a request that never reached the server as a network error', () => {
    const result = toApiError(new TypeError('Failed to fetch'))
    expect(result.status).toBe(0)
    expect(result.code).toBe('network_error')
    // Человеческое сообщение, а не голый "TypeError: Failed to fetch".
    expect(result.message).toMatch(/backend/i)
  })
})

describe('isApiError', () => {
  it('recognizes a well-formed ApiError', () => {
    expect(isApiError({ status: 404, code: 'project_not_found', message: 'Project not found' })).toBe(true)
  })

  it('rejects arbitrary errors/values', () => {
    expect(isApiError(new Error('boom'))).toBe(false)
    expect(isApiError(null)).toBe(false)
    expect(isApiError('oops')).toBe(false)
  })
})
