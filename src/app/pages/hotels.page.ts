import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { Hotel } from '../core/models';
import { HotelCard } from '../shared/hotel-card';

@Component({
  selector: 'app-hotels-page',
  imports: [HotelCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hotels.page.html',
})
export class HotelsPage {
  private readonly api = inject(ApiService);
  readonly locale = inject(LocaleService);
  readonly hotels = signal<Hotel[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly city = signal('');
  readonly checkIn = signal('');
  readonly checkOut = signal('');
  readonly adults = signal('');
  readonly query = signal('');

  readonly filtered = computed(() => {
    const city = this.city().trim().toLowerCase();
    const query = this.query().trim().toLowerCase();
    return this.hotels().filter((hotel) => {
      const cityName = `${hotel.city ?? ''} ${hotel.cityAr ?? ''}`.toLowerCase();
      const name = `${hotel.name ?? ''} ${hotel.nameAr ?? ''}`.toLowerCase();
      const cityOk = !city || cityName.includes(city);
      const queryOk = !query || name.includes(query) || cityName.includes(query);
      return cityOk && queryOk;
    });
  });

  constructor() {
    inject(Title).setTitle('Hotels · Plaza Inn');
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.city.set(params.get('city') ?? '');
        this.checkIn.set(params.get('checkIn') ?? '');
        this.checkOut.set(params.get('checkOut') ?? '');
        this.adults.set(params.get('adults') ?? '');
        this.query.set(params.get('q') ?? '');
      });
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

  onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
