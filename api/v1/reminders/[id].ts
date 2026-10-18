import { randomUUID } from 'node:crypto'
import { hasScope, parseBearerToken, validateReminderPatch } from '../../../src/domain/agentApi'
import { hashAgentToken } from '../../../src/server/agentAuth'
import { getSupabaseAdmin } from '../../../src/server/supabaseAdmin'

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[]>; body?: unknown }
type Res = { status(code: number): Res; json(body: unknown): void; end(): void; setHeader(name: string, value: string): void }

export default async function handler(req: Req, res: Res) {
  const requestId = randomUUID()
  const id = String(req.query?.id ?? '')
  try {
    const token = parseBearerToken(String(req.headers.authorization ?? ''))
    if (!token) return res.status(401).json({ error: { code: 'unauthorized', message: 'Bearer token required', requestId } })
    const db = getSupabaseAdmin()
    const { data: auth, error: authError } = await db.from('agent_tokens').select('owner_id,scope').eq('token_hash', await hashAgentToken(token)).is('revoked_at', null).maybeSingle()
    if (authError || !auth) return res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid agent token', requestId } })
    const required = req.method === 'GET' ? 'read' : 'write'
    if (!hasScope(auth.scope, required)) return res.status(403).json({ error: { code: 'forbidden', message: 'Token lacks write scope', requestId } })
    if (req.method === 'GET') {
      const { data, error } = await db.from('reminders').select('*').eq('id', id).eq('owner_id', auth.owner_id).maybeSingle()
      if (error) throw error
      if (!data) return res.status(404).json({ error: { code: 'not_found', message: 'Reminder not found', requestId } })
      return res.status(200).json({ data, requestId })
    }
    if (req.method === 'PATCH') {
      const input = validateReminderPatch(req.body)
      if (!input.ok) return res.status(400).json({ error: { code: 'bad_request', message: input.message, requestId } })
      const { data, error } = await db.from('reminders').update(input.value).eq('id', id).eq('owner_id', auth.owner_id).select().maybeSingle()
      if (error) throw error
      if (!data) return res.status(404).json({ error: { code: 'not_found', message: 'Reminder not found', requestId } })
      return res.status(200).json({ data, requestId })
    }
    if (req.method === 'DELETE') {
      const { data, error } = await db.from('reminders').update({ status: 'cancelled' }).eq('id', id).eq('owner_id', auth.owner_id).select('id').maybeSingle()
      if (error) throw error
      if (!data) return res.status(404).json({ error: { code: 'not_found', message: 'Reminder not found', requestId } })
      return res.status(204).end()
    }
    res.setHeader('Allow', 'GET, PATCH, DELETE')
    return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Use GET, PATCH or DELETE', requestId } })
  } catch (error) {
    console.error('agent reminder api error', error)
    return res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error', requestId } })
  }
}
