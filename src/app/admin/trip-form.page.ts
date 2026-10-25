import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { firstPhotoProblem, PHOTO_RULES } from '../core/image-file';
import { extractIds, fromApiDate, toApiDateTime } from '../core/media';
import { PlazaInnType, TripWrite } from '../core/models';
import { CurrencyService, applyStoredUsd } from '../core/currency.service';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-trip-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/trips" class="text-sm text-gold-300">All trips</a>
    <h1 class="mt-2 font-display text-5xl">{{ tripId() ? 'Edit trip' : 'New trip' }}</h1>
    <form class="mt-6 grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="field">English name <input formControlName="name" /></label>
        <label class="field">Arabic name <input formControlName="nameAr" dir="rtl" /></label>
        <label class="field">City <input formControlName="city" /></label>
        <label class="field">Arabic city <input formControlName="cityAr" dir="rtl" /></label>
      </div>
      <label class="field">Description <textarea rows="4" formControlName="description"></textarea></label>
      <label class="field">Arabic description <textarea rows="4" formControlName="descriptionAr" dir="rtl"></textarea></label>
      <label class="field">Itinerary <textarea rows="4" formControlName="itinerary"></textarea></label>
      <label class="field">Arabic itinerary <textarea rows="4" formControlName="itineraryAr" dir="rtl"></textarea></label>
      <div class="grid gap-4 md:grid-cols-3">
        <label class="field">Days <input type="number" min="0" formControlName="durationDays" /></label>
        <label class="field">Hours <input type="number" min="0" formControlName="durationHours" /></label>
        <label class="field">Capacity <input type="number" min="1" formControlName="maxCapacity" /></label>
        <div>
          <label class="field">Price / person (USD)
            @if (pricesReady()) {
              <input type="number" min="0.01" step="0.01" formControlName="pricePerPerson" />
            } @else {
              <span>Loading the USD price…</span>
            }
          </label>
          @if (pricesReady()) {
            <p class="mt-1 text-xs text-gold-200/70">{{ currency.usdInputNote(form.controls.pricePerPerson.value) }}</p>
          }
        </div>
        <div>
          <label class="field">Price / child (USD)
            @if (pricesReady()) {
              <input type="number" min="0.01" step="0.01" formControlName="pricePerChild" />
            } @else {
              <span>Loading the USD price…</span>
            }
          </label>
          @if (pricesReady()) {
            <p class="mt-1 text-xs text-gold-200/70">{{ currency.usdInputNote(form.controls.pricePerChild.value) }}</p>
          }
        </div>
        <label class="field">Start <input type="date" formControlName="startDate" /></label>
        <label class="field">End <input type="date" formControlName="endDate" /></label>
      </div>
      <label class="flex items-center gap-2">
        <input type="checkbox" formControlName="isActive" />
        Active
      </label>
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
      <button class="btn btn-gold" type="submit" [disabled]="saving() || uploading() || !pricesReady()">
        {{ saving() ? 'Saving…' : 'Save trip' }}
      </button>
    </form>
  `,
})
export class TripFormPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notice = inject(NoticeService);
  readonly currency = inject(CurrencyService);
  private readonly storedUsd = signal<Record<string, number> | null>(null);
  private readonly priceLoading = signal(false);
  readonly pricesReady = computed(() => this.currency.canUse('USD') && !this.priceLoading());
  readonly rules = PHOTO_RULES;
  readonly tripId = signal<string | null>(null);
  readonly imageIds = signal<number[]>([]);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    nameAr: ['', Validators.required],
    description: ['', Validators.required],
    descriptionAr: ['', Validators.required],
    city: ['', Validators.required],
    cityAr: ['', Validators.required],
    itinerary: ['', Validators.required],
    itineraryAr: ['', Validators.required],
    durationDays: [1, [Validators.required, Validators.min(0)]],
    durationHours: [0, [Validators.required, Validators.min(0)]],
    pricePerPerson: [0.01, [Validators.required, Validators.min(0.01)]],
    pricePerChild: [0.01, [Validators.required, Validators.min(0.01)]],
    maxCapacity: [1, [Validators.required, Validators.min(1)]],
    startDate: '',
    endDate: '',
    isActive: true,
  });

  constructor() {
    applyStoredUsd(
      this.currency,
      (values) => this.form.patchValue(values),
      ['pricePerPerson', 'pricePerChild'],
      () => this.storedUsd(),
      () => {
        this.storedUsd.set(null);
        this.priceLoading.set(false);
      },
    );
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
    this.priceLoading.set(!!id);
    inject(Title).setTitle(id ? 'Edit trip · Admin' : 'New trip · Admin');
    if (!id) {
      return;
    }
    this.tripId.set(id);
    this.api.trip(id).subscribe({
      next: (trip) => {
        this.form.patchValue({
          name: trip.name ?? '',
          nameAr: trip.nameAr ?? '',
          description: trip.description ?? '',
          descriptionAr: trip.descriptionAr ?? '',
          city: trip.city ?? '',
          cityAr: trip.cityAr ?? '',
          itinerary: trip.itinerary ?? '',
          itineraryAr: trip.itineraryAr ?? '',
          durationDays: trip.durationDays,
          durationHours: trip.durationHours,
          maxCapacity: trip.maxCapacity,
          startDate: fromApiDate(trip.startDate),
          endDate: fromApiDate(trip.endDate),
          isActive: trip.isActive,
        });
        this.storedUsd.set({
          pricePerPerson: trip.pricePerPerson,
          pricePerChild: trip.pricePerChild,
        });
        this.imageIds.set((trip.images ?? []).flatMap((file) => (file.id == null ? [] : [file.id])));
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
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
      this.api.upload(PlazaInnType.Trip, files).subscribe({
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
      this.error.set('Check the required fields. Prices must be at least 0.01 and capacity at least 1.');
      return;
    }
    const value = this.form.getRawValue();
    const pricePerPerson = this.currency.toEgpAmount(value.pricePerPerson);
    const pricePerChild = this.currency.toEgpAmount(value.pricePerChild);
    if (pricePerPerson == null || pricePerChild == null || this.priceLoading()) {
      this.error.set('A live USD rate is required before this price can be saved.');
      return;
    }
    const body: TripWrite = {
      name: value.name.trim(),
      nameAr: value.nameAr.trim(),
      description: value.description.trim(),
      descriptionAr: value.descriptionAr.trim(),
      city: value.city.trim(),
      cityAr: value.cityAr.trim(),
      itinerary: value.itinerary.trim(),
      itineraryAr: value.itineraryAr.trim(),
      durationDays: Number(value.durationDays),
      durationHours: Number(value.durationHours),
      pricePerPerson,
      pricePerChild,
      maxCapacity: Number(value.maxCapacity),
      startDate: value.startDate ? toApiDateTime(value.startDate, 12) : null,
      endDate: value.endDate ? toApiDateTime(value.endDate, 12) : null,
      isActive: value.isActive,
      imageIds: this.imageIds(),
    };
    if (!body.imageIds.length) {
      this.error.set('Upload at least one photo.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const id = this.tripId();
    const request = id ? this.api.updateTrip(id, body) : this.api.createTrip(body);
    request.subscribe({
      next: () => {
        this.notice.success(id ? 'Trip updated.' : 'Trip created.');
        void this.router.navigate(['/admin/trips']);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.saving.set(false);
      },
    });
  }
}
