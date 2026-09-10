import { describe, expect, it } from 'vitest'
import { isSlidingSessionExpired, touchSlidingSession } from './session'

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
})
