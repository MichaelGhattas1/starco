import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { mediaUrl } from '../core/media';
import { AboutUs, PlazaInnType } from '../core/models';
import { SectionBanner } from '../shared/section-banner';

@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SectionBanner],
  templateUrl: './about.page.html',
})
export class AboutPage {
  private readonly api = inject(ApiService);
  readonly locale = inject(LocaleService);
  readonly section = PlazaInnType;
  readonly about = signal<AboutUs | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mediaUrl = mediaUrl;

  constructor() {
    inject(Title).setTitle('About · Plaza Inn');
    this.api.about().subscribe({
      next: (about) => {
        this.about.set(about);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  image(value: AboutUs['square1ImageId']): string | null {
    if (value && typeof value === 'object') {
      return mediaUrl(value.url);
    }
    return null;
  }
}
