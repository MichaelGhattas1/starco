import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { CurrencyService } from '../core/currency.service';
import { firstImage } from '../core/media';
import { BookingType, TransportOffer } from '../core/models';
import { ServiceBooking } from '../shared/service-booking';

@Component({
  selector: 'app-transport-detail-page',
  imports: [RouterLink, ServiceBooking],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/transport" class="text-sm text-gold-300">All transport</a>
    @if (loading()) {
      <p class="mt-6" role="status">Loading transport…</p>
    } @else if (error()) {
      <p class="mt-6 text-red-200" role="alert">{{ error() }}</p>
    } @else if (item(); as offer) {
      <div class="mt-4 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <article class="grid gap-4">
          @if (firstImage(offer.images); as src) {
            <img class="h-80 w-full rounded-[1.6rem] object-cover" [src]="src" [alt]="label(offer)" />
          }
          <p class="kicker">{{ locale.pick(offer.vehicleType, offer.vehicleTypeAr) }}</p>
          <h1 class="font-display text-5xl leading-none">{{ label(offer) }}</h1>
          <p>
            {{ locale.pick(offer.pickupLocation, offer.pickupLocationAr) }}
            →
            {{ locale.pick(offer.dropoffLocation, offer.dropoffLocationAr) }}
          </p>
          <p>{{ offer.maxPassengers }} passengers · {{ offer.maxLuggage }} bags · {{ offer.availableVehicles }} vehicles</p>
          <p class="text-gold-300">{{ currency.display(offer.pricePerTrip) }} {{ currency.per('trip') }}</p>
          <div class="rich-text text-gold-100/90" [innerHTML]="locale.pick(offer.description, offer.descriptionAr)"></div>
        </article>
        @if (offer.id) {
          <app-service-booking [kind]="kind" [itemId]="offer.id" [title]="label(offer)" [price]="offer.pricePerTrip" />
        }
      </div>
    }
  `,
})
export class TransportDetailPage {
  private readonly api = inject(ApiService);
  readonly locale = inject(LocaleService);
  readonly currency = inject(CurrencyService);
  readonly firstImage = firstImage;
  readonly kind = BookingType.Transport;
  readonly item = signal<TransportOffer | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.api.transport(id).subscribe({
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

  label(item: TransportOffer): string {
    return this.locale.pick(item.name, item.nameAr) || 'Transport';
  }
}
