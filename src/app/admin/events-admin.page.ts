import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { CurrencyService } from '../core/currency.service';
import { fromApiDate } from '../core/media';
import { PlazaEvent } from '../core/models';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-events-admin-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5 flex items-end justify-between gap-4">
      <div>
        <p class="kicker">Catalog</p>
        <h1 class="font-display text-5xl">Events</h1>
      </div>
      <a class="btn btn-gold" routerLink="/admin/events/new">New event</a>
    </div>
    <form class="panel mb-4 flex flex-col gap-3 p-4 sm:flex-row" (ngSubmit)="load($event)">
      <label class="field flex-1">Search <input name="q" [value]="query()" /></label>
      <button class="btn btn-gold self-end" type="submit">Search</button>
    </form>
    @if (loading()) {
      <p role="status">Loading events…</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else if (!items().length) {
      <p>No events yet.</p>
    } @else {
      <div class="grid gap-3">
        @for (item of items(); track item.id) {
          <article class="panel flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
            <div>
              <h2 class="font-display text-3xl">{{ label(item) }}</h2>
              <p class="text-sm text-gold-200/80">
                {{ fromApiDate(item.eventDate) }} · {{ money(item.ticketPrice) }} ·
                {{ item.isActive ? 'Active' : 'Hidden' }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              @if (item.id) {
                <a class="btn btn-line" [routerLink]="['/events', item.id]">View</a>
              }
              <a class="btn btn-line" [routerLink]="['/admin/events', item.id]">Edit</a>
              <button type="button" class="btn btn-danger" (click)="remove(item)">Delete</button>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class EventsAdminPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  readonly locale = inject(LocaleService);
  private readonly currency = inject(CurrencyService);
  readonly money = (value: number | null | undefined) => this.currency.charge(value);
  readonly fromApiDate = fromApiDate;
  readonly items = signal<PlazaEvent[]>([]);
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Events · Admin');
    this.load();
  }

  label(item: PlazaEvent): string {
    return this.locale.pick(item.name, item.nameAr) || 'Event';
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
    this.api.events(search ? { Search: search } : {}).subscribe({
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

  remove(item: PlazaEvent): void {
    if (!item.id || !confirm(`Delete ${this.label(item)}?`)) {
      return;
    }
    this.api.deleteEvent(item.id).subscribe({
      next: () => {
        this.notice.success('Event deleted.');
        this.load();
      },
      error: (error) => this.notice.error(errorMessage(error)),
    });
  }
}
