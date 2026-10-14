import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { AboutUs, Partner } from '../core/models';

@Component({
  selector: 'app-about-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about.page.html',
})
export class AboutPage {
  private readonly api = inject(ApiService);
  readonly about = signal<AboutUs | null>(null);
  readonly partners = signal<Partner[]>([]);
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
    this.api.partners().subscribe({
      next: (partners) => this.partners.set(partners),
      error: () => this.partners.set([]),
    });
  }

  image(value: AboutUs['square1ImageId']): string | null {
    if (value && typeof value === 'object') {
      return mediaUrl(value.url);
    }
    return null;
  }
}
