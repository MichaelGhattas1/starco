import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { CurrencyService } from '../core/currency.service';
import { firstImage, toApiDateTime } from '../core/media';
import { Trip } from '../core/models';
import { CatalogCard } from '../shared/catalog-card';
import { plainText } from '../shared/plain-text';

@Component({
  selector: 'app-trips-page',
  imports: [ReactiveFormsModule, CatalogCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <p class="kicker">{{ locale.t('home.departures') }}</p>
      <h1 class="font-display text-5xl">{{ locale.t('nav.trips') }}</h1>
    </div>
    <form class="panel filters filters-5 mb-6 p-4" [formGroup]="form" (ngSubmit)="load()">
      <label class="field">{{ locale.t('field.search') }} <input formControlName="Search" /></label>
      <label class="field">{{ locale.t('field.city') }} <input formControlName="City" /></label>
      <label class="field">{{ locale.t('field.date') }} <input type="date" formControlName="Date" /></label>
      <label class="field">{{ locale.t('field.minPrice', { code: currency.base }) }} <input type="number" min="0" step="0.01" formControlName="MinPrice" /></label>
      <label class="field">{{ locale.t('field.maxPrice', { code: currency.base }) }} <input type="number" min="0" step="0.01" formControlName="MaxPrice" /></label>
      <button class="btn btn-gold" type="submit">{{ locale.t('action.search') }}</button>
    </form>
    @if (loading()) {
      <p role="status">{{ locale.t('load.trips') }}</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else if (!trips().length) {
      <p>{{ locale.t('empty.tripsSearch') }}</p>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (trip of trips(); track trip.id) {
          @if (trip.id) {
            <app-catalog-card
              [title]="label(trip)"
              [kicker]="locale.pick(trip.city, trip.cityAr)"
              [summary]="plain(locale.pick(trip.description, trip.descriptionAr))"
              [price]="currency.display(trip.pricePerPerson) + ' ' + currency.per('person')"
              [image]="firstImage(trip.images)"
              [link]="['/trips', trip.id]"
            />
          }
        }
      </div>
    }
  `,
})
export class TripsPage {
  private readonly api = inject(ApiService);
  readonly locale = inject(LocaleService);
  readonly currency = inject(CurrencyService);
  readonly firstImage = firstImage;
  readonly plain = plainText;
  readonly trips = signal<Trip[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    Search: '',
    City: '',
    Date: '',
    MinPrice: '',
    MaxPrice: '',
  });

  constructor() {
    inject(Title).setTitle('Trips · Plaza Inn');
    this.load();
  }

  label(trip: Trip): string {
    return this.locale.pick(trip.name, trip.nameAr) || this.locale.t('noun.trip');
  }

  load(): void {
    const value = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.api
      .trips({
        Search: value.Search.trim() || undefined,
        City: value.City.trim() || undefined,
        Date: value.Date ? toApiDateTime(value.Date, 12) : undefined,
        MinPrice: numberOrNull(value.MinPrice),
        MaxPrice: numberOrNull(value.MaxPrice),
        IsActive: true,
      })
      .subscribe({
        next: (trips) => {
          this.trips.set(trips ?? []);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}
