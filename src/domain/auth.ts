export function resolveLoginIdentifier(identifier: string): string {
  const value = identifier.trim()
  if (value.toLowerCase() === 'vinh') return 'luuvinh8698@gmail.com'
  return value
}
