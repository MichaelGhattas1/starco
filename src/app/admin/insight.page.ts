import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';
import { extractIds, featureLabel } from '../core/media';
import { HOTEL_FACILITIES, HotelLookup, PlazaInnType } from '../core/models';

@Component({
  selector: 'app-insight-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './insight.page.html',
})
export class InsightPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notice = inject(NoticeService);
  readonly featureLabel = featureLabel;
  readonly hotels = signal<HotelLookup[]>([]);
  readonly hotelId = signal<string | null>(null);
  readonly exists = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly facilities = signal<Record<string, boolean>>(blankFacilities());
  readonly restaurantImageIds = signal<number[]>([]);
  readonly cafeImageIds = signal<number[]>([]);
  readonly restaurantMenuPdfIds = signal<number[]>([]);
  readonly cafeMenuPdfIds = signal<number[]>([]);
  readonly newFacility = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    restaurantDescription: [''],
    restaurantDescriptionAr: [''],
    cafeDescription: [''],
    cafeDescriptionAr: [''],
  });

  constructor() {
    inject(Title).setTitle('Dining · Admin');
    this.api.hotelLookup().subscribe({
      next: (hotels) => this.hotels.set(hotels),
      error: (error) => this.error.set(errorMessage(error)),
    });
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const hotelId = params.get('hotelId');
        this.hotelId.set(hotelId);
        if (hotelId) {
          this.load(hotelId);
        }
      });
  }

  facilityEntries(): [string, boolean][] {
    return Object.entries(this.facilities());
  }

  openHotel(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id) {
      void this.router.navigate(['/admin/insight', id]);
    }
  }

  onFacility(event: Event): void {
    this.newFacility.set((event.target as HTMLInputElement).value);
  }

  toggle(key: string): void {
    this.facilities.update((current) => ({ ...current, [key]: !current[key] }));
  }

  addFacility(): void {
    const key = this.newFacility().trim();
    if (!key) {
      return;
    }
    this.facilities.update((current) => ({ ...current, [key]: true }));
    this.newFacility.set('');
  }

  upload(event: Event, target: 'restaurant' | 'cafe' | 'restaurantMenu' | 'cafeMenu'): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) {
      return;
    }
    const type = {
      restaurant: PlazaInnType.Restaurant,
      cafe: PlazaInnType.Cafe,
      restaurantMenu: PlazaInnType.RestaurantMenu,
      cafeMenu: PlazaInnType.CafeMenu,
    }[target];
    this.api.upload(type, files).subscribe({
      next: (payload) => {
        const ids = extractIds(payload);
        const update = (current: number[]) => [...new Set([...current, ...ids])];
        if (target === 'restaurant') this.restaurantImageIds.update(update);
        if (target === 'cafe') this.cafeImageIds.update(update);
        if (target === 'restaurantMenu') this.restaurantMenuPdfIds.update(update);
        if (target === 'cafeMenu') this.cafeMenuPdfIds.update(update);
        input.value = '';
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  save(): void {
    const encodedHotelId = this.hotelId();
    if (!encodedHotelId) {
      return;
    }
    const value = this.form.getRawValue();
    const body = {
      encodedHotelId,
      ...value,
      facilities: this.facilities(),
      restaurantImageIds: this.restaurantImageIds(),
      cafeImageIds: this.cafeImageIds(),
      restaurantMenuPdfIds: this.restaurantMenuPdfIds(),
      cafeMenuPdfIds: this.cafeMenuPdfIds(),
    };
    this.saving.set(true);
    const request = this.exists()
      ? this.api.updateInsight(encodedHotelId, body)
      : this.api.createInsight(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.exists.set(true);
        this.notice.success('Dining details saved.');
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }

  remove(): void {
    const id = this.hotelId();
    if (!id || !confirm('Remove dining details for this hotel?')) {
      return;
    }
    this.api.deleteInsight(id).subscribe({
      next: () => {
        this.exists.set(false);
        this.form.reset();
        this.notice.success('Dining details removed.');
      },
      error: (error) => this.notice.error(errorMessage(error)),
    });
  }

  private load(hotelId: string): void {
    this.api.insight(hotelId).subscribe({
      next: (insight) => {
        this.exists.set(true);
        this.form.patchValue({
          restaurantDescription: insight.restaurantDescription ?? '',
          restaurantDescriptionAr: insight.restaurantDescriptionAr ?? '',
          cafeDescription: insight.cafeDescription ?? '',
          cafeDescriptionAr: insight.cafeDescriptionAr ?? '',
        });
        this.facilities.set({ ...blankFacilities(), ...(insight.facilities ?? {}) });
        this.restaurantImageIds.set((insight.restaurantImageIds ?? []).map((file) => file.id));
        this.cafeImageIds.set((insight.cafeImageIds ?? []).map((file) => file.id));
        this.restaurantMenuPdfIds.set((insight.restaurantMenuPdfIds ?? []).map((file) => file.id));
        this.cafeMenuPdfIds.set((insight.cafeMenuPdfIds ?? []).map((file) => file.id));
      },
      error: () => {
        this.exists.set(false);
        this.form.reset();
        this.facilities.set(blankFacilities());
      },
    });
  }
}

function blankFacilities(): Record<string, boolean> {
  return Object.fromEntries(HOTEL_FACILITIES.map((key) => [key, false]));
}
