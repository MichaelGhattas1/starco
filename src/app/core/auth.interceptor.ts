import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from './environment';
import { SessionStore } from './session.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(SessionStore).token();
  if (!token || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
