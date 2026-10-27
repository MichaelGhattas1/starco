import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { CurrencyService } from '../core/currency.service';
import { hotelBaseFromTotal, isHotelBooking } from '../core/hotel-charges';
import { fromApiDateTime } from '../core/media';
import { BookingResult, BookingStatus, bookingStatusLabel, bookingTypeLabel, pairedName } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { NoticeService } from '../core/notice.service';
import { HotelPrice } from '../shared/hotel-price';

interface BookingFact {
  label: string;
  value: string;
  href?: string;
  link?: string[];
  wide?: boolean;
}

@Component({
  selector: 'app-booking-detail-page',
  imports: [RouterLink, HotelPrice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="backLink()" class="text-sm text-gold-300">{{ locale.t('list.allBookings') }}</a>
    @if (loading()) {
      <p class="mt-6" role="status">{{ locale.t('load.booking') }}</p>
    } @else if (error()) {
      <p class="mt-6 text-red-200" role="alert">{{ error() }}</p>
    } @else if (item(); as booking) {
      <article class="panel mt-4 grid gap-6 p-6">
        <div>
          <p class="kicker">{{ locale.label(typeLabel(booking.bookingType)) }} · {{ locale.label(statusLabel(booking.status)) }}</p>
          <h1 class="font-display text-5xl leading-none">{{ booking.customerName || locale.t('noun.booking') }}</h1>
        </div>
        @if (isHotel(booking)) {
          <app-hotel-price [base]="hotelBase(booking)" [quote]="booking.totalPrice" mode="charge" />
        }
        <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          @for (row of facts(booking); track row.label) {
            <div [attr.class]="row.wide ? 'sm:col-span-2' : null">
              <dt class="text-xs uppercase tracking-wide text-gold-200/70">{{ row.label }}</dt>
              <dd class="mt-1 break-all">
                @if (row.href) {
                  <a class="text-gold-300" [href]="row.href">{{ row.value }}</a>
                } @else if (row.link) {
                  <a class="text-gold-300" [routerLink]="row.link">{{ row.value }}</a>
                } @else {
                  {{ row.value }}
                }
              </dd>
            </div>
          }
        </dl>
        @if (booking.encodedId && !cancelled(booking)) {
          <button type="button" class="btn btn-danger w-fit" [disabled]="busy()" (click)="cancel(booking)">
            {{ locale.t('book.cancelBooking') }}
          </button>
        }
      </article>
    }
  `,
})
export class BookingDetailPage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notice = inject(NoticeService);
  private readonly currency = inject(CurrencyService);
  readonly locale = inject(LocaleService);

  readonly typeLabel = bookingTypeLabel;
  readonly statusLabel = bookingStatusLabel;
  readonly item = signal<BookingResult | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  constructor() {
    inject(Title).setTitle('Booking · Plaza Inn');
    this.load();
  }

  facts(booking: BookingResult): BookingFact[] {
    const hotel = pairedName(booking.hotelName, booking.hotelNameAr);
    const room = pairedName(booking.roomName, booking.roomNameAr);
    const reserved = pairedName(booking.itemName, booking.itemNameAr);
    const rows: BookingFact[] = [
      { label: this.locale.t('book.payment'), value: booking.isPaid ? this.locale.t('pay.paid') : this.locale.t('pay.unpaid') },
      { label: this.locale.t('field.paymentRef'), value: booking.paymentReference || '—', wide: true },
      { label: this.locale.t('field.email'), value: booking.customerEmail || '—', href: mail(booking.customerEmail) },
      { label: this.locale.t('field.phone'), value: booking.customerPhone || '—', href: phone(booking.customerPhone) },
      { label: this.locale.t('book.booked'), value: fromApiDateTime(booking.createdAt) || '—' },
      { label: this.locale.t('field.checkIn'), value: fromApiDateTime(booking.checkIn) || '—' },
      { label: this.locale.t('field.checkOut'), value: fromApiDateTime(booking.checkOut) || '—' },
    ];
    const serviceDate = fromApiDateTime(booking.serviceDate);
    if (!isHotelBooking(booking)) {
      rows.unshift({ label: this.locale.t('book.total'), value: this.currency.charge(booking.totalPrice) });
    }
    if (serviceDate) {
      rows.push({ label: this.locale.t('book.serviceDate'), value: serviceDate });
    }
    if (hotel) {
      rows.push({
        label: this.locale.t('field.hotel'),
        value: hotel,
        link: booking.encodedHotelId ? ['/hotels', booking.encodedHotelId] : undefined,
      });
    }
    if (room) {
      rows.push({ label: this.locale.t('noun.room'), value: room });
    }
    if (reserved && reserved !== hotel && reserved !== room) {
      rows.push({ label: this.locale.t('book.reservedItem'), value: reserved, link: this.serviceLink(booking), wide: true });
    }
    rows.push(
      { label: this.locale.t('field.adults'), value: String(booking.adults ?? 0) },
      { label: this.locale.t('field.children'), value: String(booking.children ?? 0) },
      { label: this.locale.t('book.roomsBooked'), value: String(booking.roomsBooked ?? 0) },
      { label: this.locale.t('field.quantity'), value: String(booking.quantity ?? 0) },
      { label: this.locale.t('book.extraBed'), value: booking.extraBed ? this.locale.t('book.yes') : this.locale.t('book.no') },
    );
    return rows;
  }

  private serviceLink(booking: BookingResult): string[] | undefined {
    if (booking.encodedTripId) {
      return ['/trips', booking.encodedTripId];
    }
    if (booking.encodedTransportId) {
      return ['/transport', booking.encodedTransportId];
    }
    if (booking.encodedEventId) {
      return ['/events', booking.encodedEventId];
    }
    if (booking.encodedPackageId) {
      return ['/packages', booking.encodedPackageId];
    }
    return undefined;
  }

  readonly isHotel = isHotelBooking;

  hotelBase(booking: BookingResult): number {
    return hotelBaseFromTotal(booking.totalPrice);
  }

  backLink(): string {
    return this.router.url.startsWith('/admin') ? '/admin/bookings' : '/bookings';
  }

  cancelled(booking: BookingResult): boolean {
    if (booking.status === BookingStatus.Cancelled) {
      return true;
    }
    return typeof booking.status === 'string' && /cancel/i.test(booking.status);
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loading.set(true);
    this.error.set(null);
    this.api.booking(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  cancel(booking: BookingResult): void {
    const id = booking.encodedId;
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

function mail(value: string | null | undefined): string | undefined {
  const email = value?.trim();
  return email ? `mailto:${email}` : undefined;
}

function phone(value: string | null | undefined): string | undefined {
  const number = value?.trim();
  return number ? `tel:${number}` : undefined;
}
