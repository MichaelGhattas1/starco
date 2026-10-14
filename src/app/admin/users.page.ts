import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';
import { ADMIN_ROLE, ROLE_OPTIONS, Role, UserAccount } from '../core/models';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-users-page',
  imports: [ReactiveFormsModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.page.html',
})
export class UsersPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  private readonly auth = inject(AuthService);
  readonly roles = ROLE_OPTIONS;
  readonly users = signal<UserAccount[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    userName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: [Role.Member, Validators.required],
    password: [''],
    passwordConfirmed: [''],
  });

  constructor() {
    inject(Title).setTitle('Users · Admin');
    this.load();
  }

  roleLabel(role: number): string {
    return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? `Role ${role}`;
  }

  edit(user: UserAccount): void {
    this.editingId.set(user.id);
    this.form.patchValue({
      userName: user.userName ?? '',
      email: user.email ?? '',
      role: user.role,
      password: '',
      passwordConfirmed: '',
    });
    this.form.controls.email.disable();
  }

  reset(): void {
    this.editingId.set(null);
    this.form.controls.email.enable();
    this.form.reset({ userName: '', email: '', role: Role.Member, password: '', passwordConfirmed: '' });
  }

  save(): void {
    const editing = this.editingId();
    const value = this.form.getRawValue();
    if (!value.userName || (!editing && this.form.invalid)) {
      this.form.markAllAsTouched();
      return;
    }
    if (value.password && value.password !== value.passwordConfirmed) {
      this.error.set('Passwords do not match.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const role = roleNumber(value.role);
    if (editing && this.isSignedInUser(editing, value.email) && role !== ADMIN_ROLE) {
      this.saving.set(false);
      this.error.set('This is the account you are signed in with. Change another user so this session stays on the desk.');
      return;
    }
    const body: { userName: string; role: number; password?: string; passwordConfirmed?: string } = {
      userName: value.userName,
      role,
    };
    if (value.password) {
      body.password = value.password;
      body.passwordConfirmed = value.passwordConfirmed;
    }
    const request = editing ? this.api.updateUser(editing, body) : this.api.createUser({
      userName: value.userName,
      email: value.email,
      role,
      password: value.password,
      passwordConfirmed: value.passwordConfirmed,
    });
    request.subscribe({
      next: () => {
        this.saving.set(false);
        if (this.auth.canWrite()) {
          this.auth.keepAdminDesk();
        }
        if (editing) {
          this.users.update((users) =>
            users.map((user) => (user.id === editing ? { ...user, userName: value.userName, role } : user)),
          );
        }
        this.notice.success('User saved. Your sign-in stays active.');
        this.reset();
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }

  private isSignedInUser(id: string, email: string): boolean {
    const currentId = this.auth.userId();
    if (currentId && currentId === id) {
      return true;
    }
    const current = this.auth.email()?.toLowerCase() || this.auth.name()?.toLowerCase();
    const accountEmail = email.toLowerCase();
    const accountName = this.form.getRawValue().userName.toLowerCase();
    return !!current && (current === accountEmail || current === accountName);
  }

  remove(user: UserAccount): void {
    if (!user.id || !confirm(`Delete ${user.userName ?? 'this user'}?`)) {
      return;
    }
    this.api.deleteUser(user.id).subscribe({
      next: () => {
        this.notice.success('User deleted.');
        this.load();
      },
      error: (error) => this.notice.error(errorMessage(error)),
    });
  }

  private load(): void {
    this.api.users().subscribe({
      next: (users) => {
        this.users.set(users);
        this.rememberSignedInUser(users);
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  private rememberSignedInUser(users: UserAccount[]): void {
    if (this.auth.userId()) {
      return;
    }
    const email = this.auth.email()?.toLowerCase();
    const name = this.auth.name()?.toLowerCase();
    const match =
      users.find((user) => !!email && user.email?.toLowerCase() === email) ??
      users.find((user) => !!email && user.userName?.toLowerCase() === email) ??
      users.find((user) => !!name && user.userName?.toLowerCase() === name);
    if (match?.id) {
      this.auth.rememberUserId(match.id);
    }
  }
}

function roleNumber(value: number | string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const label = ROLE_OPTIONS.find((item) => item.label.toLowerCase() === String(value).toLowerCase());
  if (label) {
    return label.value;
  }
  const role = Number(value);
  return Number.isFinite(role) ? role : Role.Member;
}
