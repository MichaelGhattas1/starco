import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { firstPhotoProblem, PHOTO_RULES } from '../core/image-file';
import { LocaleService } from '../core/locale.service';
import { extractIds, fromApiDate, toApiDateTime } from '../core/media';
import { CatalogLookup, HotelLookup, PackageWrite, PlazaInnType, Room } from '../core/models';
import { CurrencyService, applyStoredUsd } from '../core/currency.service';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-package-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/packages" class="text-sm text-gold-300">All packages</a>
    <h1 class="mt-2 font-display text-5xl">{{ itemId() ? 'Edit package' : 'New package' }}</h1>
    <form class="mt-6 grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="field">English name <input formControlName="name" /></label>
        <label class="field">Arabic name <input formControlName="nameAr" dir="rtl" /></label>
        <label class="field">Days <input type="number" min="1" max="365" formControlName="durationDays" /></label>
        <div>
          <label class="field">Price (USD)
            @if (pricesReady()) {
              <input type="number" min="0.01" step="0.01" formControlName="packagePrice" />
            } @else {
              <span>Loading the USD price…</span>
            }
          </label>
          @if (pricesReady()) {
            <p class="mt-1 text-xs text-gold-200/70">{{ currency.usdInputNote(form.controls.packagePrice.value) }}</p>
          }
        </div>
        <label class="field">Available <input type="number" min="1" formControlName="maxPackagesAvailable" /></label>
        <label class="field">Nights <input type="number" min="0" formControlName="nightsCount" /></label>
        <label class="field">Start <input type="date" formControlName="startDate" /></label>
        <label class="field">End <input type="date" formControlName="endDate" /></label>
        <label class="field">
          Hotel
          <select formControlName="hotelId">
            <option value="">None</option>
            @for (hotel of hotels(); track hotel.id) {
              <option [value]="hotel.id">{{ locale.pick(hotel.name, hotel.nameAr) }}</option>
            }
          </select>
        </label>
        <label class="field">
          Room
          <select formControlName="roomId">
            <option value="">None</option>
            @for (room of rooms(); track room.id) {
              <option [value]="room.id">{{ locale.pick(room.name, room.nameAr) }}</option>
            }
          </select>
        </label>
      </div>
      <label class="field">Description <textarea rows="4" formControlName="description"></textarea></label>
      <label class="field">Arabic description <textarea rows="4" formControlName="descriptionAr" dir="rtl"></textarea></label>
      <label class="flex items-center gap-2"><input type="checkbox" formControlName="isActive" /> Active</label>
      <fieldset class="grid gap-2">
        <legend class="kicker">Trips</legend>
        @for (item of trips(); track item.id) {
          <label class="flex items-center gap-2">
            <input type="checkbox" [checked]="has(tripIds(), item.id)" (change)="toggle(tripIds, item.id)" />
            {{ locale.pick(item.name, item.nameAr) }}
          </label>
        }
      </fieldset>
      <fieldset class="grid gap-2">
        <legend class="kicker">Transport</legend>
        @for (item of transports(); track item.id) {
          <label class="flex items-center gap-2">
            <input type="checkbox" [checked]="has(transportIds(), item.id)" (change)="toggle(transportIds, item.id)" />
            {{ locale.pick(item.name, item.nameAr) }}
          </label>
        }
      </fieldset>
      <fieldset class="grid gap-2">
        <legend class="kicker">Events</legend>
        @for (item of events(); track item.id) {
          <label class="flex items-center gap-2">
            <input type="checkbox" [checked]="has(eventIds(), item.id)" (change)="toggle(eventIds, item.id)" />
            {{ locale.pick(item.name, item.nameAr) }}
          </label>
        }
      </fieldset>
      <div>
        <p class="text-sm text-gold-200/80">{{ rules }}</p>
        <input class="mt-2" type="file" accept="image/jpeg,image/png,image/webp" multiple (change)="upload($event)" />
        <ul class="mt-3 grid gap-2">
          @for (id of imageIds(); track id) {
            <li class="flex items-center justify-between gap-3">
              <span>Photo {{ id }}</span>
              <button type="button" class="btn btn-danger" (click)="removeImage(id)">Remove</button>
            </li>
          }
        </ul>
      </div>
      @if (error()) {
        <p class="text-red-200" role="alert">{{ error() }}</p>
      }
      <button class="btn btn-gold" type="submit" [disabled]="saving() || uploading() || !pricesReady()">{{ saving() ? 'Saving…' : 'Save package' }}</button>
    </form>
  `,
})
export class PackageFormPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notice = inject(NoticeService);
  readonly currency = inject(CurrencyService);
  private readonly storedUsd = signal<Record<string, number> | null>(null);
  private readonly priceLoading = signal(false);
  readonly pricesReady = computed(() => this.currency.canUse('USD') && !this.priceLoading());
  readonly locale = inject(LocaleService);
  readonly rules = PHOTO_RULES;
  readonly itemId = signal<string | null>(null);
  readonly imageIds = signal<number[]>([]);
  readonly hotels = signal<HotelLookup[]>([]);
  readonly rooms = signal<Room[]>([]);
  readonly trips = signal<CatalogLookup[]>([]);
  readonly transports = signal<CatalogLookup[]>([]);
  readonly events = signal<CatalogLookup[]>([]);
  readonly tripIds = signal<string[]>([]);
  readonly transportIds = signal<string[]>([]);
  readonly eventIds = signal<string[]>([]);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    nameAr: ['', Validators.required],
    description: ['', Validators.required],
    descriptionAr: ['', Validators.required],
    durationDays: [1, [Validators.required, Validators.min(1), Validators.max(365)]],
    packagePrice: [0.01, [Validators.required, Validators.min(0.01)]],
    maxPackagesAvailable: [1, [Validators.required, Validators.min(1)]],
    nightsCount: null as number | null,
    startDate: '',
    endDate: '',
    hotelId: '',
    roomId: '',
    isActive: true,
  });

  constructor() {
    applyStoredUsd(
      this.currency,
      (values) => this.form.patchValue(values),
      ['packagePrice'],
      () => this.storedUsd(),
      () => {
        this.storedUsd.set(null);
        this.priceLoading.set(false);
      },
    );
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
    this.priceLoading.set(!!id);
    inject(Title).setTitle(id ? 'Edit package · Admin' : 'New package · Admin');
    this.form.controls.hotelId.valueChanges.pipe(takeUntilDestroyed()).subscribe((hotelId) => {
      this.loadRooms(hotelId);
    });
    this.api.hotelLookup().subscribe({ next: (hotels) => this.hotels.set(hotels), error: () => this.hotels.set([]) });
    this.api.tripLookup().subscribe({ next: (items) => this.trips.set(items), error: () => this.trips.set([]) });
    this.api.transportLookup().subscribe({ next: (items) => this.transports.set(items), error: () => this.transports.set([]) });
    this.api.eventLookup().subscribe({ next: (items) => this.events.set(items), error: () => this.events.set([]) });
    if (!id) {
      return;
    }
    this.itemId.set(id);
    this.api.package(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          name: item.name ?? '',
          nameAr: item.nameAr ?? '',
          description: item.description ?? '',
          descriptionAr: item.descriptionAr ?? '',
          durationDays: item.durationDays,
          maxPackagesAvailable: item.maxPackagesAvailable,
          nightsCount: item.nightsCount,
          startDate: fromApiDate(item.startDate),
          endDate: fromApiDate(item.endDate),
          hotelId: item.hotelId ?? '',
          roomId: item.roomId ?? '',
          isActive: item.isActive,
        });
        this.tripIds.set(idsOf(item.trips));
        this.transportIds.set(idsOf(item.transports));
        this.eventIds.set(idsOf(item.events));
        this.storedUsd.set({ packagePrice: item.packagePrice });
        this.imageIds.set((item.images ?? []).flatMap((file) => (file.id == null ? [] : [file.id])));
        if (item.hotelId) {
          this.loadRooms(item.hotelId, item.roomId);
        }
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  has(ids: string[], id: string | null): boolean {
    return !!id && ids.includes(id);
  }

  toggle(target: { update: (fn: (current: string[]) => string[]) => void }, id: string | null): void {
    if (!id) {
      return;
    }
    target.update((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) {
      return;
    }
    void firstPhotoProblem(files).then((problem) => {
      if (problem) {
        this.error.set(problem);
        input.value = '';
        return;
      }
      this.uploading.set(true);
      this.api.upload(PlazaInnType.Package, files).subscribe({
        next: (payload) => {
          this.imageIds.update((current) => [...new Set([...current, ...extractIds(payload)])]);
          this.uploading.set(false);
          input.value = '';
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.uploading.set(false);
        },
      });
    });
  }

  removeImage(id: number): void {
    this.imageIds.update((current) => current.filter((item) => item !== id));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Check the required fields. Price must be at least 0.01 and duration between 1 and 365 days.');
      return;
    }
    const value = this.form.getRawValue();
    const packagePrice = this.currency.toEgpAmount(value.packagePrice);
    if (packagePrice == null || this.priceLoading()) {
      this.error.set('A live USD rate is required before this price can be saved.');
      return;
    }
    const nights = optionalNights(value.nightsCount);
    if (value.nightsCount != null && nights == null) {
      this.error.set('Nights must be a number.');
      return;
    }
    const body: PackageWrite = {
      name: value.name.trim(),
      nameAr: value.nameAr.trim(),
      description: value.description.trim(),
      descriptionAr: value.descriptionAr.trim(),
      durationDays: Number(value.durationDays),
      packagePrice,
      maxPackagesAvailable: Number(value.maxPackagesAvailable),
      startDate: value.startDate ? toApiDateTime(value.startDate, 12) : null,
      endDate: value.endDate ? toApiDateTime(value.endDate, 12) : null,
      isActive: value.isActive,
      imageIds: this.imageIds(),
      hotelId: value.hotelId || null,
      roomId: value.roomId || null,
      nightsCount: nights,
      tripIds: this.tripIds(),
      transportIds: this.transportIds(),
      eventIds: this.eventIds(),
    };
    if (!body.imageIds.length) {
      this.error.set('Upload at least one photo.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const id = this.itemId();
    const request = id ? this.api.updatePackage(id, body) : this.api.createPackage(body);
    request.subscribe({
      next: () => {
        this.notice.success(id ? 'Package updated.' : 'Package created.');
        void this.router.navigate(['/admin/packages']);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.saving.set(false);
      },
    });
  }

  private loadRooms(hotelId: string, keepRoom: string | null = null): void {
    if (!hotelId) {
      this.rooms.set([]);
      this.form.controls.roomId.setValue('', { emitEvent: false });
      return;
    }
    this.api.roomsByHotel(hotelId).subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        const roomId = keepRoom ?? this.form.controls.roomId.value;
        if (roomId && !rooms.some((room) => room.id === roomId)) {
          this.form.controls.roomId.setValue('', { emitEvent: false });
        }
      },
      error: () => this.rooms.set([]),
    });
  }
}

function idsOf(items: CatalogLookup[] | null): string[] {
  return (items ?? []).flatMap((item) => (item.id ? [item.id] : []));
}

function optionalNights(value: number | string | null): number | null {
  if (value == null || value === '') {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}
