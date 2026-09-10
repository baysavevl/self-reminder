export type ReminderType = 'personal' | 'birthday' | 'food'

export type RecurrenceKind = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurrenceRule {
  kind: RecurrenceKind
  interval: number
  weekdays: number[]
  endsAt: string | null
  timezone: string
}

export type ReminderStatus = 'active' | 'completed' | 'cancelled'

export interface Reminder {
  id: string
  ownerId: string
  type: ReminderType
  title: string
  notes: string
  startsAt: string
  timezone: string
  status: ReminderStatus
  recurrence: RecurrenceRule
  notificationOffsets: number[]
  scheduleVersion: number
  source: 'web' | 'telegram'
}

export type ReminderInput = Omit<
  Reminder,
  'id' | 'ownerId' | 'status' | 'scheduleVersion'
>
