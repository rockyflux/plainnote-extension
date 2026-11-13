import { PlainNoteApiError } from '@/types';

/** Map API / domain errors to vue-i18n message keys under `errors.*`. */
export function apiErrorI18nKey(err: unknown): string {
  if (err instanceof PlainNoteApiError) {
    switch (err.code) {
      case 'NETWORK_ERROR':
        return 'errors.network';
      case 'TIMEOUT':
        return 'errors.timeout';
      case 'NOTE_NOT_FOUND':
        return 'errors.notFound';
      case 'VALIDATION_FAILED':
        return 'errors.validation';
      case 'RATE_LIMITED':
        return 'errors.rateLimited';
      case 'INTERNAL_ERROR':
        return 'errors.server';
      default:
        if (err.status === 404) return 'errors.notFound';
        if (err.status === 422) return 'errors.validation';
        if (err.status === 429) return 'errors.rateLimited';
        return 'errors.unknown';
    }
  }
  if (err instanceof Error) {
    switch (err.message) {
      case 'SERVICE_NOT_FOUND':
        return 'errors.serviceNotFound';
      case 'SERVICE_MISMATCH':
        return 'errors.serviceMismatch';
      case 'HOST_PERMISSION_DENIED':
        return 'errors.hostPermissionDenied';
      case 'NOTE_NOT_LOCAL':
      case 'NOTE_NOT_FOUND':
        return 'errors.notFound';
      case 'CONTENT_TOO_LONG':
        return 'errors.contentTooLong';
      case 'CONTENT_REQUIRED':
        return 'popup.contentRequired';
      case 'TITLE_TOO_LONG':
        return 'errors.validation';
      case 'INVALID_FORMAT':
        return 'errors.validation';
      case 'NO_SELECTION':
        return 'errors.noSelection';
      case 'NO_PAGE':
        return 'errors.noPage';
      default:
        break;
    }
  }
  return 'errors.unknown';
}
