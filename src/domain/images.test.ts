import { describe, expect, it } from 'vitest'
import { validateImageFiles } from './images'

function file(name: string, type = 'image/jpeg', size = 128): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('validateImageFiles', () => {
  it('accepts up to five supported images', () => {
    expect(validateImageFiles(Array.from({ length: 5 }, (_, i) => file(`${i}.jpg`))))
      .toHaveLength(5)
  })

  it('rejects a sixth image across existing and new images', () => {
    expect(() => validateImageFiles([file('a.jpg'), file('b.jpg')], 4)).toThrow(
      'Tối đa 5 ảnh',
    )
  })

  it('rejects unsupported media', () => {
    expect(() => validateImageFiles([file('note.gif', 'image/gif')])).toThrow(
      'Chỉ hỗ trợ JPEG, PNG hoặc WebP',
    )
  })

  it('rejects an image larger than one MiB', () => {
    expect(() => validateImageFiles([file('large.jpg', 'image/jpeg', 1024 * 1024 + 1)]))
      .toThrow('Mỗi ảnh phải nhỏ hơn hoặc bằng 1 MiB')
  })
})
