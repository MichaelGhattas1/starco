import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { CurrencyService } from '../core/currency.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="kicker">Desk</p>
    <h1 class="font-display text-5xl">Dashboard</h1>
    <p class="mt-2 max-w-2xl text-sm text-gold-200/80">
      Counts come from the Plaza API. Open a catalog to add, edit, or delete records.
    </p>
    @if (loading()) {
      <p class="mt-4" role="status">Loading the desk…</p>
    } @else if (error()) {
      <p class="mt-4 text-red-200" role="alert">{{ error() }}</p>
    }
    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <a routerLink="/admin/hotels" class="panel p-5"><p class="kicker">Hotels</p><p class="font-display text-5xl">{{ hotels() }}</p></a>
      <a routerLink="/admin/rooms" class="panel p-5"><p class="kicker">Rooms</p><p class="font-display text-5xl">{{ rooms() }}</p></a>
      <a routerLink="/admin/trips" class="panel p-5"><p class="kicker">Trips</p><p class="font-display text-5xl">{{ trips() }}</p></a>
      <a routerLink="/admin/transport" class="panel p-5"><p class="kicker">Transport</p><p class="font-display text-5xl">{{ transport() }}</p></a>
      <a routerLink="/admin/events" class="panel p-5"><p class="kicker">Events</p><p class="font-display text-5xl">{{ events() }}</p></a>
      <a routerLink="/admin/packages" class="panel p-5"><p class="kicker">Packages</p><p class="font-display text-5xl">{{ packages() }}</p></a>
      <a routerLink="/admin/bookings" class="panel p-5"><p class="kicker">Bookings</p><p class="font-display text-5xl">{{ bookings() }}</p></a>
      <a routerLink="/admin/partners" class="panel p-5"><p class="kicker">Partners</p><p class="font-display text-5xl">{{ partners() }}</p></a>
      <a routerLink="/admin/users" class="panel p-5"><p class="kicker">Users</p><p class="font-display text-5xl">{{ users() }}</p></a>
      <a routerLink="/admin/currency" class="panel p-5"><p class="kicker">Currency</p><p class="font-display text-5xl">{{ currency.applied() }}</p></a>
    </div>
  `,
})
export class DashboardPage {
  readonly currency = inject(CurrencyService);
  readonly hotels = signal(0);
  readonly rooms = signal(0);
  readonly trips = signal(0);
  readonly transport = signal(0);
  readonly events = signal(0);
  readonly packages = signal(0);
  readonly bookings = signal(0);
  readonly partners = signal(0);
  readonly users = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Admin · Plaza Inn');
    const api = inject(ApiService);
    forkJoin({
      hotels: keepList(api.hotels()),
      rooms: keepList(api.rooms()),
      trips: keepList(api.trips()),
      transport: keepList(api.transports()),
      events: keepList(api.events()),
      packages: keepList(api.packages()),
      bookings: keepList(api.adminBookings()),
      partners: keepList(api.partners()),
      users: keepList(api.users()),
    }).subscribe({
      next: (data) => {
        this.hotels.set(data.hotels.length);
        this.rooms.set(data.rooms.length);
        this.trips.set(data.trips.length);
        this.transport.set(data.transport.length);
        this.events.set(data.events.length);
        this.packages.set(data.packages.length);
        this.bookings.set(data.bookings.length);
        this.partners.set(data.partners.length);
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
