import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export function safeReturnUrl(url: string | null): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.includes('\\')) {
    return null;
  }
  return url;
}
