import { HttpErrorResponse } from '@angular/common/http';

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
    return error.status ? `Request failed (${error.status})` : 'Network error';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong';
}
