import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { concatMap, from, tap, toArray } from 'rxjs';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CartLine, CartStore, lineBase, lineTotal, stayNights, UNPAID_KEY, UnpaidStay } from '../core/cart.store';
import { PAYMENT_CURRENCY, CurrencyService } from '../core/currency.service';
import { paymentLink, toApiDateTime } from '../core/media';
import { BookingResult, BookingType } from '../core/models';
import { HotelPrice } from '../shared/hotel-price';

@Component({
  selector: 'app-cart-page',
  imports: [ReactiveFormsModule, RouterLink, HotelPrice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.page.html',
})
export class CartPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly cart = inject(CartStore);
  readonly currency = inject(CurrencyService);
  readonly nights = stayNights;
  readonly lineBase = lineBase;
  readonly lineTotal = lineTotal;
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

  checkoutBase(): number {
    return this.cart.lines().reduce((sum, line) => sum + lineBase(line), 0);
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
    for (const line of this.cart.lines()) {
      this.api
        .calculatePrice({
          encodedHotelId: line.hotelId,
          encodedRoomId: line.roomId,
          checkIn: toApiDateTime(line.checkIn, 12),
          checkOut: toApiDateTime(line.checkOut, 12),
          adults: line.adults,
          children: 0,
          roomsCount: 1,
          extraBed: false,
        })
        .subscribe({
          next: (quote) => {
            const total = Number(quote?.totalPrice);
            if (Number.isFinite(total)) {
              this.cart.setQuote(line.key, total);
            }
          },
          error: () => undefined,
        });
    }
  }

  private request(line: CartLine) {
    const guest = this.form.getRawValue();
    return {
      bookingType: BookingType.Hotel,
      encodedHotelId: line.hotelId,
      encodedRoomId: line.roomId,
      checkIn: toApiDateTime(line.checkIn, 12),
      checkOut: toApiDateTime(line.checkOut, 12),
      adults: line.adults,
      children: 0,
      roomsCount: 1,
      extraBed: false,
      customerName: guest.customerName,
      customerEmail: guest.customerEmail,
      customerPhone: guest.phone,
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
        currency: PAYMENT_CURRENCY,
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

