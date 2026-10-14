import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { safeReturnUrl } from '../core/auth.guard';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.page.html',
})
export class RegisterPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notice = inject(NoticeService);
  readonly returnUrl = safeReturnUrl(inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl'));
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    userName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
    passwordConfirm: ['', Validators.required],
  });

  constructor() {
    inject(Title).setTitle('Register · Plaza Inn');
  }

  accountQuery(): Record<string, string> {
    return this.returnUrl ? { returnUrl: this.returnUrl } : {};
  }

  submit(): void {
    const value = this.form.getRawValue();
    if (this.form.invalid || value.password !== value.passwordConfirm) {
      this.form.markAllAsTouched();
      this.error.set(value.password !== value.passwordConfirm ? 'Passwords do not match.' : null);
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.register(value).subscribe({
      next: () => {
        this.notice.success('Account created. Sign in to continue.');
        void this.router.navigate(['/login'], {
          queryParams: this.returnUrl ? { returnUrl: this.returnUrl } : {},
        });
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.saving.set(false);
      },
    });
  }
}
