import { describe, expect, it } from 'vitest'
import { parseBearerToken, hasScope, validateReminderInput, validateReminderPatch, apiError } from './agentApi'

describe('agent API contract helpers', () => {
  it('parses a bearer token case-insensitively', () => {
    expect(parseBearerToken('Bearer abc')).toBe('abc')
    expect(parseBearerToken('Basic abc')).toBeNull()
    expect(parseBearerToken(undefined)).toBeNull()
  })

  it('enforces read/write scopes', () => {
    expect(hasScope('read', 'read')).toBe(true)
    expect(hasScope('read', 'write')).toBe(false)
    expect(hasScope('write', 'read')).toBe(true)
  })

  it('validates reminder payloads and bounded limits', () => {
    expect(validateReminderInput({ title: 'Ăn sáng', type: 'food', starts_at: '2026-10-18T07:00:00+07:00' })).toEqual({
      ok: true,
      value: { title: 'Ăn sáng', type: 'food', starts_at: '2026-10-18T00:00:00.000Z', recurrence_kind: 'none' },
    })
    expect(validateReminderInput({ title: '', type: 'other', starts_at: 'nope' }).ok).toBe(false)
  })

  it('creates stable public errors', () => {
    expect(apiError('unauthorized', 'No token', 'req-1')).toEqual({
      error: { code: 'unauthorized', message: 'No token', requestId: 'req-1' },
    })
  })

  it('accepts partial reminder patches without inventing fields', () => {
    expect(validateReminderPatch({ title: 'Đổi tên' })).toEqual({ ok: true, value: { title: 'Đổi tên' } })
    expect(validateReminderPatch({ recurrence_interval: 0 }).ok).toBe(false)
  })
})
