import type { RecurrenceRule } from './types'
import { addDays, addMonths, addYears } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

function nextWeeklyDate(
  localCurrent: Date,
  weekdays: number[],
  interval: number,
): Date {
  const normalized = [...new Set(weekdays)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b)

  if (normalized.length === 0) {
    return addDays(localCurrent, 7 * interval)
  }

  const currentDay = localCurrent.getDay()
  const laterThisWeek = normalized.find((day) => day > currentDay)
  if (laterThisWeek !== undefined) {
    return addDays(localCurrent, laterThisWeek - currentDay)
  }

  return addDays(
    localCurrent,
    7 * interval - currentDay + normalized[0],
  )
}

export function nextOccurrence(
  rule: RecurrenceRule,
  currentOccurrence: Date,
): Date | null {
  if (rule.kind === 'none') return null

  const interval = Math.max(1, Math.trunc(rule.interval))
  const localCurrent = toZonedTime(currentOccurrence, rule.timezone)
  let localNext: Date

  switch (rule.kind) {
    case 'daily':
      localNext = addDays(localCurrent, interval)
      break
    case 'weekly':
      localNext = nextWeeklyDate(localCurrent, rule.weekdays, interval)
      break
    case 'monthly':
      localNext = addMonths(localCurrent, interval)
      break
    case 'yearly':
      localNext = addYears(localCurrent, interval)
      break
  }

  const next = fromZonedTime(localNext, rule.timezone)
  if (rule.endsAt && next.getTime() > new Date(rule.endsAt).getTime()) {
    return null
  }

  return next
}
