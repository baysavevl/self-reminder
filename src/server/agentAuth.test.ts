import { describe, expect, it } from 'vitest'
import { hashAgentToken, isScopeAllowed, newAgentToken } from './agentAuth'

describe('agent token auth', () => {
  it('hashes tokens deterministically without returning plaintext', async () => {
    expect(await hashAgentToken('abc')).toBe(await hashAgentToken('abc'))
    expect(await hashAgentToken('abc')).not.toBe('abc')
  })

  it('allows write tokens to read and write, read tokens only to read', () => {
    expect(isScopeAllowed('write', 'read')).toBe(true)
    expect(isScopeAllowed('write', 'write')).toBe(true)
    expect(isScopeAllowed('read', 'read')).toBe(true)
    expect(isScopeAllowed('read', 'write')).toBe(false)
  })

  it('creates sufficiently long random tokens', () => {
    const token = newAgentToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/)
  })
})
