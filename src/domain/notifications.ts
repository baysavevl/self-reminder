import type { ReminderType } from './types'

const OFFSETS: Record<ReminderType, readonly number[]> = {
  personal: [1440, 60, 0],
  birthday: [20160, 10080, 1440, 0],
  food: [10080, 4320, 1440, 0],
}

export function defaultOffsets(type: ReminderType): number[] {
  return [...OFFSETS[type]]
}
