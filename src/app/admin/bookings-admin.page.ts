import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { CurrencyService } from '../core/currency.service';
import { hotelBaseFromTotal, isHotelBooking } from '../core/hotel-charges';
import { fromApiDateTime, toApiDateTime } from '../core/media';
import { BookingResult, BookingStatus, BookingType, HotelLookup, bookingStatusLabel, bookingTypeLabel, pairedName } from '../core/models';
import { I18nKey } from '../core/i18n';
import { LocaleService } from '../core/locale.service';
import { NoticeService } from '../core/notice.service';
import { HotelPrice } from '../shared/hotel-price';

@Component({
  selector: 'app-bookings-admin-page',
  imports: [ReactiveFormsModule, RouterLink, HotelPrice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5">
      <p class="kicker">{{ locale.t('admin.desk') }}</p>
      <h1 class="font-display text-5xl">{{ locale.t('nav.bookings') }}</h1>
    </div>
    <form class="panel filters filters-3 mb-6 p-4" [formGroup]="form" (ngSubmit)="load()">
      <label class="field">
        {{ locale.t('field.hotel') }}
        <select formControlName="hotelId">
          <option value="">{{ locale.t('list.anyHotel') }}</option>
          @for (hotel of hotels(); track hotel.id) {
            <option [value]="hotel.id">{{ hotelLabel(hotel) }}</option>
          }
        </select>
      </label>
      @if (hotelsError()) {
        <p class="span-all text-sm text-red-200" role="alert">{{ hotelsError() }}</p>
      }
      <label class="field">
        {{ locale.t('field.type') }}
        <select formControlName="bookingType">
          <option value="">{{ locale.t('field.any') }}</option>
          @for (option of types; track option.value) {
            <option [value]="option.value">{{ locale.t(option.key) }}</option>
          }
        </select>
      </label>
      <label class="field">
        {{ locale.t('field.status') }}
        <select formControlName="status">
          <option value="">{{ locale.t('field.any') }}</option>
          @for (option of statuses; track option.value) {
            <option [value]="option.value">{{ locale.t(option.key) }}</option>
          }
        </select>
      </label>
      <label class="field">{{ locale.t('field.from') }} <input type="date" formControlName="from" /></label>
      <label class="field">{{ locale.t('field.to') }} <input type="date" formControlName="to" /></label>
      <button class="btn btn-gold self-end" type="submit">{{ locale.t('action.filter') }}</button>
    </form>
    @if (loading()) {
      <p role="status">{{ locale.t('load.bookings') }}</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else if (!items().length) {
      <p>{{ locale.t('empty.bookings') }}</p>
    } @else {
      <div class="grid gap-3">
        @for (item of items(); track item.encodedId) {
          <article class="panel grid gap-3 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="kicker">{{ locale.label(typeLabel(item.bookingType)) }} · {{ locale.label(statusLabel(item.status)) }}</p>
                <h2 class="font-display text-3xl">{{ item.customerName || locale.t('noun.booking') }}</h2>
                <p class="text-sm text-gold-200/80">{{ stayTitle(item) }}</p>
              </div>
              <div class="w-full max-w-md sm:ms-auto">
                @if (isHotel(item)) {
                  <app-hotel-price [base]="hotelBase(item)" [quote]="item.totalPrice" mode="charge" />
                } @else {
                  <span class="block text-end font-display text-2xl">{{ money(item.totalPrice) }}</span>
                }
                <span class="mt-1 block text-end text-sm">{{ item.isPaid ? locale.t('pay.paid') : locale.t('pay.unpaid') }}</span>
              </div>
            </div>
            <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt class="text-gold-200/70">{{ locale.t('field.email') }}</dt>
                <dd>{{ item.customerEmail || '—' }}</dd>
              </div>
              <div>
                <dt class="text-gold-200/70">{{ locale.t('field.phone') }}</dt>
                <dd>{{ item.customerPhone || '—' }}</dd>
              </div>
              <div>
                <dt class="text-gold-200/70">{{ locale.t('book.booked') }}</dt>
                <dd>{{ when(item.createdAt) || '—' }}</dd>
              </div>
              <div>
                <dt class="text-gold-200/70">{{ locale.t('field.checkIn') }}</dt>
                <dd>{{ when(item.checkIn) || '—' }}</dd>
              </div>
              <div>
                <dt class="text-gold-200/70">{{ locale.t('field.checkOut') }}</dt>
                <dd>{{ when(item.checkOut) || '—' }}</dd>
              </div>
              <div>
                <dt class="text-gold-200/70">{{ locale.t('book.serviceDate') }}</dt>
                <dd>{{ when(item.serviceDate) || '—' }}</dd>
              </div>
              <div class="sm:col-span-2 lg:col-span-3">
                <dt class="text-gold-200/70">{{ locale.t('book.party') }}</dt>
                <dd>{{ party(item) }}</dd>
              </div>
              @if (item.paymentReference) {
                <div class="sm:col-span-2 lg:col-span-3">
                  <dt class="text-gold-200/70">{{ locale.t('field.paymentRef') }}</dt>
                  <dd class="break-all">{{ item.paymentReference }}</dd>
                </div>
              }
            </dl>
            @if (item.encodedId) {
              <div class="flex flex-wrap gap-2">
                <a class="btn btn-line w-fit" [routerLink]="['/admin/bookings', item.encodedId]">{{ locale.t('action.view') }}</a>
                <button type="button" class="btn btn-danger w-fit" [disabled]="busy()" (click)="cancel(item)">{{ locale.t('action.cancel') }}</button>
              </div>
            }
          </article>
        }
      </div>
    }
  `,
})
export class BookingsAdminPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  private readonly currency = inject(CurrencyService);
  readonly locale = inject(LocaleService);
  readonly money = (value: number | null | undefined) => this.currency.charge(value);
  readonly when = fromApiDateTime;
  readonly typeLabel = bookingTypeLabel;
  readonly statusLabel = bookingStatusLabel;
  readonly hotels = signal<HotelLookup[]>([]);
  readonly hotelsError = signal<string | null>(null);
  readonly items = signal<BookingResult[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly types: { value: BookingType; key: I18nKey }[] = [
    { value: BookingType.Hotel, key: 'noun.hotel' },
    { value: BookingType.Trip, key: 'noun.trip' },
    { value: BookingType.Transport, key: 'noun.transport' },
    { value: BookingType.Event, key: 'noun.event' },
    { value: BookingType.Package, key: 'noun.package' },
  ];
  readonly statuses = [
    { value: BookingStatus.Pending, key: 'pay.pending' as const },
    { value: BookingStatus.Confirmed, key: 'pay.confirmed' as const },
    { value: BookingStatus.Cancelled, key: 'pay.cancelled' as const },
  ];
  readonly form = inject(FormBuilder).nonNullable.group({
    hotelId: '',
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
    inject(Title).setTitle('Bookings · Admin');
    this.api.hotelLookup().subscribe({
      next: (hotels) => this.hotels.set(Array.isArray(hotels) ? hotels.filter((hotel) => hotel.id) : []),
      error: (error) => this.hotelsError.set(errorMessage(error)),
    });
    this.load();
  }

  hotelLabel(hotel: HotelLookup): string {
    return pairedName(hotel.name, hotel.nameAr) || 'Hotel';
  }

  stayTitle(item: BookingResult): string {
    const hotel = pairedName(item.hotelName, item.hotelNameAr);
    const room = pairedName(item.roomName, item.roomNameAr);
    const reserved = pairedName(item.itemName, item.itemNameAr);
    const place = [hotel, room].filter(Boolean).join(' · ');
    if (place && reserved && !place.includes(reserved)) {
      return `${place} · ${reserved}`;
    }
    return place || reserved || this.locale.t('noun.reservation');
  }

  party(item: BookingResult): string {
    const adults = item.adults ?? 0;
    const children = item.children ?? 0;
    const rooms = item.roomsBooked ?? 0;
    const parts = [
      `${adults} ${adults === 1 ? this.locale.t('field.adult') : this.locale.t('field.adultsWord')}`,
      `${children} ${children === 1 ? this.locale.t('field.child') : this.locale.t('field.childrenWord')}`,
      `${rooms} ${rooms === 1 ? this.locale.t('noun.roomWord') : this.locale.t('noun.roomsWord')}`,
      item.extraBed ? this.locale.t('book.extraBed') : this.locale.t('book.noExtraBed'),
    ];
    if (item.quantity != null) {
      parts.push(this.locale.t('book.qty', { n: item.quantity }));
    }
    return parts.join(' · ');
  }

  load(): void {
    const value = this.form.getRawValue();
    const hotelId = value.hotelId ? hotelNumericId(value.hotelId) : null;
    if (value.hotelId && hotelId == null) {
      this.error.set('This hotel could not be matched to a booking filter.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.api
      .adminBookings({
        hotelId,
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
    if (!id || !confirm(this.locale.t('book.cancelAsk'))) {
      return;
    }
    this.busy.set(true);
    this.api.cancelBooking(id).subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.success(this.locale.t('book.cancelled'));
        this.load();
      },
      error: (error) => {
        this.busy.set(false);
        this.notice.error(errorMessage(error));
      },
    });
  }
}

function hotelNumericId(encoded: string): number | null {
  try {
    const text = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const id = Number(text.split(':')[0]);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
