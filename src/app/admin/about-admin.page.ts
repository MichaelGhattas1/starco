import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';
import { extractIds, fileId } from '../core/media';
import { PlazaInnType } from '../core/models';

@Component({
  selector: 'app-about-admin-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="kicker">Story</p>
    <h1 class="font-display text-5xl">About page</h1>
    <form class="mt-5 grid max-w-2xl gap-4" [formGroup]="form" (ngSubmit)="save()">
      <label class="grid gap-1 text-sm">Title<input class="field" formControlName="tittle" /></label>
      <label class="grid gap-1 text-sm">Subtitle<input class="field" formControlName="subTittle" /></label>
      <label class="grid gap-1 text-sm">Description<textarea class="field" rows="4" formControlName="description"></textarea></label>
      <label class="grid gap-1 text-sm">Square image id<input class="field" type="number" formControlName="square1ImageId" /></label>
      <label class="grid gap-1 text-sm">Circle image id<input class="field" type="number" formControlName="circleImageId" /></label>
      <label class="grid gap-1 text-sm">Second square id<input class="field" type="number" formControlName="square2ImageId" /></label>
      <label class="btn btn-line w-fit">Upload about image<input class="sr-only" type="file" accept="image/*" (change)="upload($event)" /></label>
      @if (error()) { <p class="text-red-200" role="alert">{{ error() }}</p> }
      <button class="btn btn-gold w-fit" type="submit" [disabled]="saving()">Save about</button>
    </form>
  `,
})
export class AboutAdminPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    tittle: [''],
    subTittle: [''],
    description: [''],
    square1ImageId: [0],
    circleImageId: [0],
    square2ImageId: [0],
  });

  constructor() {
    inject(Title).setTitle('About · Admin');
    this.api.about().subscribe({
      next: (about) => {
        if (!about) {
          return;
        }
        this.form.patchValue({
          tittle: about.tittle ?? '',
          subTittle: about.subTittle ?? '',
          description: about.description ?? '',
          square1ImageId: fileId(about.square1ImageId) ?? 0,
          circleImageId: fileId(about.circleImageId) ?? 0,
          square2ImageId: fileId(about.square2ImageId) ?? 0,
        });
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
    this.api.upload(PlazaInnType.AboutUs, files).subscribe({
      next: (payload) => {
        const id = extractIds(payload)[0];
        if (id) {
          const empty = ['square1ImageId', 'circleImageId', 'square2ImageId'] as const;
          const target = empty.find((key) => !this.form.controls[key].value) ?? 'square1ImageId';
          this.form.controls[target].setValue(id);
        }
        input.value = '';
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  save(): void {
    this.saving.set(true);
    this.api.updateAbout(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.success('About page saved.');
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }
}
