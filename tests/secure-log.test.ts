import { describe, expect, it } from 'vitest';
import { redactSensitive } from '@/utils/secure-log';

describe('redactSensitive', () => {
  it('redacts secret and editUrl fields', () => {
    const out = redactSensitive({
      serverId: 'public-id',
      secret: 'super-secret',
      editUrl: 'https://example.com/edit/super-secret',
      nested: { token: 'abc' },
    });

    expect(out.serverId).toBe('public-id');
    expect(out.secret).toBe('[REDACTED]');
    expect(out.editUrl).toBe('[REDACTED]');
    expect(out.nested.token).toBe('[REDACTED]');
  });
});
