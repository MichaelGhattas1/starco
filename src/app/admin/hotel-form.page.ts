import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';
import { extractIds } from '../core/media';
import { PlazaInnType } from '../core/models';

@Component({
  selector: 'app-hotel-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hotel-form.page.html',
})
export class HotelFormPage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notice = inject(NoticeService);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hotelId = signal<string | null>(null);
  readonly imageIds = signal<number[]>([]);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    nameAr: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    descriptionAr: ['', [Validators.required, Validators.maxLength(500)]],
    address: ['', [Validators.required, Validators.maxLength(200)]],
    addressAr: ['', [Validators.required, Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.maxLength(50)]],
    cityAr: ['', [Validators.required, Validators.maxLength(50)]],
    location: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\d{6,15}$/)]],
    email: ['', [Validators.required, Validators.email]],
    numOfAvailableRoomsToReserve: [1, [Validators.required, Validators.min(0)]],
    numOfAvailableSuitesToReserve: [0, [Validators.required, Validators.min(0)]],
    rating: [0, Validators.min(0)],
    instagram: [''],
    facebook: [''],
    whatsApp: [''],
    space: [''],
    logoId: [0],
  });

  constructor() {
    inject(Title).setTitle('Hotel form · Admin');
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      this.hotelId.set(id);
      if (!id) {
        return;
      }
      this.api.hotel(id).subscribe({
        next: (hotel) => {
          this.form.patchValue({
            name: hotel.name ?? '',
            nameAr: hotel.nameAr ?? '',
            description: hotel.description ?? '',
            descriptionAr: hotel.descriptionAr ?? '',
            address: hotel.address ?? '',
            addressAr: hotel.addressAr ?? '',
            city: hotel.city ?? '',
            cityAr: hotel.cityAr ?? '',
            location: hotel.location ?? '',
            phone: hotel.phone ?? '',
            email: hotel.email ?? '',
            numOfAvailableRoomsToReserve: hotel.numOfAvailableRoomsToReserve ?? 0,
            numOfAvailableSuitesToReserve: hotel.numOfAvailableSuitesToReserve ?? 0,
            rating: hotel.rating ?? 0,
            instagram: hotel.instagram ?? '',
            facebook: hotel.facebook ?? '',
            whatsApp: hotel.whatsApp ?? '',
            space: hotel.space ?? '',
            logoId: hotel.logo?.id ?? 0,
          });
          this.imageIds.set((hotel.images ?? []).map((image) => image.id));
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
    });
  }

  upload(event: Event, kind: 'images' | 'logo'): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) {
      return;
    }
    this.uploading.set(true);
    const type = kind === 'logo' ? PlazaInnType.Logo : PlazaInnType.Hotel;
    this.api.upload(type, files).subscribe({
      next: (payload) => {
        const ids = extractIds(payload);
        if (!ids.length) {
          this.error.set('Upload finished, but no image id came back. Enter the id manually.');
        } else if (kind === 'logo') {
          this.form.controls.logoId.setValue(ids[0]);
        } else {
          this.imageIds.update((current) => [...new Set([...current, ...ids])]);
        }
        this.uploading.set(false);
        input.value = '';
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.uploading.set(false);
      },
    });
  }

  removeImage(id: number): void {
    this.imageIds.update((current) => current.filter((item) => item !== id));
  }

  submit(): void {
    if (this.form.invalid || !this.imageIds().length) {
      this.form.markAllAsTouched();
      this.error.set(this.imageIds().length ? 'Check the required fields.' : 'Upload at least one hotel image.');
      return;
    }
    const value = this.form.getRawValue();
    const body = {
      ...value,
      instagram: value.instagram || null,
      facebook: value.facebook || null,
      whatsApp: value.whatsApp || null,
      space: value.space || null,
      imageIds: this.imageIds(),
    };
    this.saving.set(true);
    this.error.set(null);
    const id = this.hotelId();
    const request = id ? this.api.updateHotel(id, body) : this.api.createHotel(body);
    request.subscribe({
      next: () => {
        this.notice.success(id ? 'Hotel updated.' : 'Hotel created.');
        void this.router.navigate(['/admin/hotels']);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.saving.set(false);
      },
    });
  }
}
