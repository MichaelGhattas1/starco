import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-forgot-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel mx-auto grid max-w-md gap-4 p-6">
      <p class="kicker">Account</p>
      <h1 class="font-display text-5xl">Forgot password</h1>
      <form class="grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
        <label class="grid gap-1 text-sm">Email<input class="field" type="email" formControlName="email" /></label>
        @if (message()) { <p role="status">{{ message() }}</p> }
        @if (error()) { <p class="text-red-200" role="alert">{{ error() }}</p> }
        <button class="btn btn-gold" type="submit" [disabled]="saving()">Send reset link</button>
      </form>
      <a routerLink="/login" class="text-sm underline">Back to sign in</a>
    </section>
  `,
})
export class ForgotPage {
  private readonly api = inject(ApiService);
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
        this.message.set('If this email is registered, a reset message is on the way.');
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }
}
