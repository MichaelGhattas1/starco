import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { CurrencyService } from '../core/currency.service';
import { firstImage, toApiDateTime } from '../core/media';
import { PlazaEvent } from '../core/models';
import { CatalogCard } from '../shared/catalog-card';
import { plainText } from '../shared/plain-text';

@Component({
  selector: 'app-events-page',
  imports: [ReactiveFormsModule, CatalogCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <p class="kicker">Calendar</p>
      <h1 class="font-display text-5xl">Events</h1>
    </div>
    <form class="panel mb-6 grid gap-3 p-4 md:grid-cols-5" [formGroup]="form" (ngSubmit)="load()">
      <label class="field">Search <input formControlName="Search" /></label>
      <label class="field">Location <input formControlName="Location" /></label>
      <label class="field">Date <input type="date" formControlName="Date" /></label>
      <label class="field">Min price ({{ currency.base }}) <input type="number" min="0" step="0.01" formControlName="MinPrice" /></label>
      <label class="field">Max price ({{ currency.base }}) <input type="number" min="0" step="0.01" formControlName="MaxPrice" /></label>
      <button class="btn btn-gold md:col-span-5" type="submit">Search</button>
    </form>
    @if (loading()) {
      <p role="status">Loading events…</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else if (!items().length) {
      <p>No events match this search.</p>
    } @else {
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        @for (item of items(); track item.id) {
          @if (item.id) {
            <app-catalog-card
              [title]="label(item)"
              [kicker]="locale.pick(item.location, item.locationAr)"
              [summary]="plain(locale.pick(item.description, item.descriptionAr))"
              [price]="currency.display(item.ticketPrice)"
              [image]="firstImage(item.images)"
              [link]="['/events', item.id]"
            />
          }
        }
      </div>
    }
  `,
})
export class EventsPage {
  private readonly api = inject(ApiService);
  readonly locale = inject(LocaleService);
  readonly currency = inject(CurrencyService);
  readonly firstImage = firstImage;
  readonly plain = plainText;
  readonly items = signal<PlazaEvent[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    Search: '',
    Location: '',
    Date: '',
    MinPrice: '',
    MaxPrice: '',
  });

  constructor() {
    inject(Title).setTitle('Events · Plaza Inn');
    this.load();
  }

  label(item: PlazaEvent): string {
    return this.locale.pick(item.name, item.nameAr) || 'Event';
  }

  load(): void {
    const value = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.api
      .events({
        Search: value.Search.trim() || undefined,
        Location: value.Location.trim() || undefined,
        Date: value.Date ? toApiDateTime(value.Date, 12) : undefined,
        MinPrice: numberOrNull(value.MinPrice),
        MaxPrice: numberOrNull(value.MaxPrice),
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
