import { randomUUID } from 'node:crypto'
import { hasScope, parseBearerToken } from '../../../../src/domain/agentApi'
import { hashAgentToken } from '../../../../src/server/agentAuth'
import { getSupabaseAdmin } from '../../../../src/server/supabaseAdmin'

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[]> }
type Res = { status(code: number): Res; json(body: unknown): void }

export default async function handler(req: Req, res: Res) {
  const requestId = randomUUID()
  const id = String(req.query?.id ?? '')
  try {
    const token = parseBearerToken(String(req.headers.authorization ?? ''))
    if (!token) return res.status(401).json({ error: { code: 'unauthorized', message: 'Bearer token required', requestId } })
    const db = getSupabaseAdmin()
    const { data: auth } = await db.from('agent_tokens').select('owner_id,scope').eq('token_hash', await hashAgentToken(token)).is('revoked_at', null).maybeSingle()
    if (!auth) return res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid agent token', requestId } })
    if (!hasScope(auth.scope, 'write')) return res.status(403).json({ error: { code: 'forbidden', message: 'Token lacks write scope', requestId } })
    const { data, error } = await db.from('reminders').update({ status: 'completed' }).eq('id', id).eq('owner_id', auth.owner_id).select().maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ error: { code: 'not_found', message: 'Reminder not found', requestId } })
    return res.status(200).json({ data, requestId })
  } catch (error) {
    console.error('agent complete api error', error)
    return res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error', requestId } })
  }
}
