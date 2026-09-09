import { describe, expect, it } from 'vitest'
import { defaultOffsets } from './notifications'

describe('defaultOffsets', () => {
  it('gives birthdays alerts at 14, 7, 1, and 0 days', () => {
    expect(defaultOffsets('birthday')).toEqual([20160, 10080, 1440, 0])
  })

  it('gives food alerts at 7, 3, 1, and 0 days', () => {
    expect(defaultOffsets('food')).toEqual([10080, 4320, 1440, 0])
  })

  it('returns a defensive copy', () => {
    const offsets = defaultOffsets('birthday')
    offsets.pop()
    expect(defaultOffsets('birthday')).toHaveLength(4)
  })
})
