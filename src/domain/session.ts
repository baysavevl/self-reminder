export interface SlidingSessionState {
  expiresAt: string
  persistedAt: string
}

export interface SlidingSessionTouch extends SlidingSessionState {
  shouldPersist: boolean
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
const PERSIST_INTERVAL_MS = 60 * 60 * 1000
const LOCAL_SESSION_MS = 7 * 24 * 60 * 60 * 1000

export interface LocalSession {
  userId: string
  expiresAt: string
}

export function createLocalSession(userId: string, now: Date): LocalSession {
  return { userId, expiresAt: new Date(now.getTime() + LOCAL_SESSION_MS).toISOString() }
}

export function isLocalSessionExpired(now: Date, session: LocalSession): boolean {
  return now.getTime() >= new Date(session.expiresAt).getTime()
}

export function touchSlidingSession(
  now: Date,
  previous: SlidingSessionState | null,
): SlidingSessionTouch {
  const shouldPersist =
    previous === null ||
    now.getTime() - new Date(previous.persistedAt).getTime() >=
      PERSIST_INTERVAL_MS

  return {
    expiresAt: new Date(now.getTime() + THREE_DAYS_MS).toISOString(),
    persistedAt: shouldPersist ? now.toISOString() : previous.persistedAt,
    shouldPersist,
  }
}

export function isSlidingSessionExpired(now: Date, expiresAt: string): boolean {
  return now.getTime() >= new Date(expiresAt).getTime()
}
