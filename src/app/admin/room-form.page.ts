import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';
import { firstPhotoProblem } from '../core/image-file';
import { extractIds, featureLabel } from '../core/media';
import { HotelLookup, PlazaInnType, ROOM_FEATURES, ROOM_TYPE_OPTIONS, RoomType } from '../core/models';

@Component({
  selector: 'app-room-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './room-form.page.html',
})
export class RoomFormPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notice = inject(NoticeService);
  readonly roomTypes = ROOM_TYPE_OPTIONS;
  readonly featureKeys = ROOM_FEATURES;
  readonly featureLabel = featureLabel;
  readonly hotels = signal<HotelLookup[]>([]);
  readonly roomId = signal<string | null>(null);
  readonly imageIds = signal<number[]>([]);
  readonly features = signal<Record<string, boolean>>(blankFeatures());
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    hotelId: ['', Validators.required],
    name: ['', Validators.required],
    nameAr: ['', Validators.required],
    type: [RoomType.Double, Validators.required],
    pricePerNight: [1, [Validators.required, Validators.min(1)]],
    extraBed: [false],
    priceForExtraBed: [0, Validators.min(0)],
    maxSleep: [2, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    inject(Title).setTitle('Room form · Admin');
    const route = inject(ActivatedRoute);
    this.api.hotelLookup().subscribe({
      next: (hotels) => this.hotels.set(hotels),
      error: (error) => this.error.set(errorMessage(error)),
    });
    route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      this.roomId.set(id);
      if (!id) {
        return;
      }
      forkJoin({ room: this.api.room(id), hotels: this.api.hotelLookup() }).subscribe({
        next: ({ room, hotels }) => {
          this.hotels.set(hotels);
          const hotel = hotels.find((item) => item.name === room.hotelName);
          this.form.patchValue({
            hotelId: hotel?.id ?? '',
            name: room.name ?? '',
            nameAr: room.nameAr ?? '',
            type: room.type ?? RoomType.Double,
            pricePerNight: room.pricePerNight || 1,
            extraBed: room.extraBed,
            priceForExtraBed: room.priceForExtraBed || 0,
            maxSleep: room.maxSleep || 1,
          });
          this.features.set({ ...blankFeatures(), ...(room.features ?? {}) });
          this.imageIds.set((room.images ?? []).map((image) => image.id));
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
    });
  }

  toggle(key: string): void {
    this.features.update((current) => ({ ...current, [key]: !current[key] }));
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
      this.sendRoomImages(input, files);
    });
  }

  private sendRoomImages(input: HTMLInputElement, files: File[]): void {
    this.api.upload(PlazaInnType.Room, files).subscribe({
      next: (payload) => {
        const ids = extractIds(payload);
        this.imageIds.update((current) => [...new Set([...current, ...ids])]);
        if (!ids.length) {
          this.error.set('Upload finished without an image id.');
        }
        input.value = '';
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  removeImage(id: number): void {
    this.imageIds.update((current) => current.filter((item) => item !== id));
  }

  submit(): void {
    if (this.form.invalid || !this.imageIds().length) {
      this.form.markAllAsTouched();
      this.error.set(this.imageIds().length ? 'Check the required fields.' : 'Upload at least one room image.');
      return;
    }
    const value = this.form.getRawValue();
    const body = { ...value, features: this.features(), imageIds: this.imageIds() };
    this.saving.set(true);
    const id = this.roomId();
    const request = id ? this.api.updateRoom(id, body) : this.api.createRoom(body);
    request.subscribe({
      next: () => {
        this.notice.success(id ? 'Room updated.' : 'Room created.');
        void this.router.navigate(['/admin/rooms']);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.saving.set(false);
      },
    });
  }
}

function blankFeatures(): Record<string, boolean> {
  return Object.fromEntries(ROOM_FEATURES.map((key) => [key, false]));
}
