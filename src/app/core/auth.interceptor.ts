import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from './environment';
import { LocaleService } from './locale.service';
import { NoticeService } from './notice.service';
import { SessionStore } from './session.store';

const ACCOUNT_AUTH = /\/api\/Account\/(login|register|forgot-password|reset-password)(?:\?|$)/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const notice = inject(NoticeService);
  const locale = inject(LocaleService);
  const token = session.token();
  const authed =
    token && req.url.startsWith(environment.apiUrl)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authed).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        token &&
        req.url.startsWith(environment.apiUrl) &&
        !ACCOUNT_AUTH.test(req.url)
      ) {
        session.clear();
        notice.error(locale.t('session.expired'));
        const returnUrl = router.url.startsWith('/login') ? null : router.url;
        void router.navigate(['/login'], {
          queryParams: returnUrl ? { returnUrl } : {},
        });
      }
      return throwError(() => error);
    }),
  );
};
