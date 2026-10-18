import { createHash, randomBytes } from 'node:crypto'
import type { AgentScope } from '../domain/agentApi'

export async function hashAgentToken(token: string): Promise<string> {
  return createHash('sha256').update(token).digest('hex')
}

export function newAgentToken(): string {
  return randomBytes(32).toString('base64url')
}

export function isScopeAllowed(actual: AgentScope, required: AgentScope): boolean {
  return actual === 'write' || actual === required
}
