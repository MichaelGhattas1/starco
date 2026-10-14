import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ContactUs, WEEKDAYS } from '../core/models';

@Component({
  selector: 'app-contact-section',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-section.html',
})
export class ContactSection {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly page = input(false);
  readonly contact = signal<ContactUs | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly sent = signal<string | null>(null);
  readonly weekdays = WEEKDAYS;
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
    return this.weekdays[index] ?? 'Day';
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
      this.formError.set('Enter your name, a valid email, and a message of at least 10 characters.');
      return;
    }
    const desk = this.contact()?.email;
    if (!desk) {
      this.formError.set('The desk email is not published yet.');
      return;
    }
    const value = this.form.getRawValue();
    const body = [value.message, '', value.name, value.email, value.phone].filter((line) => line.trim()).join('\n');
    const href = `mailto:${desk}?subject=${encodeURIComponent(`Plaza Inn message from ${value.name}`)}&body=${encodeURIComponent(body)}`;
    this.formError.set(null);
    this.sent.set(`Your email app is opening with this message to ${desk}.`);
    window.location.href = href;
  }
}
