import { randomUUID } from 'node:crypto'
import { hasScope, parseBearerToken, validateReminderInput } from '../../src/domain/agentApi'
import { hashAgentToken } from '../../src/server/agentAuth'
import { getSupabaseAdmin } from '../../src/server/supabaseAdmin'

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[]>; body?: unknown }
type Res = { status(code: number): Res; json(body: unknown): void; end(): void; setHeader(name: string, value: string): void }

async function auth(req: Req, required: 'read' | 'write') {
  const token = parseBearerToken(String(req.headers.authorization ?? ''))
  if (!token) return { error: { status: 401, code: 'unauthorized', message: 'Bearer token required' } }
  const db = getSupabaseAdmin()
  const { data, error } = await db.from('agent_tokens').select('owner_id,scope').eq('token_hash', await hashAgentToken(token)).is('revoked_at', null).maybeSingle()
  if (error || !data) return { error: { status: 401, code: 'unauthorized', message: 'Invalid agent token' } }
  if (!hasScope(data.scope, required)) return { error: { status: 403, code: 'forbidden', message: 'Token lacks write scope' } }
  return { db, ownerId: data.owner_id as string }
}

export default async function handler(req: Req, res: Res) {
  const requestId = randomUUID()
  const required = req.method === 'GET' ? 'read' : 'write'
  try {
    const result = await auth(req, required)
    if ('error' in result && result.error) return res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message, requestId } })
    if (req.method === 'GET') {
      const query = req.query ?? {}
      const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 100)
      let request = result.db.from('reminders').select('id,title,type,notes,starts_at,timezone,status,recurrence_kind,recurrence_interval,next_occurrence_at,created_at,updated_at').eq('owner_id', result.ownerId).order('next_occurrence_at', { ascending: true }).limit(limit)
      if (query.type) request = request.eq('type', query.type)
      if (query.from) request = request.gte('next_occurrence_at', query.from)
      if (query.to) request = request.lte('next_occurrence_at', query.to)
      const { data, error } = await request
      if (error) throw error
      return res.status(200).json({ data: data ?? [], requestId })
    }
    if (req.method === 'POST') {
      const input = validateReminderInput(req.body)
      if (!input.ok) return res.status(400).json({ error: { code: 'bad_request', message: input.message, requestId } })
      const { data, error } = await result.db.from('reminders').insert({ ...input.value, owner_id: result.ownerId, next_occurrence_at: input.value.starts_at, source: 'web' }).select().single()
      if (error) throw error
      return res.status(201).json({ data, requestId })
    }
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Use GET or POST', requestId } })
  } catch (error) {
    console.error('agent reminders api error', error)
    return res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error', requestId } })
  }
}
