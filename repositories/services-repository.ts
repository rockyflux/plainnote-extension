import type { ServiceConnectionStatus, ServiceRecord } from '@/types';
import { db } from '@/repositories/db';
import { DEFAULT_SERVICE_ID } from '@/utils/constants';

function newServiceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `svc_${crypto.randomUUID()}`;
  }
  return `svc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const servicesRepository = {
  normalize(row: ServiceRecord): ServiceRecord {
    return {
      ...row,
      lastLatencyMs: typeof row.lastLatencyMs === 'number' ? row.lastLatencyMs : null,
    };
  },

  async list(): Promise<ServiceRecord[]> {
    const rows = await db.services.toArray();
    return rows
      .map((row) => this.normalize(row))
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  },

  async get(id: string): Promise<ServiceRecord | undefined> {
    const row = await db.services.get(id);
    return row ? this.normalize(row) : undefined;
  },

  async getDefault(): Promise<ServiceRecord | undefined> {
    const marked = await db.services.filter((s) => s.isDefault).first();
    if (marked) return marked;
    return db.services.get(DEFAULT_SERVICE_ID);
  },

  async create(input: {
    name: string;
    baseUrl: string;
    makeDefault?: boolean;
  }): Promise<ServiceRecord> {
    const now = Date.now();
    const id = newServiceId();

    await db.transaction('rw', db.services, async () => {
      if (input.makeDefault) {
        await db.services.toCollection().modify({ isDefault: false });
      }
      await db.services.add({
        id,
        name: input.name.trim(),
        baseUrl: input.baseUrl,
        isDefault: Boolean(input.makeDefault),
        createdAt: now,
        updatedAt: now,
        lastCheckedAt: null,
        lastStatus: 'unknown',
        lastError: null,
        lastLatencyMs: null,
      });
    });

    return (await db.services.get(id))!;
  },

  async update(
    id: string,
    patch: Partial<Pick<ServiceRecord, 'name' | 'baseUrl'>>,
  ): Promise<ServiceRecord> {
    const existing = await db.services.get(id);
    if (!existing) throw new Error('SERVICE_NOT_FOUND');

    const nextBaseUrl = patch.baseUrl !== undefined ? patch.baseUrl : existing.baseUrl;
    const urlChanged = patch.baseUrl !== undefined && patch.baseUrl !== existing.baseUrl;

    await db.services.update(id, {
      name: patch.name !== undefined ? patch.name.trim() : existing.name,
      baseUrl: nextBaseUrl,
      updatedAt: Date.now(),
      // Changing the origin invalidates any previous probe result.
      ...(urlChanged
        ? {
            lastStatus: 'unknown' as const,
            lastError: null,
            lastLatencyMs: null,
            lastCheckedAt: null,
          }
        : {}),
    });

    return (await db.services.get(id))!;
  },

  /**
   * Delete a service configuration.
   * Throws if notes still reference it — callers must keep the service or move notes first.
   */
  async remove(id: string): Promise<void> {
    if (id === DEFAULT_SERVICE_ID) {
      throw new Error('CANNOT_DELETE_OFFICIAL_SERVICE');
    }
    const noteCount = await db.notes.where('serviceId').equals(id).count();
    if (noteCount > 0) {
      throw new Error('SERVICE_IN_USE');
    }

    await db.transaction('rw', db.services, async () => {
      const target = await db.services.get(id);
      if (!target) return;
      await db.services.delete(id);
      if (target.isDefault) {
        const fallback =
          (await db.services.get(DEFAULT_SERVICE_ID)) ||
          (await db.services.toCollection().first());
        if (fallback) {
          await db.services.toCollection().modify({ isDefault: false });
          await db.services.update(fallback.id, { isDefault: true, updatedAt: Date.now() });
        }
      }
    });
  },

  async setDefault(id: string): Promise<void> {
    const target = await db.services.get(id);
    if (!target) throw new Error('SERVICE_NOT_FOUND');

    await db.transaction('rw', db.services, async () => {
      await db.services.toCollection().modify({ isDefault: false });
      await db.services.update(id, { isDefault: true, updatedAt: Date.now() });
    });
  },

  async updateConnectionStatus(
    id: string,
    status: ServiceConnectionStatus,
    error: string | null,
    latencyMs: number | null = null,
  ): Promise<void> {
    await db.services.update(id, {
      lastStatus: status,
      lastError: error,
      lastLatencyMs: latencyMs,
      lastCheckedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
};
