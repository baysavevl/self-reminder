import { describe, expect, it } from 'vitest'
import { isSlidingSessionExpired, touchSlidingSession, createLocalSession, isLocalSessionExpired } from './session'

describe('sliding session activity', () => {
  it('extends a new session by exactly three days', () => {
    const result = touchSlidingSession(new Date('2026-09-09T10:00:00.000Z'), null)
    expect(result).toEqual({
      expiresAt: '2026-09-12T10:00:00.000Z',
      persistedAt: '2026-09-09T10:00:00.000Z',
      shouldPersist: true,
    })
  })

  it('does not persist another renewal within one hour', () => {
    const result = touchSlidingSession(new Date('2026-09-09T10:30:00.000Z'), {
      expiresAt: '2026-09-12T10:00:00.000Z',
      persistedAt: '2026-09-09T10:00:00.000Z',
    })
    expect(result.shouldPersist).toBe(false)
    expect(result.expiresAt).toBe('2026-09-12T10:30:00.000Z')
  })

  it('treats the exact expiry instant as expired', () => {
    expect(
      isSlidingSessionExpired(
        new Date('2026-09-12T10:00:00.000Z'),
        '2026-09-12T10:00:00.000Z',
      ),
    ).toBe(true)
  })

  it('creates a local device session that expires after seven days', () => {
    const session = createLocalSession('user-1', new Date('2026-09-13T10:00:00.000Z'))
    expect(session).toEqual({ userId: 'user-1', expiresAt: '2026-09-20T10:00:00.000Z' })
    expect(isLocalSessionExpired(new Date('2026-09-20T09:59:59.000Z'), session)).toBe(false)
    expect(isLocalSessionExpired(new Date('2026-09-20T10:00:00.000Z'), session)).toBe(true)
  })
})
