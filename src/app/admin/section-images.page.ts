import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { firstPhotoProblem, PHOTO_RULES } from '../core/image-file';
import { extractIds, mediaUrl } from '../core/media';
import { FileDto, PlazaInnType } from '../core/models';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-section-images-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5">
      <p class="kicker">Media</p>
      <h1 class="font-display text-5xl">Section photos</h1>
    </div>
    <label class="field max-w-sm">
      Section
      <select (change)="choose($event)">
        @for (option of types; track option.value) {
          <option [value]="option.value" [selected]="option.value === type()">{{ option.label }}</option>
        }
      </select>
    </label>
    <p class="mt-4 text-sm text-gold-200/80">{{ rules }}</p>
    <input class="mt-2" type="file" accept="image/jpeg,image/png,image/webp" multiple (change)="upload($event)" />
    @if (loading()) {
      <p class="mt-4" role="status">Loading photos…</p>
    } @else if (error()) {
      <p class="mt-4 text-red-200" role="alert">{{ error() }}</p>
    } @else if (!files().length) {
      <p class="mt-4">This section has no photos yet.</p>
    } @else {
      <ul class="mt-4 grid gap-3 sm:grid-cols-2">
        @for (file of files(); track file.id) {
          <li class="panel overflow-hidden">
            @if (src(file); as url) {
              <img class="h-40 w-full object-cover" [src]="url" alt="" />
            }
            <div class="flex items-center justify-between gap-3 p-3">
              <span>Photo {{ file.id }}</span>
              <button type="button" class="btn btn-danger" (click)="remove(file.id)">Remove</button>
            </div>
          </li>
        }
      </ul>
    }
    <button class="btn btn-gold mt-4" type="button" [disabled]="saving()" (click)="save()">
      {{ saving() ? 'Saving…' : 'Save section' }}
    </button>
  `,
})
export class SectionImagesPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  readonly rules = PHOTO_RULES;
  readonly types = [
    { value: PlazaInnType.Hotel, label: 'Hotels' },
    { value: PlazaInnType.Room, label: 'Rooms' },
    { value: PlazaInnType.Restaurant, label: 'Restaurant' },
    { value: PlazaInnType.Cafe, label: 'Cafe' },
    { value: PlazaInnType.HomeSlider, label: 'Homepage' },
    { value: PlazaInnType.AboutUs, label: 'About' },
    { value: PlazaInnType.Trip, label: 'Trips' },
    { value: PlazaInnType.Transport, label: 'Transport' },
    { value: PlazaInnType.Event, label: 'Events' },
    { value: PlazaInnType.Package, label: 'Packages' },
  ];
  readonly type = signal(PlazaInnType.HomeSlider);
  readonly files = signal<FileDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Section photos · Admin');
    this.load();
  }

  src(file: FileDto): string | null {
    return mediaUrl(file.url);
  }

  choose(event: Event): void {
    this.type.set(Number((event.target as HTMLSelectElement).value));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.sectionImages(this.type()).subscribe({
      next: (files) => {
        this.files.set(files);
        this.loading.set(false);
      },
      error: (error) => {
        this.files.set([]);
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    if (!picked.length) {
      return;
    }
    void firstPhotoProblem(picked).then((problem) => {
      if (problem) {
        this.error.set(problem);
        input.value = '';
        return;
      }
      this.api.upload(this.type(), picked).subscribe({
        next: (payload) => {
          const ids = extractIds(payload);
          this.files.update((current) => [...current, ...ids.map((id) => ({ id, url: null }))]);
          input.value = '';
          this.error.set(null);
        },
        error: (error) => this.error.set(errorMessage(error)),
      });
    });
  }

  remove(id: number): void {
    this.files.update((current) => current.filter((file) => file.id !== id));
  }

  save(): void {
    this.saving.set(true);
    this.api.updateSectionImages(this.type(), this.files().map((file) => file.id)).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.success('Section photos saved.');
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.notice.error(errorMessage(error));
      },
    });
  }
}
