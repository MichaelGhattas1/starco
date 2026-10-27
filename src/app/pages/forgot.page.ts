import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-forgot-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel mx-auto grid max-w-md gap-4 p-6">
      <p class="kicker">{{ locale.t('auth.account') }}</p>
      <h1 class="font-display text-5xl">{{ locale.t('auth.forgot') }}</h1>
      <form class="grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
        <label class="grid gap-1 text-sm">{{ locale.t('field.email') }}<input class="field" type="email" formControlName="email" /></label>
        @if (message()) { <p role="status">{{ message() }}</p> }
        @if (error()) { <p class="text-red-200" role="alert">{{ error() }}</p> }
        <button class="btn btn-gold" type="submit" [disabled]="saving()">{{ locale.t('action.sendReset') }}</button>
      </form>
      <a routerLink="/login" class="text-sm underline">{{ locale.t('action.backSignIn') }}</a>
    </section>
  `,
})
export class ForgotPage {
  private readonly api = inject(ApiService);
  readonly locale = inject(LocaleService);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    inject(Title).setTitle('Forgot password · Plaza Inn');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.forgotPassword(this.form.controls.email.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(this.locale.t('auth.forgotSent'));
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }
}
