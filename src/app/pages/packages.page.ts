import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { CurrencyService } from '../core/currency.service';
import { firstImage, toApiDateTime } from '../core/media';
import { TravelPackage } from '../core/models';
import { CatalogCard } from '../shared/catalog-card';
import { plainText } from '../shared/plain-text';

@Component({
  selector: 'app-packages-page',
  imports: [ReactiveFormsModule, CatalogCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <p class="kicker">{{ locale.t('home.offers') }}</p>
      <h1 class="font-display text-5xl">{{ locale.t('home.packages') }}</h1>
    </div>
    <form class="panel filters filters-3 mb-6 p-4" [formGroup]="form" (ngSubmit)="load()">
      <label class="field">{{ locale.t('field.search') }} <input formControlName="Search" /></label>
      <label class="field">{{ locale.t('field.date') }} <input type="date" formControlName="Date" /></label>
      <label class="field">{{ locale.t('field.days') }} <input type="number" min="1" max="365" formControlName="DurationDays" /></label>
      <label class="field">{{ locale.t('field.minPrice', { code: currency.base }) }} <input type="number" min="0" step="0.01" formControlName="MinPrice" /></label>
      <label class="field">{{ locale.t('field.maxPrice', { code: currency.base }) }} <input type="number" min="0" step="0.01" formControlName="MaxPrice" /></label>
      <label class="field">
        {{ locale.t('field.hotel') }}
        <select formControlName="IncludesHotel">
          <option value="">{{ locale.t('field.any') }}</option>
          <option value="true">{{ locale.t('list.includesHotel') }}</option>
          <option value="false">{{ locale.t('list.noHotel') }}</option>
        </select>
      </label>
      <button class="btn btn-gold" type="submit">{{ locale.t('action.search') }}</button>
    </form>
    @if (loading()) {
      <p role="status">{{ locale.t('load.packages') }}</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else if (!items().length) {
      <p>{{ locale.t('empty.packagesSearch') }}</p>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (item of items(); track item.id) {
          @if (item.id) {
            <app-catalog-card
              [title]="label(item)"
              [kicker]="item.durationDays + ' days'"
              [summary]="plain(locale.pick(item.description, item.descriptionAr))"
              [price]="currency.display(item.packagePrice)"
              [image]="firstImage(item.images)"
              [link]="['/packages', item.id]"
            />
          }
        }
      </div>
    }
  `,
})
export class PackagesPage {
  private readonly api = inject(ApiService);
  readonly locale = inject(LocaleService);
  readonly currency = inject(CurrencyService);
  readonly firstImage = firstImage;
  readonly plain = plainText;
  readonly items = signal<TravelPackage[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    Search: '',
    Date: '',
    DurationDays: '',
    MinPrice: '',
    MaxPrice: '',
    IncludesHotel: '',
  });

  constructor() {
    inject(Title).setTitle('Packages · Plaza Inn');
    this.load();
  }

  label(item: TravelPackage): string {
    return this.locale.pick(item.name, item.nameAr) || this.locale.t('noun.package');
  }

  load(): void {
    const value = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.api
      .packages({
        Search: value.Search.trim() || undefined,
        Date: value.Date ? toApiDateTime(value.Date, 12) : undefined,
        DurationDays: numberOrNull(value.DurationDays),
        MinPrice: numberOrNull(value.MinPrice),
        MaxPrice: numberOrNull(value.MaxPrice),
        IncludesHotel: value.IncludesHotel === '' ? null : value.IncludesHotel === 'true',
        IsActive: true,
      })
      .subscribe({
        next: (items) => {
          this.items.set(items ?? []);
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
