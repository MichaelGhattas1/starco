import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { concatMap, from, tap, toArray } from 'rxjs';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CartLine, CartStore, lineTotal, stayNights, UNPAID_KEY, UnpaidStay } from '../core/cart.store';
import { money, toApiDateTime } from '../core/media';
import { BookingResult } from '../core/models';

@Component({
  selector: 'app-cart-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.page.html',
})
export class CartPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly cart = inject(CartStore);
  readonly nights = stayNights;
  readonly lineTotal = lineTotal;
  readonly money = money;
  readonly working = signal(false);
  readonly error = signal<string | null>(null);
  readonly payNote = signal<string | null>(null);
  readonly held = signal<{ line: CartLine; booking: BookingResult }[]>([]);
  readonly form = inject(FormBuilder).nonNullable.group({
    customerName: ['', Validators.required],
    customerEmail: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{6,15}$/)]],
  });

  constructor() {
    inject(Title).setTitle('Cart · Plaza Inn');
    const email = this.auth.email() ?? '';
    this.form.patchValue({
      customerName: this.auth.name() ?? '',
      customerEmail: email,
    });
    if (email) {
      this.form.controls.customerEmail.disable();
    }
    this.quoteLines();
  }

  remove(line: CartLine): void {
    this.cart.remove(line.key);
  }

  payHeld(): void {
    this.payFirst(this.held());
  }

  checkout(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
      return;
    }
    if (!this.cart.lines().length) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Enter your name, email, and a phone number of 6 to 15 digits.');
      return;
    }
    const lines = this.cart.lines();
    const reserved: { line: CartLine; booking: BookingResult }[] = [];
    this.working.set(true);
    this.error.set(null);
    this.payNote.set(null);
    from(lines)
      .pipe(
        concatMap((line) =>
          this.api.createBooking(this.request(line)).pipe(
            tap((booking) => {
              reserved.push({ line, booking });
              this.cart.remove(line.key);
            }),
          ),
        ),
        toArray(),
      )
      .subscribe({
        next: () => this.payFirst(reserved),
        error: (error) => {
          this.working.set(false);
          this.error.set(errorMessage(error));
          this.held.set(reserved);
        },
      });
  }

  private quoteLines(): void {
    const guest = this.form.getRawValue();
    for (const line of this.cart.lines()) {
      this.api
        .calculatePrice({
          encodedHotelId: line.hotelId,
          encodedRoomId: line.roomId,
          checkIn: toApiDateTime(line.checkIn, 12),
          checkOut: toApiDateTime(line.checkOut, 12),
          customerName: guest.customerName || 'Guest',
          customerEmail: guest.customerEmail || 'guest@example.com',
        })
        .subscribe({
          next: (quote) => this.cart.setQuote(line.key, quote.totalPrice),
          error: () => undefined,
        });
    }
  }

  private request(line: CartLine) {
    const guest = this.form.getRawValue();
    return {
      encodedHotelId: line.hotelId,
      encodedRoomId: line.roomId,
      checkIn: toApiDateTime(line.checkIn, 12),
      checkOut: toApiDateTime(line.checkOut, 12),
      customerName: guest.customerName,
      customerEmail: guest.customerEmail,
    };
  }

  private payFirst(reserved: { line: CartLine; booking: BookingResult }[]): void {
    const payable = reserved.filter((item) => item.booking.encodedId);
    const [first, ...rest] = payable;
    if (!first?.booking.encodedId) {
      this.working.set(false);
      this.error.set('The reservation was created without a booking id.');
      return;
    }
    const guest = this.form.getRawValue();
    const followUps: UnpaidStay[] = rest.map((item) => ({
      encodedId: item.booking.encodedId ?? '',
      totalPrice: item.booking.totalPrice,
      label: `${item.line.hotelName} · ${item.line.roomName}`,
      name: guest.customerName,
      email: guest.customerEmail,
      phone: guest.phone,
    }));
    sessionStorage.setItem(UNPAID_KEY, JSON.stringify(followUps));
    this.pay(first.booking);
  }

  private pay(booking: BookingResult): void {
    const guest = this.form.getRawValue();
    const bookingId = booking.encodedId;
    if (!bookingId) {
      this.working.set(false);
      return;
    }
    this.api
      .createPayment({
        encodedBookingId: bookingId,
        amountCents: Math.round(Number(booking.totalPrice) * 100),
        currency: 'EGP',
        billingData: {
          name: guest.customerName,
          email: guest.customerEmail,
          phone: guest.phone,
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
          this.payNote.set('The reservation is saved. Paymob did not return a checkout link.');
          void this.router.navigate(['/payment/result'], { queryParams: { bookingId } });
        },
        error: (error) => {
          this.working.set(false);
          this.payNote.set(errorMessage(error));
        },
      });
  }
}

function paymentLink(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const value = payload.trim().replace(/^"|"$/g, '');
    return /^https?:\/\//i.test(value) ? value : null;
  }
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const record = payload as Record<string, unknown>;
  for (const key of ['url', 'paymentUrl', 'iframeUrl', 'redirectUrl', 'link', 'paymentLink']) {
    const value = record[key];
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      return value;
    }
  }
  if ('data' in record) {
    return paymentLink(record['data']);
  }
  return null;
}
