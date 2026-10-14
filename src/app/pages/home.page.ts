import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { firstImage, inputDate, mediaUrl, nextDate } from '../core/media';
import { AboutUs, HomeSlider, Hotel } from '../core/models';
import { ContactSection } from '../shared/contact-section';
import { HotelCard } from '../shared/hotel-card';

@Component({
  selector: 'app-home-page',
  imports: [ReactiveFormsModule, RouterLink, HotelCard, ContactSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
})
export class HomePage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly locale = inject(LocaleService);

  readonly sliders = signal<HomeSlider[]>([]);
  readonly hotels = signal<Hotel[]>([]);
  readonly about = signal<AboutUs | null>(null);
  readonly slideIndex = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly slide = computed((): HomeSlider | null => {
    const slides = this.sliders();
    const index = this.slideIndex();
    if (index < 0 || index >= slides.length) {
      return null;
    }
    return slides[index] ?? null;
  });
  readonly heroImage = computed(() => firstImage(this.slide()?.images ?? null));
  readonly today = inputDate(0);
  readonly searchError = signal<string | null>(null);
  readonly minCheckOut = signal(nextDate(inputDate(1)));
  readonly form = inject(FormBuilder).nonNullable.group({
    city: [''],
    adults: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    checkIn: [inputDate(1)],
    checkOut: [inputDate(3)],
  });

  constructor() {
    inject(Title).setTitle('Plaza Inn');
    this.alignCheckout(this.form.controls.checkIn.value);
    this.form.controls.checkIn.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => this.alignCheckout(value));
    forkJoin({
      hotels: this.api.hotels(),
      sliders: this.api.sliders(),
      about: this.api.about().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ hotels, sliders, about }) => {
        this.hotels.set(hotels);
        this.sliders.set(sliders);
        this.about.set(about);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  previous(): void {
    const total = this.sliders().length;
    if (!total) {
      return;
    }
    this.slideIndex.update((index) => (index - 1 + total) % total);
  }

  next(): void {
    const total = this.sliders().length;
    if (!total) {
      return;
    }
    this.slideIndex.update((index) => (index + 1) % total);
  }

  go(index: number): void {
    if (index < 0 || index >= this.sliders().length) {
      return;
    }
    this.slideIndex.set(index);
  }

  external(link: string | null | undefined): boolean {
    return !!link && /^https?:\/\//i.test(link);
  }

  image(value: AboutUs['square1ImageId']): string | null {
    if (value && typeof value === 'object') {
      return mediaUrl(value.url);
    }
    return null;
  }

  alignCheckout(checkIn: string): void {
    let start = checkIn;
    if (!start || start < this.today) {
      start = this.today;
      this.form.controls.checkIn.setValue(start, { emitEvent: false });
    }
    const minOut = nextDate(start);
    this.minCheckOut.set(minOut);
    if (this.form.controls.checkOut.value <= start) {
      this.form.controls.checkOut.setValue(minOut, { emitEvent: false });
    }
  }

  search(): void {
    this.alignCheckout(this.form.controls.checkIn.value);
    const value = this.form.getRawValue();
    const adults = Number(value.adults);
    if (value.checkIn < this.today) {
      this.searchError.set('Check-in cannot be before today.');
      return;
    }
    if (value.checkOut <= value.checkIn) {
      this.searchError.set('Check-out must be after check-in.');
      return;
    }
    if (!Number.isInteger(adults) || adults < 1 || adults > 20) {
      this.searchError.set('Enter 1 to 20 adults.');
      return;
    }
    this.searchError.set(null);
    void this.router.navigate(['/hotels'], {
      queryParams: { city: value.city, checkIn: value.checkIn, checkOut: value.checkOut, adults },
    });
  }
}
