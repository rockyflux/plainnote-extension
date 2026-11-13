import { describe, expect, it } from 'vitest';
import { originHostPermission } from '@/utils/host-permissions';

describe('originHostPermission', () => {
  it('builds origin/* patterns from base URLs', () => {
    expect(originHostPermission('https://plainshare-one.vercel.app')).toBe(
      'https://plainshare-one.vercel.app/*',
    );
    expect(originHostPermission('http://127.0.0.1:3123/')).toBe('http://127.0.0.1:3123/*');
  });
});
