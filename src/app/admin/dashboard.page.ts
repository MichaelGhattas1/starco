import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="kicker">Desk</p>
    <h1 class="font-display text-5xl">Dashboard</h1>
    <p class="mt-2 max-w-2xl text-sm text-gold-200/80">
      Create, update, and delete are limited to the admin role. Guests reserve with a signed-in account. The Plaza API does not offer a list of those bookings.
    </p>
    @if (error()) {
      <p class="mt-4 text-red-200" role="alert">{{ error() }}</p>
    }
    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <a routerLink="/admin/hotels" class="panel p-5"><p class="kicker">Hotels</p><p class="font-display text-5xl">{{ hotels() }}</p></a>
      <a routerLink="/admin/rooms" class="panel p-5"><p class="kicker">Rooms</p><p class="font-display text-5xl">{{ rooms() }}</p></a>
      <a routerLink="/admin/partners" class="panel p-5"><p class="kicker">Partners</p><p class="font-display text-5xl">{{ partners() }}</p></a>
      <a routerLink="/admin/users" class="panel p-5"><p class="kicker">Users</p><p class="font-display text-5xl">{{ users() }}</p></a>
    </div>
  `,
})
export class DashboardPage {
  readonly hotels = signal(0);
  readonly rooms = signal(0);
  readonly partners = signal(0);
  readonly users = signal(0);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Admin · Plaza Inn');
    const api = inject(ApiService);
    forkJoin({
      hotels: api.hotels(),
      rooms: api.rooms(),
      partners: api.partners(),
      users: api.users(),
    }).subscribe({
      next: (data) => {
        this.hotels.set(data.hotels.length);
        this.rooms.set(data.rooms.length);
        this.partners.set(data.partners.length);
        this.users.set(data.users.length);
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }
}
