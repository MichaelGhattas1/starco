import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { LocaleService } from '../core/locale.service';
import { ContactUs } from '../core/models';

@Component({
  selector: 'app-contact-section',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-section.html',
})
export class ContactSection {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  readonly page = input(false);
  readonly contact = signal<ContactUs | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly sent = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  constructor() {
    this.form.patchValue({
      name: this.auth.name() ?? '',
      email: this.auth.email() ?? '',
    });
    this.api.contact().subscribe({
      next: (contact) => {
        this.contact.set(contact);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  hours(value: string | null | undefined): string {
    return (value ?? '').slice(0, 5);
  }

  day(index: number): string {
    const keys = ['day.0', 'day.1', 'day.2', 'day.3', 'day.4', 'day.5', 'day.6'] as const;
    const key = keys[index];
    return key ? this.locale.t(key) : this.locale.t('day.unknown');
  }

  link(label: string, value: string): string {
    const digits = value.replace(/\D/g, '');
    if (label === 'WhatsApp' && digits.length >= 8 && !value.includes('.')) {
      return `https://wa.me/${digits}`;
    }
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  socials(info: ContactUs): { label: string; href: string }[] {
    const entries: [string, string | null][] = [
      ['Instagram', info.instagram],
      ['Facebook', info.facebook],
      ['WhatsApp', info.whatsApp],
      ['LinkedIn', info.linkedIn],
    ];
    return entries.flatMap(([label, value]) => (value ? [{ label, href: this.link(label, value) }] : []));
  }

  send(): void {
    this.sent.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set(this.locale.t('contact.invalid'));
      return;
    }
    const desk = this.contact()?.email;
    if (!desk) {
      this.formError.set(this.locale.t('contact.noDesk'));
      return;
    }
    const value = this.form.getRawValue();
    const body = [value.message, '', value.name, value.email, value.phone].filter((line) => line.trim()).join('\n');
    const href = `mailto:${desk}?subject=${encodeURIComponent(`Plaza Inn message from ${value.name}`)}&body=${encodeURIComponent(body)}`;
    this.formError.set(null);
    this.sent.set(this.locale.t('contact.sent', { email: desk }));
    window.location.href = href;
  }
}
