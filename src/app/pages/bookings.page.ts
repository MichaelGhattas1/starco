import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { CurrencyService } from '../core/currency.service';
import { hotelBaseFromTotal, isHotelBooking } from '../core/hotel-charges';
import { fromApiDate, toApiDateTime } from '../core/media';
import { BookingResult, BookingStatus, BookingType, bookingStatusLabel, bookingTypeLabel } from '../core/models';
import { NoticeService } from '../core/notice.service';
import { HotelPrice } from '../shared/hotel-price';

@Component({
  selector: 'app-bookings-page',
  imports: [ReactiveFormsModule, RouterLink, HotelPrice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <p class="kicker">Account</p>
      <h1 class="font-display text-5xl">My bookings</h1>
    </div>
    <form class="panel mb-6 grid gap-3 p-4 md:grid-cols-4" [formGroup]="form" (ngSubmit)="load()">
      <label class="field">
        Type
        <select formControlName="bookingType">
          <option value="">Any</option>
          @for (option of types; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </label>
      <label class="field">
        Status
        <select formControlName="status">
          <option value="">Any</option>
          @for (option of statuses; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </label>
      <label class="field">From <input type="date" formControlName="from" /></label>
      <label class="field">To <input type="date" formControlName="to" /></label>
      <button class="btn btn-gold md:col-span-4" type="submit">Filter</button>
    </form>
    @if (loading()) {
      <p role="status">Loading bookings…</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else if (!items().length) {
      <p>No bookings match this filter.</p>
    } @else {
      <div class="grid gap-3">
        @for (item of items(); track item.encodedId) {
          <article class="panel flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
            <div>
              <p class="kicker">{{ typeLabel(item.bookingType) }} · {{ statusLabel(item.status) }}</p>
              <h2 class="font-display text-3xl">{{ item.customerName || 'Booking' }}</h2>
              @if (isHotel(item)) {
                <app-hotel-price class="mt-3 max-w-md" [base]="hotelBase(item)" [quote]="item.totalPrice" mode="charge" />
              } @else {
                <p class="text-sm text-gold-300">{{ money(item.totalPrice) }}</p>
              }
              <p class="mt-2 text-sm text-gold-200/80">
                {{ item.isPaid ? 'Paid' : 'Unpaid' }}
                @if (item.checkIn) {
                  · {{ fromApiDate(item.checkIn) }} – {{ fromApiDate(item.checkOut) }}
                }
                @if (item.serviceDate) {
                  · {{ fromApiDate(item.serviceDate) }}
                }
              </p>
            </div>
            @if (item.encodedId) {
              <div class="flex flex-wrap gap-2">
                <a class="btn btn-line" [routerLink]="['/bookings', item.encodedId]">View</a>
                <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="cancel(item)">Cancel</button>
              </div>
            }
          </article>
        }
      </div>
    }
  `,
})
export class BookingsPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  private readonly currency = inject(CurrencyService);
  readonly money = (value: number | null | undefined) => this.currency.charge(value);
  readonly fromApiDate = fromApiDate;
  readonly typeLabel = bookingTypeLabel;
  readonly statusLabel = bookingStatusLabel;
  readonly items = signal<BookingResult[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly types = [
    { value: BookingType.Hotel, label: 'Hotel' },
    { value: BookingType.Trip, label: 'Trip' },
    { value: BookingType.Transport, label: 'Transport' },
    { value: BookingType.Event, label: 'Event' },
    { value: BookingType.Package, label: 'Package' },
  ];
  readonly statuses = [
    { value: BookingStatus.Pending, label: 'Pending' },
    { value: BookingStatus.Confirmed, label: 'Confirmed' },
    { value: BookingStatus.Cancelled, label: 'Cancelled' },
  ];
  readonly form = inject(FormBuilder).nonNullable.group({
    bookingType: '',
    status: '',
    from: '',
    to: '',
  });

  readonly isHotel = isHotelBooking;

  hotelBase(booking: BookingResult): number {
    return hotelBaseFromTotal(booking.totalPrice);
  }

  constructor() {
    inject(Title).setTitle('My bookings · Plaza Inn');
    this.load();
  }

  load(): void {
    const value = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.api
      .myBookings({
        bookingType: value.bookingType === '' ? null : Number(value.bookingType),
        status: value.status === '' ? null : Number(value.status),
        from: value.from ? toApiDateTime(value.from, 0) : null,
        to: value.to ? toApiDateTime(value.to, 23) : null,
      })
      .subscribe({
        next: (items) => {
          this.items.set(Array.isArray(items) ? items : []);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }

  cancel(item: BookingResult): void {
    const id = item.encodedId;
    if (!id || !confirm('Cancel this booking?')) {
      return;
    }
    this.busy.set(true);
    this.api.cancelBooking(id).subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.success('Booking cancelled.');
        this.load();
      },
      error: (error) => {
        this.busy.set(false);
        this.notice.error(errorMessage(error));
      },
    });
  }
}
