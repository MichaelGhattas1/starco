import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { CurrencyService } from '../core/currency.service';
import { LocaleService } from '../core/locale.service';
import { fromApiDate, fromApiDateTime, toApiDateTime } from '../core/media';
import { AdminDashboardSummary, CatalogCount } from '../core/models';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="kicker no-print">{{ locale.t('admin.desk') }}</p>
    <h1 class="no-print font-display text-5xl">{{ locale.t('admin.dashboard') }}</h1>
    <p class="no-print mt-2 max-w-2xl text-sm text-gold-200/80">{{ locale.t('admin.lead') }}</p>
    <div class="no-print mt-5 flex flex-wrap items-end gap-3">
      <label class="grid gap-1 text-sm">
        {{ locale.t('field.from') }}
        <input class="field" type="date" [value]="from()" (change)="setFrom($event)" />
      </label>
      <label class="grid gap-1 text-sm">
        {{ locale.t('field.to') }}
        <input class="field" type="date" [value]="to()" (change)="setTo($event)" />
      </label>
      <button type="button" class="btn btn-line" [disabled]="!summary()" (click)="exportPdf()">{{ locale.t('admin.exportPdf') }}</button>
    </div>
    @if (loading()) {
      <p class="no-print mt-4" role="status">{{ locale.t('admin.loadingDesk') }}</p>
    } @else if (error()) {
      <p class="no-print mt-4 text-red-200" role="alert">{{ error() }}</p>
    }
    <div class="no-print mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <a routerLink="/admin/hotels" class="panel p-5"><p class="kicker">{{ locale.t('nav.hotels') }}</p><p class="font-display text-5xl">{{ hotels() }}</p><p class="text-xs text-gold-200/70">{{ activeLine(hotelCounts()) }}</p></a>
      <a routerLink="/admin/rooms" class="panel p-5"><p class="kicker">{{ locale.t('admin.rooms') }}</p><p class="font-display text-5xl">{{ rooms() }}</p><p class="text-xs text-gold-200/70">{{ activeLine(roomCounts()) }}</p></a>
      <a routerLink="/admin/trips" class="panel p-5"><p class="kicker">{{ locale.t('nav.trips') }}</p><p class="font-display text-5xl">{{ trips() }}</p><p class="text-xs text-gold-200/70">{{ activeLine(tripCounts()) }}</p></a>
      <a routerLink="/admin/transport" class="panel p-5"><p class="kicker">{{ locale.t('nav.transport') }}</p><p class="font-display text-5xl">{{ transport() }}</p><p class="text-xs text-gold-200/70">{{ activeLine(transportCounts()) }}</p></a>
      <a routerLink="/admin/events" class="panel p-5"><p class="kicker">{{ locale.t('nav.events') }}</p><p class="font-display text-5xl">{{ events() }}</p><p class="text-xs text-gold-200/70">{{ activeLine(eventCounts()) }}</p></a>
      <a routerLink="/admin/packages" class="panel p-5"><p class="kicker">{{ locale.t('home.packages') }}</p><p class="font-display text-5xl">{{ packages() }}</p><p class="text-xs text-gold-200/70">{{ activeLine(packageCounts()) }}</p></a>
      <a routerLink="/admin/bookings" class="panel p-5"><p class="kicker">{{ locale.t('nav.bookings') }}</p><p class="font-display text-5xl">{{ bookings() }}</p></a>
      <a routerLink="/admin/partners" class="panel p-5"><p class="kicker">{{ locale.t('admin.partners') }}</p><p class="font-display text-5xl">{{ partners() }}</p></a>
      <a routerLink="/admin/users" class="panel p-5"><p class="kicker">{{ locale.t('admin.users') }}</p><p class="font-display text-5xl">{{ users() }}</p></a>
      <a routerLink="/admin/currency" class="panel p-5"><p class="kicker">{{ locale.t('admin.currency') }}</p><p class="font-display text-5xl">{{ currency.applied() }}</p></a>
    </div>
    @if (summary(); as desk) {
      <div class="no-print mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="panel p-5"><p class="kicker">{{ locale.t('admin.confirmed') }}</p><p class="font-display text-4xl">{{ desk.kpis.confirmedBookings }}</p><p class="text-sm text-gold-300">{{ currency.charge(desk.kpis.totalConfirmedRevenue) }}</p></article>
        <article class="panel p-5"><p class="kicker">{{ locale.t('admin.pending') }}</p><p class="font-display text-4xl">{{ desk.kpis.pendingBookings }}</p><p class="text-sm text-gold-300">{{ currency.charge(desk.kpis.pendingRevenue) }}</p></article>
        <article class="panel p-5"><p class="kicker">{{ locale.t('admin.cancelled') }}</p><p class="font-display text-4xl">{{ desk.kpis.cancelledBookings }}</p></article>
        <article class="panel p-5"><p class="kicker">{{ locale.t('admin.expired') }}</p><p class="font-display text-4xl">{{ desk.kpis.expiredBookings }}</p><p class="text-sm text-gold-300">{{ locale.t('admin.taxCollected') }} · {{ currency.charge(desk.kpis.totalTaxCollected) }}</p></article>
      </div>
      <div class="no-print mt-6 grid gap-4 lg:grid-cols-3">
        <section class="panel p-5">
          <h2 class="font-display text-3xl">{{ locale.t('admin.revenueByService') }}</h2>
          <ul class="mt-3 grid gap-2 text-sm">
            @for (row of desk.revenueByServiceType ?? []; track row.bookingType) {
              <li class="flex items-start justify-between gap-3">
                <span>{{ locale.label(row.bookingTypeName ?? '') }}</span>
                <span class="text-end text-gold-300">{{ currency.charge(row.revenue) }} · {{ row.revenueSharePercentage }}%</span>
              </li>
            } @empty {
              <li>{{ locale.t('empty.noneYet') }}</li>
            }
          </ul>
        </section>
        <section class="panel p-5">
          <h2 class="font-display text-3xl">{{ locale.t('admin.recentBookings') }}</h2>
          <ul class="mt-3 grid gap-3 text-sm">
            @for (row of desk.operationalInsights?.recentBookings ?? []; track row.encodedId ?? row.createdAt) {
              <li>
                <p class="font-bold">{{ row.itemName || row.bookingReference }}</p>
                <p class="text-gold-200/80">{{ locale.label(row.status ?? '') }} · {{ locale.label(row.paymentStatus ?? '') }} · {{ currency.charge(row.totalPrice) }}</p>
                <p class="text-xs text-gold-200/60">{{ fromApiDateTime(row.createdAt) }}</p>
              </li>
            } @empty {
              <li>{{ locale.t('empty.noneYet') }}</li>
            }
          </ul>
        </section>
        <section class="panel p-5">
          <h2 class="font-display text-3xl">{{ locale.t('admin.lowCapacity') }}</h2>
          <ul class="mt-3 grid gap-3 text-sm">
            @for (row of desk.operationalInsights?.lowCapacityAlerts ?? []; track row.encodedId ?? row.name) {
              <li>
                <p class="font-bold">{{ row.name }}</p>
                <p class="text-gold-200/80">{{ locale.label(row.itemType ?? '') }} · {{ locale.t('admin.remaining', { n: row.remaining }) }}</p>
                <p class="text-xs text-gold-200/60">{{ fromApiDate(row.serviceDate) }}</p>
              </li>
            } @empty {
              <li>{{ locale.t('empty.noneYet') }}</li>
            }
          </ul>
        </section>
      </div>
      <div class="no-print mt-6 grid gap-4 lg:grid-cols-2">
        <section class="panel p-5">
          <h2 class="font-display text-3xl">{{ locale.t('admin.monthly') }}</h2>
          <ul class="mt-3 grid gap-2 text-sm">
            @for (row of desk.monthlyTrends ?? []; track row.year + '-' + row.month) {
              <li class="flex items-center justify-between gap-3">
                <span>{{ row.periodLabel || row.month + '/' + row.year }}</span>
                <span class="text-gold-300">{{ locale.t('admin.bookingsCount', { n: row.bookingsCount }) }} · {{ currency.charge(row.confirmedRevenue) }}</span>
              </li>
            } @empty {
              <li>{{ locale.t('empty.noneYet') }}</li>
            }
          </ul>
        </section>
        <section class="panel p-5">
          <h2 class="font-display text-3xl">{{ locale.t('admin.topPerformers') }}</h2>
          <div class="mt-3 grid gap-4 text-sm">
            @for (group of performerGroups(desk); track group.title) {
              @if (group.rows.length) {
                <div>
                  <p class="kicker">{{ group.title }}</p>
                  <ul class="mt-1 grid gap-1">
                    @for (row of group.rows; track row.name) {
                      <li class="flex justify-between gap-3"><span>{{ row.name }}</span><span class="text-gold-300">{{ currency.charge(row.totalRevenue) }}</span></li>
                    }
                  </ul>
                </div>
              }
            }
          </div>
        </section>
      </div>
      <article class="desk-report">
        <p class="kicker">Plaza Inn</p>
        <h1 class="font-display text-4xl">{{ locale.t('admin.dashboard') }}</h1>
        <p>{{ locale.t('field.from') }} / {{ locale.t('field.to') }}: {{ periodLabel() }}</p>
        <p>{{ generatedLabel() }}</p>
        <section>
          <h2 class="font-display text-2xl">{{ locale.t('admin.catalog') }}</h2>
          <table>
            <thead>
              <tr>
                <th>{{ locale.t('admin.catalog') }}</th>
                <th>{{ locale.t('book.total') }}</th>
                <th>{{ locale.t('admin.active') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of catalogRows(); track row.label) {
                <tr>
                  <td>{{ row.label }}</td>
                  <td>{{ row.total }}</td>
                  <td>{{ row.active ?? '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
        <section>
          <h2 class="font-display text-2xl">{{ locale.t('nav.bookings') }}</h2>
          <table>
            <tbody>
              <tr><td>{{ locale.t('admin.confirmed') }}</td><td>{{ desk.kpis.confirmedBookings }}</td><td>{{ currency.charge(desk.kpis.totalConfirmedRevenue) }}</td></tr>
              <tr><td>{{ locale.t('admin.pending') }}</td><td>{{ desk.kpis.pendingBookings }}</td><td>{{ currency.charge(desk.kpis.pendingRevenue) }}</td></tr>
              <tr><td>{{ locale.t('admin.cancelled') }}</td><td>{{ desk.kpis.cancelledBookings }}</td><td></td></tr>
              <tr><td>{{ locale.t('admin.expired') }}</td><td>{{ desk.kpis.expiredBookings }}</td><td></td></tr>
              <tr><td>{{ locale.t('admin.taxCollected') }}</td><td></td><td>{{ currency.charge(desk.kpis.totalTaxCollected) }}</td></tr>
            </tbody>
          </table>
        </section>
        <section>
          <h2 class="font-display text-2xl">{{ locale.t('admin.revenueByService') }}</h2>
          <table>
            <thead>
              <tr>
                <th>{{ locale.t('admin.catalog') }}</th>
                <th>{{ locale.t('nav.bookings') }}</th>
                <th>{{ locale.t('admin.confirmed') }}</th>
                <th>{{ locale.t('admin.revenue') }}</th>
                <th>{{ locale.t('admin.share') }}</th>
                <th>{{ locale.t('admin.taxCollected') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of desk.revenueByServiceType ?? []; track row.bookingType) {
                <tr>
                  <td>{{ locale.label(row.bookingTypeName ?? '') }}</td>
                  <td>{{ row.bookingsCount }}</td>
                  <td>{{ row.confirmedCount }}</td>
                  <td>{{ currency.charge(row.revenue) }}</td>
                  <td>{{ row.revenueSharePercentage }}%</td>
                  <td>{{ currency.charge(row.taxAmount) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6">{{ locale.t('empty.noneYet') }}</td></tr>
              }
            </tbody>
          </table>
        </section>
        <section>
          <h2 class="font-display text-2xl">{{ locale.t('admin.recentBookings') }}</h2>
          <table>
            <tbody>
              @for (row of desk.operationalInsights?.recentBookings ?? []; track row.encodedId ?? row.createdAt) {
                <tr>
                  <td>{{ row.itemName || row.bookingReference }}</td>
                  <td>{{ locale.label(row.status ?? '') }}</td>
                  <td>{{ locale.label(row.paymentStatus ?? '') }}</td>
                  <td>{{ currency.charge(row.totalPrice) }}</td>
                  <td>{{ fromApiDateTime(row.createdAt) }}</td>
                </tr>
              } @empty {
                <tr><td>{{ locale.t('empty.noneYet') }}</td></tr>
              }
            </tbody>
          </table>
        </section>
        <section>
          <h2 class="font-display text-2xl">{{ locale.t('admin.lowCapacity') }}</h2>
          <table>
            <tbody>
              @for (row of desk.operationalInsights?.lowCapacityAlerts ?? []; track row.encodedId ?? row.name) {
                <tr>
                  <td>{{ row.name }}</td>
                  <td>{{ locale.label(row.itemType ?? '') }}</td>
                  <td>{{ locale.t('admin.remaining', { n: row.remaining }) }}</td>
                  <td>{{ fromApiDate(row.serviceDate) }}</td>
                </tr>
              } @empty {
                <tr><td>{{ locale.t('empty.noneYet') }}</td></tr>
              }
            </tbody>
          </table>
        </section>
        <section>
          <h2 class="font-display text-2xl">{{ locale.t('admin.monthly') }}</h2>
          <table>
            <tbody>
              @for (row of desk.monthlyTrends ?? []; track row.year + '-' + row.month) {
                <tr>
                  <td>{{ row.periodLabel || row.month + '/' + row.year }}</td>
                  <td>{{ locale.t('admin.bookingsCount', { n: row.bookingsCount }) }}</td>
                  <td>{{ currency.charge(row.confirmedRevenue) }}</td>
                </tr>
              } @empty {
                <tr><td>{{ locale.t('empty.noneYet') }}</td></tr>
              }
            </tbody>
          </table>
        </section>
        <section>
          <h2 class="font-display text-2xl">{{ locale.t('admin.topPerformers') }}</h2>
          @for (group of performerGroups(desk); track group.title) {
            @if (group.rows.length) {
              <h3 class="mt-2 text-sm font-bold">{{ group.title }}</h3>
              <table>
                <tbody>
                  @for (row of group.rows; track row.name) {
                    <tr>
                      <td>{{ row.name }}</td>
                      <td>{{ currency.charge(row.totalRevenue) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          }
        </section>
      </article>
    }
  `,
})
export class DashboardPage {
  readonly currency = inject(CurrencyService);
  readonly locale = inject(LocaleService);
  readonly fromApiDate = fromApiDate;
  readonly fromApiDateTime = fromApiDateTime;
  readonly hotels = signal(0);
  readonly rooms = signal(0);
  readonly trips = signal(0);
  readonly transport = signal(0);
  readonly events = signal(0);
  readonly packages = signal(0);
  readonly bookings = signal(0);
  readonly partners = signal(0);
  readonly users = signal(0);
  readonly hotelCounts = signal<CatalogCount | null>(null);
  readonly roomCounts = signal<CatalogCount | null>(null);
  readonly tripCounts = signal<CatalogCount | null>(null);
  readonly transportCounts = signal<CatalogCount | null>(null);
  readonly eventCounts = signal<CatalogCount | null>(null);
  readonly packageCounts = signal<CatalogCount | null>(null);
  readonly summary = signal<AdminDashboardSummary | null>(null);
  readonly from = signal('');
  readonly to = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  private readonly api = inject(ApiService);

  constructor() {
    inject(Title).setTitle('Admin · Plaza Inn');
    this.api.partners().pipe(catchError(() => of([]))).subscribe((list) => this.partners.set(list.length));
    this.reload(true);
  }

  exportPdf(): void {
    if (!this.summary()) {
      return;
    }
    const previous = document.title;
    document.title = `Plaza Inn summary ${new Date().toISOString().slice(0, 10)}`;
    const restore = (): void => {
      document.title = previous;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }

  periodLabel(): string {
    const from = this.from();
    const to = this.to();
    if (!from && !to) {
      return this.locale.t('admin.allDates');
    }
    return [from, to].filter(Boolean).join(' – ');
  }

  generatedLabel(): string {
    const date = new Date().toLocaleDateString(this.locale.lang() === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return this.locale.t('admin.generated', { date });
  }

  catalogRows(): { label: string; total: number; active: number | null }[] {
    return [
      { label: this.locale.t('nav.hotels'), total: this.hotels(), active: this.hotelCounts()?.active ?? null },
      { label: this.locale.t('admin.rooms'), total: this.rooms(), active: this.roomCounts()?.active ?? null },
      { label: this.locale.t('nav.trips'), total: this.trips(), active: this.tripCounts()?.active ?? null },
      { label: this.locale.t('nav.transport'), total: this.transport(), active: this.transportCounts()?.active ?? null },
      { label: this.locale.t('nav.events'), total: this.events(), active: this.eventCounts()?.active ?? null },
      { label: this.locale.t('home.packages'), total: this.packages(), active: this.packageCounts()?.active ?? null },
      { label: this.locale.t('nav.bookings'), total: this.bookings(), active: null },
      { label: this.locale.t('admin.partners'), total: this.partners(), active: null },
      { label: this.locale.t('admin.users'), total: this.users(), active: null },
    ];
  }

  setFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
    this.reload(false);
  }

  setTo(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
    this.reload(false);
  }

  activeLine(count: CatalogCount | null): string {
    if (!count) {
      return '';
    }
    return this.locale.t('admin.activeCount', { n: count.active });
  }

  performerGroups(desk: AdminDashboardSummary): { title: string; rows: { name: string | null; totalRevenue: number }[] }[] {
    const top = desk.topPerformers;
    return [
      { title: this.locale.t('nav.hotels'), rows: top?.hotels ?? [] },
      { title: this.locale.t('nav.trips'), rows: top?.trips ?? [] },
      { title: this.locale.t('nav.transport'), rows: top?.transports ?? [] },
      { title: this.locale.t('home.packages'), rows: top?.packages ?? [] },
      { title: this.locale.t('nav.events'), rows: top?.events ?? [] },
      {
        title: this.locale.t('admin.destinations'),
        rows: (top?.topDestinations ?? []).map((row) => ({ name: row.location, totalRevenue: row.totalRevenue })),
      },
    ];
  }

  private reload(allowFallback: boolean): void {
    this.loading.set(true);
    this.error.set(null);
    const from = this.from();
    const to = this.to();
    this.api
      .dashboardSummary(from ? toApiDateTime(from, 0) : null, to ? toApiDateTime(to, 23) : null)
      .subscribe({
        next: (summary) => {
          this.applySummary(summary);
          this.loading.set(false);
        },
        error: (error) => {
          if (allowFallback) {
            this.loadLists();
            return;
          }
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }

  private applySummary(summary: AdminDashboardSummary): void {
    const counts = summary.kpis.catalogCounts;
    this.summary.set(summary);
    this.hotels.set(counts.hotels.total);
    this.rooms.set(counts.rooms.total);
    this.trips.set(counts.trips.total);
    this.transport.set(counts.transports.total);
    this.events.set(counts.events.total);
    this.packages.set(counts.packages.total);
    this.bookings.set(summary.kpis.totalBookings);
    this.users.set(summary.kpis.totalUsers);
    this.hotelCounts.set(counts.hotels);
    this.roomCounts.set(counts.rooms);
    this.tripCounts.set(counts.trips);
    this.transportCounts.set(counts.transports);
    this.eventCounts.set(counts.events);
    this.packageCounts.set(counts.packages);
  }

  private loadLists(): void {
    const api = this.api;
    forkJoin({
      hotels: keepList(api.hotels()),
      rooms: keepList(api.rooms()),
      trips: keepList(api.trips()),
      transport: keepList(api.transports()),
      events: keepList(api.events()),
      packages: keepList(api.packages()),
      bookings: keepList(api.adminBookings()),
      users: keepList(api.users()),
    }).subscribe({
      next: (data) => {
        this.summary.set(null);
        this.hotels.set(data.hotels.length);
        this.rooms.set(data.rooms.length);
        this.trips.set(data.trips.length);
        this.transport.set(data.transport.length);
        this.events.set(data.events.length);
        this.packages.set(data.packages.length);
        this.bookings.set(data.bookings.length);
        this.users.set(data.users.length);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }
}

function keepList<T>(source: Observable<T[]>): Observable<T[]> {
  return source.pipe(catchError(() => of([] as T[])));
}
