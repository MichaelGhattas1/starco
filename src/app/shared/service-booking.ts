import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PAYMENT_CURRENCY, CurrencyService } from '../core/currency.service';
import { paymentLink, toApiDateTime } from '../core/media';
import { LocaleService } from '../core/locale.service';
import { BookingRequest, BookingType } from '../core/models';

@Component({
  selector: 'app-service-booking',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="panel grid gap-4 p-5" [formGroup]="form" (ngSubmit)="submit()">
      <div>
        <p class="kicker">{{ locale.t('reserve.title') }}</p>
        <h2 class="font-display text-4xl leading-none">{{ title() }}</h2>
        @if (price() != null) {
          <p class="mt-2 text-gold-300">{{ currency.display(price()) }}</p>
          @if (currency.applied() !== currency.payment) {
            <p class="mt-1 text-sm text-gold-200/70">{{ locale.t('reserve.paymobCharge', { amount: currency.charge(price()) }) }}</p>
          }
        }
      </div>
      <label class="field">
        {{ locale.t('field.name') }}
        <input formControlName="customerName" autocomplete="name" />
      </label>
      <label class="field">
        {{ locale.t('field.email') }}
        <input type="email" formControlName="customerEmail" autocomplete="email" />
      </label>
      <label class="field">
        {{ locale.t('field.phone') }}
        <input formControlName="phone" inputmode="numeric" autocomplete="tel" />
      </label>
      <label class="field">
        {{ locale.t('field.date') }}
        <input type="date" formControlName="serviceDate" />
      </label>
      <label class="field">
        {{ locale.t('field.quantity') }}
        <input type="number" min="1" max="1000" formControlName="quantity" />
      </label>
      @if (needsParty()) {
        <label class="field">
          {{ locale.t('field.adults') }}
          <input type="number" min="1" max="50" formControlName="adults" />
        </label>
        <label class="field">
          {{ locale.t('field.children') }}
          <input type="number" min="0" max="50" formControlName="children" />
        </label>
      }
      @if (error()) {
        <p class="text-sm text-red-200" role="alert">{{ error() }}</p>
      }
      @if (note()) {
        <p class="text-sm text-gold-200" role="status">{{ note() }}</p>
      }
      <button class="btn btn-gold" type="submit" [disabled]="working()">
        {{ working() ? locale.t('action.saving') : locale.t('action.reservePay') }}
      </button>
      <a routerLink="/bookings" class="text-sm text-gold-300">{{ locale.t('book.viewMine') }}</a>
    </form>
  `,
})
export class ServiceBooking {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly currency = inject(CurrencyService);
  readonly locale = inject(LocaleService);

  readonly kind = input.required<BookingType>();
  readonly itemId = input.required<string>();
  readonly title = input.required<string>();
  readonly price = input<number | null>(null);
  readonly needsParty = input(false);

  readonly working = signal(false);
  readonly error = signal<string | null>(null);
  readonly note = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    customerEmail: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{6,15}$/)]],
    serviceDate: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(1000)]],
    adults: [1, [Validators.min(1), Validators.max(50)]],
    children: [0, [Validators.min(0), Validators.max(50)]],
  });

  constructor() {
    const email = this.auth.email() ?? '';
    this.form.patchValue({
      customerName: this.auth.name() ?? '',
      customerEmail: email,
    });
    if (email) {
      this.form.controls.customerEmail.disable();
    }
  }

  submit(): void {
    this.error.set(null);
    this.note.set(null);
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.form.invalid || !this.itemId()) {
      this.form.markAllAsTouched();
      this.error.set('Enter your name, email, phone, a date, and a quantity.');
      return;
    }
    const value = this.form.getRawValue();
    const body: BookingRequest = {
      bookingType: this.kind(),
      serviceDate: toApiDateTime(value.serviceDate, 12),
      quantity: Number(value.quantity),
      customerName: value.customerName,
      customerEmail: value.customerEmail,
      customerPhone: value.phone,
    };
    if (this.needsParty()) {
      body.adults = Number(value.adults);
      body.children = Number(value.children);
    }
    const id = this.itemId();
    if (this.kind() === BookingType.Trip) {
      body.encodedTripId = id;
    } else if (this.kind() === BookingType.Transport) {
      body.encodedTransportId = id;
    } else if (this.kind() === BookingType.Event) {
      body.encodedEventId = id;
    } else if (this.kind() === BookingType.Package) {
      body.encodedPackageId = id;
    }
    this.working.set(true);
    this.api.createBooking(body).subscribe({
      next: (booking) => {
        const bookingId = booking.encodedId;
        if (!bookingId) {
          this.working.set(false);
          this.error.set('The reservation was created without a booking id.');
          return;
        }
        this.api
          .createPayment({
            encodedBookingId: bookingId,
            amountCents: Math.round(Number(booking.totalPrice) * 100),
            currency: PAYMENT_CURRENCY,
            billingData: {
              name: value.customerName,
              email: value.customerEmail,
              phone: value.phone,
            },
            items: [],
          })
          .subscribe({
            next: (payload) => {
              const url = paymentLink(payload);
              if (url) {
                window.location.href = url;
                return;
              }
              this.working.set(false);
              this.note.set('The reservation is saved. Paymob did not return a checkout link.');
              void this.router.navigate(['/payment/result'], { queryParams: { bookingId } });
            },
            error: (error) => {
              this.working.set(false);
              this.note.set(errorMessage(error));
              void this.router.navigate(['/bookings']);
            },
          });
      },
      error: (error) => {
        this.working.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }
}
