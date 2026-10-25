import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { CurrencyService } from '../core/currency.service';
import { firstImage, fromApiDate } from '../core/media';
import { BookingType, TravelPackage } from '../core/models';
import { ServiceBooking } from '../shared/service-booking';

@Component({
  selector: 'app-package-detail-page',
  imports: [RouterLink, ServiceBooking],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/packages" class="text-sm text-gold-300">All packages</a>
    @if (loading()) {
      <p class="mt-6" role="status">Loading package…</p>
    } @else if (error()) {
      <p class="mt-6 text-red-200" role="alert">{{ error() }}</p>
    } @else if (item(); as pack) {
      <div class="mt-4 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <article class="grid gap-4">
          @if (firstImage(pack.images); as src) {
            <img class="h-80 w-full rounded-[1.6rem] object-cover" [src]="src" [alt]="label(pack)" />
          }
          <p class="kicker">{{ pack.durationDays }} days</p>
          <h1 class="font-display text-5xl leading-none">{{ label(pack) }}</h1>
          <p class="text-gold-300">{{ currency.display(pack.packagePrice) }}</p>
          @if (pack.hotelName || pack.hotelNameAr) {
            <p>
              Hotel: {{ locale.pick(pack.hotelName, pack.hotelNameAr) }}
              @if (pack.roomName || pack.roomNameAr) {
                · {{ locale.pick(pack.roomName, pack.roomNameAr) }}
              }
              @if (pack.nightsCount) {
                · {{ pack.nightsCount }} nights
              }
            </p>
          }
          @if (pack.startDate || pack.endDate) {
            <p class="text-sm text-gold-200/80">{{ fromApiDate(pack.startDate) }} – {{ fromApiDate(pack.endDate) }}</p>
          }
          <div class="rich-text text-gold-100/90" [innerHTML]="locale.pick(pack.description, pack.descriptionAr)"></div>
          @if (pack.trips?.length) {
            <p>Trips: {{ names(pack.trips) }}</p>
          }
          @if (pack.transports?.length) {
            <p>Transport: {{ names(pack.transports) }}</p>
          }
          @if (pack.events?.length) {
            <p>Events: {{ names(pack.events) }}</p>
          }
        </article>
        @if (pack.id) {
          <app-service-booking [kind]="kind" [itemId]="pack.id" [title]="label(pack)" [price]="pack.packagePrice" />
        }
      </div>
    }
  `,
})
export class PackageDetailPage {
  private readonly api = inject(ApiService);
  readonly locale = inject(LocaleService);
  readonly currency = inject(CurrencyService);
  readonly firstImage = firstImage;
  readonly fromApiDate = fromApiDate;
  readonly kind = BookingType.Package;
  readonly item = signal<TravelPackage | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.api.package(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loading.set(false);
        inject(Title).setTitle(`${this.label(item)} · Plaza Inn`);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  label(item: TravelPackage): string {
    return this.locale.pick(item.name, item.nameAr) || 'Package';
  }

  names(items: { name: string | null; nameAr: string | null }[] | null): string {
    return (items ?? []).map((item) => this.locale.pick(item.name, item.nameAr) || 'Item').join(', ');
  }
}
