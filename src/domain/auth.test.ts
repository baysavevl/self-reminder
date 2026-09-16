import { describe, expect, it } from 'vitest'
import { LOCAL_ACCOUNT, resolveLoginIdentifier, validateLocalCredentials } from './auth'

describe('login identifier', () => {
  it('maps the app username vinh to the owner email', () => {
    expect(resolveLoginIdentifier(' vinh ')).toBe('luuvinh8698@gmail.com')
  })
  it('keeps normal email login unchanged', () => {
    expect(resolveLoginIdentifier('luuvinh8698@gmail.com')).toBe('luuvinh8698@gmail.com')
  })
  it('validates the local personal account', () => {
    expect(validateLocalCredentials(LOCAL_ACCOUNT.username, LOCAL_ACCOUNT.password)).toBe(true)
    expect(validateLocalCredentials('wrong', LOCAL_ACCOUNT.password)).toBe(false)
  })
})
