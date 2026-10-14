import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ADMIN_ROLE, LoginResult, UserAccount } from './models';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionStore);

  readonly token = this.session.token;
  readonly role = this.session.role;
  readonly email = this.session.email;
  readonly name = this.session.name;
  readonly userId = this.session.userId;
  readonly isLoggedIn = this.session.isLoggedIn;
  readonly canWrite = this.session.canWrite;

  login(email: string, password: string): Observable<LoginResult> {
    return this.api.login(email, password).pipe(
      switchMap((result) => {
        if (!result.token) {
          throw new Error(result.message || 'Invalid user or password');
        }
        const token = result.token;
        const claims = decodeJwt(token);
        const claimRole = readClaimRole(claims);
        const claimEmail = readClaim(claims, ['email', 'unique_name']) ?? email;
        const claimName = readClaim(claims, ['name', 'unique_name', 'given_name']);
        this.session.save(token, claimRole, claimEmail, claimName);
        return this.api.users().pipe(
          catchError(() => of([] as UserAccount[])),
          tap((users) => {
            const match = users.find(
              (user) => user.email?.toLowerCase() === claimEmail.toLowerCase(),
            );
            if (match) {
              this.session.setUserId(match.id);
              const role = match.role === ADMIN_ROLE || claimRole === ADMIN_ROLE ? ADMIN_ROLE : match.role;
              this.session.save(token, role, match.email, match.userName);
            }
          }),
          map(() => result),
        );
      }),
    );
  }

  logout(): void {
    this.session.clear();
  }

  keepAdminDesk(): void {
    if (this.session.adminSession() && this.session.role() !== ADMIN_ROLE) {
      this.session.setRole(ADMIN_ROLE);
    }
  }

  rememberUserId(id: string): void {
    if (!this.session.userId()) {
      this.session.setUserId(id);
    }
  }
}

function decodeJwt(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) {
    return {};
  }
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readClaim(claims: Record<string, unknown>, keys: string[]): string | null {
  for (const key of Object.keys(claims)) {
    if (keys.some((item) => key === item || key.endsWith(`/${item}`))) {
      const value = claims[key];
      if (typeof value === 'string' && value) {
        return value;
      }
    }
  }
  return null;
}

function readClaimRole(claims: Record<string, unknown>): number | null {
  const raw = readClaim(claims, ['role']);
  if (!raw) {
    return null;
  }
  if (/admin/i.test(raw)) {
    return 1;
  }
  const role = Number(raw);
  return Number.isFinite(role) ? role : null;
}
