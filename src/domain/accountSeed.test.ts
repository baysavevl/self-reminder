import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('default account seed', () => {
  it('contains the vinh account as a password hash, never plaintext', () => {
    const seed = readFileSync(resolve(process.cwd(), 'turso/seed.sql'), 'utf8');
    expect(seed).toContain("'vinh'");
    expect(seed).toContain("'scrypt:");
    expect(seed).not.toContain('123434565678');
  });
});
