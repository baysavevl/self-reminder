import { describe, expect, it } from 'vitest'
import { nextOccurrence } from './recurrence'
import type { RecurrenceRule } from './types'

const zone = 'Asia/Ho_Chi_Minh'

function rule(overrides: Partial<RecurrenceRule>): RecurrenceRule {
  return {
    kind: 'none',
    interval: 1,
    weekdays: [],
    endsAt: null,
    timezone: zone,
    ...overrides,
  }
}

describe('nextOccurrence', () => {
  it('clamps a monthly recurrence to the last day of a shorter month', () => {
    expect(
      nextOccurrence(
        rule({ kind: 'monthly' }),
        new Date('2026-01-31T02:00:00.000Z'),
      ),
    ).toEqual(new Date('2026-02-28T02:00:00.000Z'))
  })

  it('uses February 28 for a leap-day yearly recurrence in a non-leap year', () => {
    expect(
      nextOccurrence(
        rule({ kind: 'yearly' }),
        new Date('2028-02-29T02:00:00.000Z'),
      ),
    ).toEqual(new Date('2029-02-28T02:00:00.000Z'))
  })

  it('selects the next configured weekday without skipping within the week', () => {
    expect(
      nextOccurrence(
        rule({ kind: 'weekly', weekdays: [1, 3] }),
        new Date('2026-09-07T02:00:00.000Z'),
      ),
    ).toEqual(new Date('2026-09-09T02:00:00.000Z'))
  })

  it('returns null when recurrence is disabled', () => {
    expect(
      nextOccurrence(rule({ kind: 'none' }), new Date('2026-09-09T02:00:00Z')),
    ).toBeNull()
  })

  it('returns null when the next occurrence exceeds the configured end', () => {
    expect(
      nextOccurrence(
        rule({ kind: 'daily', endsAt: '2026-09-09T02:00:00.000Z' }),
        new Date('2026-09-09T02:00:00.000Z'),
      ),
    ).toBeNull()
  })
})
