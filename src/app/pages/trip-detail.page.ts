import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { CurrencyService } from '../core/currency.service';
import { firstImage, fromApiDate, mediaUrl } from '../core/media';
import { BookingType, Trip } from '../core/models';
import { ServiceBooking } from '../shared/service-booking';

@Component({
  selector: 'app-trip-detail-page',
  imports: [RouterLink, ServiceBooking],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/trips" class="text-sm text-gold-300">{{ locale.t('list.allTrips') }}</a>
    @if (loading()) {
      <p class="mt-6" role="status">{{ locale.t('load.trip') }}</p>
    } @else if (error()) {
      <p class="mt-6 text-red-200" role="alert">{{ error() }}</p>
    } @else if (trip(); as item) {
      <div class="mt-4 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <article class="grid gap-4">
          @if (firstImage(item.images); as src) {
            <img class="h-80 w-full rounded-[1.6rem] object-cover" [src]="src" [alt]="label(item)" />
          }
          <p class="kicker">{{ locale.pick(item.city, item.cityAr) }}</p>
          <h1 class="font-display text-5xl leading-none">{{ label(item) }}</h1>
          <p>{{ locale.t('noun.days', { n: item.durationDays }) }} · {{ locale.t('noun.hours', { n: item.durationHours }) }} · {{ locale.t('noun.guests', { n: item.maxCapacity }) }}</p>
          <p class="text-gold-300">{{ currency.display(item.pricePerPerson) }} {{ currency.per('person') }} · {{ currency.display(item.pricePerChild) }} {{ currency.per('child') }}</p>
          @if (item.startDate || item.endDate) {
            <p class="text-sm text-gold-200/80">{{ fromApiDate(item.startDate) }} – {{ fromApiDate(item.endDate) }}</p>
          }
          <div class="rich-text text-gold-100/90" [innerHTML]="locale.pick(item.description, item.descriptionAr)"></div>
          <div class="rich-text text-gold-100/90" [innerHTML]="locale.pick(item.itinerary, item.itineraryAr)"></div>
          @if (photos(item).length > 1) {
            <div class="grid grid-cols-3 gap-2">
              @for (src of photos(item); track src) {
                <img class="h-28 w-full rounded-xl object-cover" [src]="src" alt="" />
              }
            </div>
          }
        </article>
        @if (item.id) {
          <app-service-booking
            [kind]="tripType"
            [itemId]="item.id"
            [title]="label(item)"
            [price]="item.pricePerPerson"
            [needsParty]="true"
          />
        }
      </div>
    }
  `,
})
export class TripDetailPage {
  private readonly api = inject(ApiService);
  readonly locale = inject(LocaleService);
  readonly currency = inject(CurrencyService);
  readonly firstImage = firstImage;
  readonly fromApiDate = fromApiDate;
  readonly tripType = BookingType.Trip;
  readonly trip = signal<Trip | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.api.trip(id).subscribe({
      next: (trip) => {
        this.trip.set(trip);
        this.loading.set(false);
        inject(Title).setTitle(`${this.label(trip)} · Plaza Inn`);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  label(trip: Trip): string {
    return this.locale.pick(trip.name, trip.nameAr) || this.locale.t('noun.trip');
  }

  photos(trip: Trip): string[] {
    return (trip.images ?? []).flatMap((file) => {
      const src = mediaUrl(file.url);
      return src ? [src] : [];
    });
  }
}
