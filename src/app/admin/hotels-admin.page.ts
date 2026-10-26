import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';
import { Hotel } from '../core/models';

@Component({
  selector: 'app-hotels-admin-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="kicker">Catalog</p>
        <h1 class="font-display text-5xl">Hotels</h1>
      </div>
      <a class="btn btn-gold" routerLink="/admin/hotels/new">New hotel</a>
    </div>
    <form class="panel mb-4 flex flex-col gap-3 p-4 sm:flex-row" (ngSubmit)="applySearch($event)">
      <label class="field flex-1">Search <input name="q" [value]="query()" /></label>
      <button class="btn btn-gold self-end" type="submit">Search</button>
    </form>
    @if (loading()) {
      <p role="status">Loading hotels…</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else if (!visible().length) {
      <p>No hotels match this search.</p>
    } @else {
      <div class="grid gap-3">
        @for (hotel of visible(); track hotel.id) {
          <article class="panel flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
            <div>
              <h2 class="font-display text-3xl">{{ hotel.name }}</h2>
              <p class="text-sm text-gold-200/80">{{ hotel.city }} · {{ hotel.phone }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              @if (hotel.id) {
                <a class="btn btn-line" [routerLink]="['/hotels', hotel.id]">View</a>
              }
              <a class="btn btn-line" [routerLink]="['/admin/hotels', hotel.id]">Edit</a>
              <a class="btn btn-line" [routerLink]="['/admin/insight', hotel.id]">Dining</a>
              <button type="button" class="btn btn-danger" (click)="remove(hotel)">Delete</button>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class HotelsAdminPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  readonly hotels = signal<Hotel[]>([]);
  readonly query = signal('');
  readonly visible = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) {
      return this.hotels();
    }
    return this.hotels().filter((hotel) =>
      `${hotel.name ?? ''} ${hotel.nameAr ?? ''} ${hotel.city ?? ''} ${hotel.cityAr ?? ''} ${hotel.phone ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  });
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Hotels · Admin');
    this.load();
  }

  applySearch(event: Event): void {
    const data = new FormData(event.target as HTMLFormElement);
    this.query.set(String(data.get('q') ?? ''));
  }

  remove(hotel: Hotel): void {
    if (!hotel.id || !confirm(`Delete ${hotel.name ?? 'this hotel'}?`)) {
      return;
    }
    this.api.deleteHotel(hotel.id).subscribe({
      next: () => {
        this.notice.success('Hotel deleted.');
        this.load();
      },
      error: (error) => this.notice.error(errorMessage(error)),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.hotels().subscribe({
      next: (hotels) => {
        this.hotels.set(hotels);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }
}
