const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])
const MAX_IMAGE_BYTES = 1024 * 1024

export function validateImageFiles(files: File[], existingCount = 0): File[] {
  if (existingCount + files.length > 5) {
    throw new Error('Tối đa 5 ảnh')
  }

  for (const file of files) {
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      throw new Error('Chỉ hỗ trợ JPEG, PNG hoặc WebP')
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('Mỗi ảnh phải nhỏ hơn hoặc bằng 1 MiB')
    }
  }

  return [...files]
}
