import { describe, expect, it } from 'vitest';
import { joinApiPath, normalizeServerBaseUrl, ServerUrlError } from '@/utils/url';

describe('normalizeServerBaseUrl', () => {
  it('strips trailing slash and keeps origin', () => {
    expect(normalizeServerBaseUrl('https://plainshare-one.vercel.app/')).toBe(
      'https://plainshare-one.vercel.app',
    );
  });

  it('rejects non-http protocols', () => {
    expect(() => normalizeServerBaseUrl('ftp://example.com')).toThrow(ServerUrlError);
  });

  it('rejects embedded credentials', () => {
    expect(() => normalizeServerBaseUrl('https://user:pass@example.com')).toThrow(
      ServerUrlError,
    );
    try {
      normalizeServerBaseUrl('https://user:pass@example.com');
    } catch (err) {
      expect(err).toBeInstanceOf(ServerUrlError);
      expect((err as ServerUrlError).code).toBe('CREDENTIALS');
    }
  });

  it('drops path by default (origin only)', () => {
    expect(normalizeServerBaseUrl('https://example.com/plainnote/')).toBe(
      'https://example.com',
    );
  });
});

describe('joinApiPath', () => {
  it('joins base and path', () => {
    expect(joinApiPath('https://example.com', '/api/notes')).toBe(
      'https://example.com/api/notes',
    );
  });
});
