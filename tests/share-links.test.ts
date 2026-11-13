import { describe, expect, it } from 'vitest';
import {
  assertShareRecordUrlSafe,
  isEditUrl,
  isPublicShareUrl,
  maskEditUrl,
} from '@/utils/share-links';

describe('share-links', () => {
  it('detects edit vs public urls', () => {
    expect(isEditUrl('https://plainshare-one.vercel.app/edit/abc_SECRET-1')).toBe(true);
    expect(isPublicShareUrl('https://plainshare-one.vercel.app/note/abc123')).toBe(true);
    expect(isPublicShareUrl('https://plainshare-one.vercel.app/raw/abc123')).toBe(true);
    expect(isEditUrl('https://plainshare-one.vercel.app/note/abc123')).toBe(false);
  });

  it('masks secret in edit url display', () => {
    const masked = maskEditUrl('https://example.com/edit/superSecretValue');
    expect(masked).toContain('/edit/');
    expect(masked).not.toContain('superSecretValue');
    expect(masked).toContain('•');
  });

  it('blocks edit urls in share records', () => {
    expect(() =>
      assertShareRecordUrlSafe(
        'copy-note-url',
        'https://example.com/edit/SECRET',
      ),
    ).toThrow('SHARE_RECORD_MUST_NOT_STORE_EDIT_URL');

    expect(() => assertShareRecordUrlSafe('copy-edit-url', null)).not.toThrow();
    expect(() => assertShareRecordUrlSafe('copy-edit-url', 'https://x/edit/s')).toThrow();
    expect(() =>
      assertShareRecordUrlSafe('copy-raw-url', 'https://example.com/raw/id'),
    ).not.toThrow();
  });
});
