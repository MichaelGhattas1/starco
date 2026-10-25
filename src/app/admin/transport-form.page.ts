import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { firstPhotoProblem, PHOTO_RULES } from '../core/image-file';
import { extractIds } from '../core/media';
import { PlazaInnType, TransportWrite } from '../core/models';
import { CurrencyService, applyStoredUsd } from '../core/currency.service';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-transport-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/transport" class="text-sm text-gold-300">All transport</a>
    <h1 class="mt-2 font-display text-5xl">{{ itemId() ? 'Edit transport' : 'New transport' }}</h1>
    <form class="mt-6 grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="field">English name <input formControlName="name" /></label>
        <label class="field">Arabic name <input formControlName="nameAr" dir="rtl" /></label>
        <label class="field">Vehicle <input formControlName="vehicleType" /></label>
        <label class="field">Arabic vehicle <input formControlName="vehicleTypeAr" dir="rtl" /></label>
        <label class="field">Pickup <input formControlName="pickupLocation" /></label>
        <label class="field">Arabic pickup <input formControlName="pickupLocationAr" dir="rtl" /></label>
        <label class="field">Drop-off <input formControlName="dropoffLocation" /></label>
        <label class="field">Arabic drop-off <input formControlName="dropoffLocationAr" dir="rtl" /></label>
        <label class="field">Passengers <input type="number" min="1" formControlName="maxPassengers" /></label>
        <label class="field">Luggage <input type="number" min="0" formControlName="maxLuggage" /></label>
        <div>
          <label class="field">Price / trip (USD)
            @if (pricesReady()) {
              <input type="number" min="0.01" step="0.01" formControlName="pricePerTrip" />
            } @else {
              <span>Loading the USD price…</span>
            }
          </label>
          @if (pricesReady()) {
            <p class="mt-1 text-xs text-gold-200/70">{{ currency.usdInputNote(form.controls.pricePerTrip.value) }}</p>
          }
        </div>
        <label class="field">Vehicles <input type="number" min="1" formControlName="availableVehicles" /></label>
      </div>
      <label class="field">Description <textarea rows="4" formControlName="description"></textarea></label>
      <label class="field">Arabic description <textarea rows="4" formControlName="descriptionAr" dir="rtl"></textarea></label>
      <label class="flex items-center gap-2"><input type="checkbox" formControlName="isActive" /> Active</label>
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
      <button class="btn btn-gold" type="submit" [disabled]="saving() || uploading() || !pricesReady()">{{ saving() ? 'Saving…' : 'Save transport' }}</button>
    </form>
  `,
})
export class TransportFormPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notice = inject(NoticeService);
  readonly currency = inject(CurrencyService);
  private readonly storedUsd = signal<Record<string, number> | null>(null);
  private readonly priceLoading = signal(false);
  readonly pricesReady = computed(() => this.currency.canUse('USD') && !this.priceLoading());
  readonly rules = PHOTO_RULES;
  readonly itemId = signal<string | null>(null);
  readonly imageIds = signal<number[]>([]);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    nameAr: ['', Validators.required],
    description: ['', Validators.required],
    descriptionAr: ['', Validators.required],
    vehicleType: ['', Validators.required],
    vehicleTypeAr: ['', Validators.required],
    pickupLocation: ['', Validators.required],
    pickupLocationAr: ['', Validators.required],
    dropoffLocation: ['', Validators.required],
    dropoffLocationAr: ['', Validators.required],
    maxPassengers: [1, [Validators.required, Validators.min(1)]],
    maxLuggage: [0, [Validators.required, Validators.min(0)]],
    pricePerTrip: [0.01, [Validators.required, Validators.min(0.01)]],
    availableVehicles: [1, [Validators.required, Validators.min(1)]],
    isActive: true,
  });

  constructor() {
    applyStoredUsd(
      this.currency,
      (values) => this.form.patchValue(values),
      ['pricePerTrip'],
      () => this.storedUsd(),
      () => {
        this.storedUsd.set(null);
        this.priceLoading.set(false);
      },
    );
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
    this.priceLoading.set(!!id);
    inject(Title).setTitle(id ? 'Edit transport · Admin' : 'New transport · Admin');
    if (!id) {
      return;
    }
    this.itemId.set(id);
    this.api.transport(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          name: item.name ?? '',
          nameAr: item.nameAr ?? '',
          description: item.description ?? '',
          descriptionAr: item.descriptionAr ?? '',
          vehicleType: item.vehicleType ?? '',
          vehicleTypeAr: item.vehicleTypeAr ?? '',
          pickupLocation: item.pickupLocation ?? '',
          pickupLocationAr: item.pickupLocationAr ?? '',
          dropoffLocation: item.dropoffLocation ?? '',
          dropoffLocationAr: item.dropoffLocationAr ?? '',
          maxPassengers: item.maxPassengers,
          maxLuggage: item.maxLuggage,
          availableVehicles: item.availableVehicles,
          isActive: item.isActive,
        });
        this.storedUsd.set({ pricePerTrip: item.pricePerTrip });
        this.imageIds.set((item.images ?? []).flatMap((file) => (file.id == null ? [] : [file.id])));
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
      this.api.upload(PlazaInnType.Transport, files).subscribe({
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
      this.error.set('Check the required fields. Price must be at least 0.01.');
      return;
    }
    const value = this.form.getRawValue();
    const pricePerTrip = this.currency.toEgpAmount(value.pricePerTrip);
    if (pricePerTrip == null || this.priceLoading()) {
      this.error.set('A live USD rate is required before this price can be saved.');
      return;
    }
    const body: TransportWrite = {
      name: value.name.trim(),
      nameAr: value.nameAr.trim(),
      description: value.description.trim(),
      descriptionAr: value.descriptionAr.trim(),
      vehicleType: value.vehicleType.trim(),
      vehicleTypeAr: value.vehicleTypeAr.trim(),
      pickupLocation: value.pickupLocation.trim(),
      pickupLocationAr: value.pickupLocationAr.trim(),
      dropoffLocation: value.dropoffLocation.trim(),
      dropoffLocationAr: value.dropoffLocationAr.trim(),
      maxPassengers: Number(value.maxPassengers),
      maxLuggage: Number(value.maxLuggage),
      pricePerTrip,
      availableVehicles: Number(value.availableVehicles),
      isActive: value.isActive,
      imageIds: this.imageIds(),
    };
    if (!body.imageIds.length) {
      this.error.set('Upload at least one photo.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const id = this.itemId();
    const request = id ? this.api.updateTransport(id, body) : this.api.createTransport(body);
    request.subscribe({
      next: () => {
        this.notice.success(id ? 'Transport updated.' : 'Transport created.');
        void this.router.navigate(['/admin/transport']);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.saving.set(false);
      },
    });
  }
}
