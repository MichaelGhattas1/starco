import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { CurrencyService } from '../core/currency.service';
import { Trip } from '../core/models';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-trips-admin-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="kicker">{{ locale.t('admin.catalog') }}</p>
        <h1 class="font-display text-5xl">{{ locale.t('nav.trips') }}</h1>
      </div>
      <a class="btn btn-gold" routerLink="/admin/trips/new">{{ locale.t('admin.newTrip') }}</a>
    </div>
    <form class="panel mb-4 flex flex-col gap-3 p-4 sm:flex-row" (ngSubmit)="load($event)">
      <label class="field flex-1">{{ locale.t('field.search') }} <input name="q" [value]="query()" /></label>
      <button class="btn btn-gold self-end" type="submit">{{ locale.t('action.search') }}</button>
    </form>
    @if (loading()) {
      <p role="status">{{ locale.t('load.trips') }}</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else if (!trips().length) {
      <p>{{ locale.t('empty.trips') }}</p>
    } @else {
      <div class="grid gap-3">
        @for (trip of trips(); track trip.id) {
          <article class="panel flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
            <div>
              <h2 class="font-display text-3xl">{{ label(trip) }}</h2>
              <p class="text-sm text-gold-200/80">
                {{ locale.pick(trip.city, trip.cityAr) }} · {{ money(trip.pricePerPerson) }} ·
                {{ trip.isActive ? locale.t('field.active') : locale.t('field.hidden') }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              @if (trip.id) {
                <a class="btn btn-line" [routerLink]="['/trips', trip.id]">{{ locale.t('action.view') }}</a>
              }
              <a class="btn btn-line" [routerLink]="['/admin/trips', trip.id]">{{ locale.t('action.edit') }}</a>
              <button type="button" class="btn btn-danger" (click)="remove(trip)">{{ locale.t('action.delete') }}</button>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class TripsAdminPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  readonly locale = inject(LocaleService);
  private readonly currency = inject(CurrencyService);
  readonly money = (value: number | null | undefined) => this.currency.charge(value);
  readonly trips = signal<Trip[]>([]);
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Trips · Admin');
    this.load();
  }

  load(event?: Event): void {
    event?.preventDefault();
    if (event) {
      const data = new FormData(event.target as HTMLFormElement);
      this.query.set(String(data.get('q') ?? ''));
    }
    this.loading.set(true);
    this.error.set(null);
    const search = this.query().trim();
    this.api.trips(search ? { Search: search } : {}).subscribe({
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

  label(trip: Trip): string {
    return this.locale.pick(trip.name, trip.nameAr) || 'Trip';
  }

  remove(trip: Trip): void {
    if (!trip.id || !confirm(this.locale.t('action.deleteAsk', { name: this.label(trip) }))) {
      return;
    }
    this.api.deleteTrip(trip.id).subscribe({
      next: () => {
        this.notice.success(this.locale.t('toast.deleted', { name: this.locale.t('noun.trip') }));
        this.load();
      },
      error: (error) => this.notice.error(errorMessage(error)),
    });
  }
}
