import { HttpErrorResponse } from '@angular/common/http';
import { I18N, I18nKey } from './i18n';

function t(key: I18nKey, vars?: Record<string, string | number>): string {
  const lang = typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar' : 'en';
  let text: string = I18N[key][lang];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    if (typeof body === 'string' && body.trim()) {
      try {
        return errorMessage(JSON.parse(body));
      } catch {
        return body;
      }
    }
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      if (typeof record['message'] === 'string' && record['message']) {
        return record['message'];
      }
      if (typeof record['error'] === 'string' && record['error']) {
        return record['error'];
      }
      if (record['errors'] && typeof record['errors'] === 'object') {
        const messages = Object.values(record['errors'] as Record<string, unknown>)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .filter((value): value is string => typeof value === 'string');
        if (messages.length) {
          return messages.join(' ');
        }
      }
      if (typeof record['title'] === 'string' && record['title']) {
        return record['title'];
      }
    }
    if (error.status === 401) {
      return t('session.expired');
    }
    if (error.status === 403) {
      return t('session.forbidden');
    }
    return error.status ? t('session.failed', { status: error.status }) : t('session.network');
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return t('session.wrong');
}
