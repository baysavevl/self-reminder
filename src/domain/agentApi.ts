export type AgentScope = 'read' | 'write'
export type ReminderType = 'personal' | 'birthday' | 'food'

export interface ReminderInput {
  title: string
  type: ReminderType
  starts_at: string
  notes?: string
  timezone?: string
  recurrence_kind?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurrence_interval?: number
}

export function parseBearerToken(header: string | undefined): string | null {
  const match = header?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export function hasScope(actual: AgentScope, required: AgentScope): boolean {
  return actual === 'write' || actual === required
}

export function validateReminderInput(input: unknown): { ok: true; value: ReminderInput } | { ok: false; message: string } {
  if (!input || typeof input !== 'object') return { ok: false, message: 'Request body must be an object' }
  const body = input as Record<string, unknown>
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const type = body.type
  const startsAt = body.starts_at
  if (!title || title.length > 200) return { ok: false, message: 'title must be 1-200 characters' }
  if (type !== 'personal' && type !== 'birthday' && type !== 'food') return { ok: false, message: 'type is invalid' }
  if (typeof startsAt !== 'string' || Number.isNaN(Date.parse(startsAt))) return { ok: false, message: 'starts_at must be ISO-8601' }
  const value: ReminderInput = { title, type, starts_at: new Date(startsAt).toISOString() }
  if (typeof body.notes === 'string') value.notes = body.notes
  if (typeof body.timezone === 'string') value.timezone = body.timezone
  if (body.recurrence_kind === undefined) value.recurrence_kind = 'none'
  else if (['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(String(body.recurrence_kind))) value.recurrence_kind = body.recurrence_kind as ReminderInput['recurrence_kind']
  else return { ok: false, message: 'recurrence_kind is invalid' }
  if (body.recurrence_interval !== undefined) {
    if (!Number.isInteger(body.recurrence_interval) || Number(body.recurrence_interval) < 1) return { ok: false, message: 'recurrence_interval must be a positive integer' }
    value.recurrence_interval = Number(body.recurrence_interval)
  }
  return { ok: true, value }
}

export function validateReminderPatch(input: unknown): { ok: true; value: Partial<ReminderInput> } | { ok: false; message: string } {
  if (!input || typeof input !== 'object') return { ok: false, message: 'Request body must be an object' }
  const body = input as Record<string, unknown>
  const value: Partial<ReminderInput> = {}
  if ('title' in body) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 200) return { ok: false, message: 'title must be 1-200 characters' }
    value.title = body.title.trim()
  }
  if ('type' in body) {
    if (body.type !== 'personal' && body.type !== 'birthday' && body.type !== 'food') return { ok: false, message: 'type is invalid' }
    value.type = body.type
  }
  if ('starts_at' in body) {
    if (typeof body.starts_at !== 'string' || Number.isNaN(Date.parse(body.starts_at))) return { ok: false, message: 'starts_at must be ISO-8601' }
    value.starts_at = new Date(body.starts_at).toISOString()
  }
  if ('notes' in body && typeof body.notes === 'string') value.notes = body.notes
  if ('timezone' in body && typeof body.timezone === 'string') value.timezone = body.timezone
  if ('recurrence_kind' in body) {
    if (!['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(String(body.recurrence_kind))) return { ok: false, message: 'recurrence_kind is invalid' }
    value.recurrence_kind = body.recurrence_kind as ReminderInput['recurrence_kind']
  }
  if ('recurrence_interval' in body) {
    if (!Number.isInteger(body.recurrence_interval) || Number(body.recurrence_interval) < 1) return { ok: false, message: 'recurrence_interval must be a positive integer' }
    value.recurrence_interval = Number(body.recurrence_interval)
  }
  return Object.keys(value).length ? { ok: true, value } : { ok: false, message: 'At least one field is required' }
}

export function apiError(code: string, message: string, requestId: string) {
  return { error: { code, message, requestId } }
}
