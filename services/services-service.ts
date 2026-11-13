import type {
  ServiceConnectionResult,
  ServiceInput,
  ServiceRecord,
} from '@/types';
import { ensureDatabaseSeeded } from '@/repositories/db';
import { servicesRepository } from '@/repositories/services-repository';
import { settingsRepository } from '@/repositories/settings-repository';
import { notesRepository } from '@/repositories/notes-repository';
import { joinApiPath, isHttpsUrl, normalizeServerBaseUrl, ServerUrlError } from '@/utils/url';
import { SERVICE_HEALTH_SECRET } from '@/utils/constants';
import { ensureHostPermission } from '@/utils/host-permissions';
import { secureWarn } from '@/utils/secure-log';

function mapUrlError(err: unknown): string {
  if (err instanceof ServerUrlError) return err.code;
  return 'INVALID_URL';
}

export const servicesService = {
  async list(): Promise<ServiceRecord[]> {
    await ensureDatabaseSeeded();
    return servicesRepository.list();
  },

  async get(id: string): Promise<ServiceRecord | undefined> {
    await ensureDatabaseSeeded();
    return servicesRepository.get(id);
  },

  async getDefault(): Promise<ServiceRecord> {
    await ensureDatabaseSeeded();
    const record = await servicesRepository.getDefault();
    if (!record) throw new Error('NO_DEFAULT_SERVICE');
    return record;
  },

  normalizeBaseUrl(input: string): string {
    return normalizeServerBaseUrl(input);
  },

  async create(input: ServiceInput & { makeDefault?: boolean }): Promise<ServiceRecord> {
    await ensureDatabaseSeeded();
    const baseUrl = normalizeServerBaseUrl(input.baseUrl);
    const granted = await ensureHostPermission(baseUrl);
    if (!granted) throw new Error('HOST_PERMISSION_DENIED');
    const name = input.name.trim() || baseUrl;
    const created = await servicesRepository.create({
      name,
      baseUrl,
      makeDefault: input.makeDefault,
    });
    if (input.makeDefault) {
      const settings = await settingsRepository.getAll();
      await settingsRepository.save({ ...settings, defaultServiceId: created.id });
    }
    return created;
  },

  async update(id: string, input: Partial<ServiceInput>): Promise<ServiceRecord> {
    await ensureDatabaseSeeded();
    const patch: { name?: string; baseUrl?: string } = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.baseUrl !== undefined) {
      patch.baseUrl = normalizeServerBaseUrl(input.baseUrl);
      const granted = await ensureHostPermission(patch.baseUrl);
      if (!granted) throw new Error('HOST_PERMISSION_DENIED');
    }
    return servicesRepository.update(id, patch);
  },

  async remove(id: string): Promise<void> {
    await ensureDatabaseSeeded();
    await servicesRepository.remove(id);
    const settings = await settingsRepository.getAll();
    if (settings.defaultServiceId === id) {
      const fallback = await servicesRepository.getDefault();
      if (fallback) {
        await settingsRepository.save({
          ...settings,
          defaultServiceId: fallback.id,
        });
      }
    }
  },

  async setDefault(id: string): Promise<ServiceRecord> {
    await ensureDatabaseSeeded();
    await servicesRepository.setDefault(id);
    const settings = await settingsRepository.getAll();
    await settingsRepository.save({ ...settings, defaultServiceId: id });
    return (await servicesRepository.get(id))!;
  },

  async noteCount(id: string): Promise<number> {
    return notesRepository.countByService(id);
  },

  /**
   * Probe PlainNote JSON API without creating data.
   * Expects NOTE_NOT_FOUND (or any JSON error envelope) from by-secret probe.
   */
  async testConnection(baseUrlOrId: string): Promise<ServiceConnectionResult> {
    await ensureDatabaseSeeded();

    let baseUrl = baseUrlOrId;
    let serviceId: string | null = null;

    const existing = await servicesRepository.get(baseUrlOrId);
    if (existing) {
      baseUrl = existing.baseUrl;
      serviceId = existing.id;
    } else {
      try {
        baseUrl = normalizeServerBaseUrl(baseUrlOrId);
      } catch (err) {
        return {
          ok: false,
          status: 'error',
          checkedAt: Date.now(),
          message: mapUrlError(err),
          latencyMs: null,
          preferHttpsHint: false,
        };
      }
    }

    const preferHttpsHint = !isHttpsUrl(baseUrl);
    const checkedAt = Date.now();
    const startedAt = performance.now();

    const granted = await ensureHostPermission(baseUrl);
    if (!granted) {
      const denied: ServiceConnectionResult = {
        ok: false,
        status: 'error',
        checkedAt,
        message: 'HOST_PERMISSION_DENIED',
        latencyMs: null,
        preferHttpsHint,
      };
      if (serviceId) {
        await servicesRepository.updateConnectionStatus(serviceId, 'error', denied.message, null);
      }
      return denied;
    }

    const probeUrl = joinApiPath(
      baseUrl,
      `/api/notes/by-secret/${encodeURIComponent(SERVICE_HEALTH_SECRET)}`,
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(probeUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));

      const contentType = res.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');
      let code: string | undefined;
      if (isJson) {
        try {
          const body = (await res.json()) as { error?: { code?: string } };
          code = body.error?.code;
        } catch {
          // ignore parse
        }
      }

      // Healthy PlainNote: missing secret → 404 NOTE_NOT_FOUND (JSON).
      const ok =
        (res.status === 404 && code === 'NOTE_NOT_FOUND') ||
        (res.status === 404 && isJson) ||
        (res.ok && isJson);

      const result: ServiceConnectionResult = {
        ok,
        status: ok ? 'ok' : 'error',
        checkedAt,
        message: ok ? 'OK' : `HTTP_${res.status}`,
        latencyMs,
        preferHttpsHint,
      };

      if (serviceId) {
        await servicesRepository.updateConnectionStatus(
          serviceId,
          result.status,
          ok ? null : result.message,
          latencyMs,
        );
      }
      return result;
    } catch (err) {
      const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
      secureWarn('[PlainNote] service connection failed', {
        serviceId,
        // never log full URL with credentials — normalize already stripped them
      });
      const aborted =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError');
      const result: ServiceConnectionResult = {
        ok: false,
        status: 'error',
        checkedAt,
        message: aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        latencyMs,
        preferHttpsHint,
      };
      if (serviceId) {
        await servicesRepository.updateConnectionStatus(
          serviceId,
          'error',
          result.message,
          latencyMs,
        );
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  },
};
