import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';
import { extractIds } from '../core/media';
import { HomeSlider, PlazaInnType } from '../core/models';

@Component({
  selector: 'app-sliders-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sliders.page.html',
})
export class SlidersPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  readonly slides = signal<HomeSlider[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly imageIds = signal<number[]>([]);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    tittle: ['', Validators.required],
    subTittle: [''],
    buttonText: [''],
    buttonLink: [''],
  });

  constructor() {
    inject(Title).setTitle('Homepage · Admin');
    this.load();
  }

  edit(slide: HomeSlider): void {
    this.editingId.set(slide.id);
    this.form.patchValue({
      tittle: slide.tittle ?? '',
      subTittle: slide.subTittle ?? '',
      buttonText: slide.buttonText ?? '',
      buttonLink: slide.buttonLink ?? '',
    });
    this.imageIds.set((slide.images ?? []).map((image) => image.id));
  }

  reset(): void {
    this.editingId.set(null);
    this.imageIds.set([]);
    this.form.reset();
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) {
      return;
    }
    this.api.upload(PlazaInnType.HomeSlider, files).subscribe({
      next: (payload) => {
        this.imageIds.update((current) => [...new Set([...current, ...extractIds(payload)])]);
        input.value = '';
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = { ...this.form.getRawValue(), imagesId: this.imageIds() };
    this.saving.set(true);
    const id = this.editingId();
    const request = id == null ? this.api.createSlider(body) : this.api.updateSlider(id, body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.success('Homepage slide saved.');
        this.reset();
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }

  remove(slide: HomeSlider): void {
    if (!confirm('Delete this slide?')) {
      return;
    }
    this.api.deleteSlider(slide.id).subscribe({
      next: () => {
        this.notice.success('Slide deleted.');
        this.load();
      },
      error: (error) => this.notice.error(errorMessage(error)),
    });
  }

  private load(): void {
    this.api.sliders().subscribe({
      next: (slides) => this.slides.set(slides),
      error: (error) => this.error.set(errorMessage(error)),
    });
  }
}
