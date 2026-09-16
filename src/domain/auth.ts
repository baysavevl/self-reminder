export function resolveLoginIdentifier(identifier: string): string {
  const value = identifier.trim()
  if (value.toLowerCase() === 'vinh') return 'luuvinh8698@gmail.com'
  return value
}

export const LOCAL_ACCOUNT = {
  username: 'vinh',
  password: 'Vinh@icolen',
  userId: 'local-vinh',
} as const

export function validateLocalCredentials(identifier: string, password: string): boolean {
  return identifier.trim().toLowerCase() === LOCAL_ACCOUNT.username && password === LOCAL_ACCOUNT.password
}
