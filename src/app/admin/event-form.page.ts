import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { firstPhotoProblem, PHOTO_RULES } from '../core/image-file';
import { extractIds, fromApiDate, toApiDateTime } from '../core/media';
import { EventWrite, PlazaInnType } from '../core/models';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-event-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/events" class="text-sm text-gold-300">All events</a>
    <h1 class="mt-2 font-display text-5xl">{{ itemId() ? 'Edit event' : 'New event' }}</h1>
    <form class="mt-6 grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="field">English name <input formControlName="name" /></label>
        <label class="field">Arabic name <input formControlName="nameAr" dir="rtl" /></label>
        <label class="field">Location <input formControlName="location" /></label>
        <label class="field">Arabic location <input formControlName="locationAr" dir="rtl" /></label>
        <label class="field">Starts <input type="date" formControlName="eventDate" /></label>
        <label class="field">Ends <input type="date" formControlName="endDate" /></label>
        <label class="field">Ticket price (EGP) <input type="number" min="0.01" step="0.01" formControlName="ticketPrice" /></label>
        <label class="field">Tickets <input type="number" min="1" formControlName="totalTickets" /></label>
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
      <button class="btn btn-gold" type="submit" [disabled]="saving() || uploading()">{{ saving() ? 'Saving…' : 'Save event' }}</button>
    </form>
  `,
})
export class EventFormPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notice = inject(NoticeService);
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
    location: ['', Validators.required],
    locationAr: ['', Validators.required],
    eventDate: ['', Validators.required],
    endDate: '',
    ticketPrice: [0.01, [Validators.required, Validators.min(0.01)]],
    totalTickets: [1, [Validators.required, Validators.min(1)]],
    isActive: true,
  });

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
    inject(Title).setTitle(id ? 'Edit event · Admin' : 'New event · Admin');
    if (!id) {
      return;
    }
    this.itemId.set(id);
    this.api.event(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          name: item.name ?? '',
          nameAr: item.nameAr ?? '',
          description: item.description ?? '',
          descriptionAr: item.descriptionAr ?? '',
          location: item.location ?? '',
          locationAr: item.locationAr ?? '',
          eventDate: fromApiDate(item.eventDate),
          endDate: fromApiDate(item.endDate),
          ticketPrice: item.ticketPrice,
          totalTickets: item.totalTickets,
          isActive: item.isActive,
        });
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
      this.api.upload(PlazaInnType.Event, files).subscribe({
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
      this.error.set('Check the required fields. Ticket price must be at least 0.01.');
      return;
    }
    const value = this.form.getRawValue();
    const body: EventWrite = {
      name: value.name.trim(),
      nameAr: value.nameAr.trim(),
      description: value.description.trim(),
      descriptionAr: value.descriptionAr.trim(),
      location: value.location.trim(),
      locationAr: value.locationAr.trim(),
      eventDate: toApiDateTime(value.eventDate, 12),
      endDate: value.endDate ? toApiDateTime(value.endDate, 12) : null,
      ticketPrice: Number(value.ticketPrice),
      totalTickets: Number(value.totalTickets),
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
    const request = id ? this.api.updateEvent(id, body) : this.api.createEvent(body);
    request.subscribe({
      next: () => {
        this.notice.success(id ? 'Event updated.' : 'Event created.');
        void this.router.navigate(['/admin/events']);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.saving.set(false);
      },
    });
  }
}
