import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin } from '../../src/server/supabaseAdmin'
import { hashAgentToken, newAgentToken } from '../../src/server/agentAuth'

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type Res = { status(code: number): Res; json(body: unknown): void }

export default async function handler(req: Req, res: Res) {
  const requestId = randomUUID()
  if (req.method !== 'POST') return res.status(405).json({ error: { code: 'method_not_allowed', message: 'Use POST', requestId } })
  const adminKey = process.env.SELF_REMINDER_ADMIN_KEY
  if (!adminKey || String(req.headers['x-admin-key'] ?? '') !== adminKey) return res.status(401).json({ error: { code: 'unauthorized', message: 'Admin key required', requestId } })
  const ownerId = process.env.SELF_REMINDER_OWNER_ID
  if (!ownerId) return res.status(500).json({ error: { code: 'configuration_error', message: 'Owner is not configured', requestId } })
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  const scope = body.scope === 'write' ? 'write' : 'read'
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 80) : 'agent'
  const token = newAgentToken()
  try {
    const { data, error } = await getSupabaseAdmin().from('agent_tokens').insert({ owner_id: ownerId, token_hash: await hashAgentToken(token), scope, label }).select('id,label,scope,created_at').single()
    if (error) throw error
    return res.status(201).json({ data: { ...data, token }, requestId })
  } catch (error) {
    console.error('agent token api error', error)
    return res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error', requestId } })
  }
}
