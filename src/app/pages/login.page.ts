import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { safeReturnUrl } from '../core/auth.guard';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly returnUrl = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    inject(Title).setTitle('Sign in · Plaza Inn');
    this.returnUrl.set(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
  }

  accountQuery(): Record<string, string> {
    const url = this.returnUrl();
    return url ? { returnUrl: url } : {};
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const next = this.returnUrl() || (this.auth.canWrite() ? '/admin' : '/hotels');
        void this.router.navigateByUrl(next);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.saving.set(false);
      },
    });
  }
}
