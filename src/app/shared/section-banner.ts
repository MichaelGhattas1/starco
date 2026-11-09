import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { mediaUrl } from '../core/media';
import { PlazaInnType } from '../core/models';

@Component({
  selector: 'app-section-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (urls().length) {
      <div class="mb-6 flex gap-3 overflow-x-auto pb-1" [attr.aria-label]="locale.t('admin.sectionPhotos')">
        @for (url of urls(); track url; let index = $index) {
          <img
            class="h-44 w-72 shrink-0 rounded-[1.4rem] object-cover sm:h-56 sm:w-[22rem]"
            [src]="url"
            [alt]="locale.t('action.photo', { n: index + 1 })"
            loading="lazy"
          />
        }
      </div>
    }
  `,
})
export class SectionBanner {
  readonly type = input.required<PlazaInnType>();
  readonly locale = inject(LocaleService);
  private readonly api = inject(ApiService);
  readonly urls = signal<string[]>([]);

  constructor() {
    toObservable(this.type)
      .pipe(
        switchMap((type) => this.api.sectionImages(type).pipe(catchError(() => of([])))),
        takeUntilDestroyed(),
      )
      .subscribe((files) => {
        this.urls.set(
          files.flatMap((file) => {
            const url = mediaUrl(file.url);
            return url ? [url] : [];
          }),
        );
      });
  }
}
