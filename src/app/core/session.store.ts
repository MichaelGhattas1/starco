import { Injectable, computed, signal } from '@angular/core';
import { ADMIN_ROLE } from './models';

const TOKEN_KEY = 'plaza_token';
const ROLE_KEY = 'plaza_role';
const EMAIL_KEY = 'plaza_email';
const NAME_KEY = 'plaza_name';
const USER_KEY = 'plaza_user_id';
const ADMIN_SESSION_KEY = 'plaza_admin_session';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly role = signal<number | null>(readRole());
  readonly email = signal<string | null>(localStorage.getItem(EMAIL_KEY));
  readonly name = signal<string | null>(localStorage.getItem(NAME_KEY));
  readonly userId = signal<string | null>(localStorage.getItem(USER_KEY));
  readonly adminSession = signal(localStorage.getItem(ADMIN_SESSION_KEY) === '1' || readRole() === ADMIN_ROLE);
  readonly isLoggedIn = computed(() => !!this.token());
  readonly canWrite = computed(() => this.adminSession() || this.role() === ADMIN_ROLE);

  save(token: string, role: number | null, email: string | null, name: string | null): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
    this.setRole(role);
    if (role === ADMIN_ROLE) {
      this.markAdminSession();
    } else {
      this.adminSession.set(false);
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
    if (email) {
      localStorage.setItem(EMAIL_KEY, email);
      this.email.set(email);
    }
    if (name) {
      localStorage.setItem(NAME_KEY, name);
      this.name.set(name);
    }
  }

  setRole(role: number | null): void {
    this.role.set(role);
    if (role == null) {
      localStorage.removeItem(ROLE_KEY);
      return;
    }
    localStorage.setItem(ROLE_KEY, String(role));
    if (role === ADMIN_ROLE) {
      this.markAdminSession();
    }
  }

  setUserId(id: string | null): void {
    this.userId.set(id);
    if (id) {
      localStorage.setItem(USER_KEY, id);
      return;
    }
    localStorage.removeItem(USER_KEY);
  }

  markAdminSession(): void {
    this.adminSession.set(true);
    localStorage.setItem(ADMIN_SESSION_KEY, '1');
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    this.token.set(null);
    this.role.set(null);
    this.email.set(null);
    this.name.set(null);
    this.userId.set(null);
    this.adminSession.set(false);
  }
}

function readRole(): number | null {
  const raw = localStorage.getItem(ROLE_KEY);
  if (!raw) {
    return null;
  }
  const role = Number(raw);
  return Number.isFinite(role) ? role : null;
}
