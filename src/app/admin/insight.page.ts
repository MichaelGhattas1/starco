import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';
import { firstPhotoProblem } from '../core/image-file';
import { extractIds, featureLabel, mediaUrl } from '../core/media';
import { FileDto, HOTEL_FACILITIES, HotelLookup, PlazaInnType } from '../core/models';

@Component({
  selector: 'app-insight-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './insight.page.html',
})
export class InsightPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notice = inject(NoticeService);
  readonly featureLabel = featureLabel;
  readonly mediaUrl = mediaUrl;
  readonly hotels = signal<HotelLookup[]>([]);
  readonly hotelId = signal<string | null>(null);
  readonly exists = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly facilities = signal<Record<string, boolean>>(blankFacilities());
  readonly restaurantImages = signal<DiningFile[]>([]);
  readonly cafeImages = signal<DiningFile[]>([]);
  readonly restaurantMenus = signal<DiningFile[]>([]);
  readonly cafeMenus = signal<DiningFile[]>([]);
  readonly newFacility = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    restaurantDescription: [''],
    restaurantDescriptionAr: [''],
    cafeDescription: [''],
    cafeDescriptionAr: [''],
  });

  constructor() {
    inject(Title).setTitle('Dining · Admin');
    this.api.hotelLookup().subscribe({
      next: (hotels) => this.hotels.set(hotels),
      error: (error) => this.error.set(errorMessage(error)),
    });
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const hotelId = params.get('hotelId');
        this.hotelId.set(hotelId);
        this.clearMedia();
        if (hotelId) {
          this.load(hotelId);
        }
      });
  }

  facilityEntries(): [string, boolean][] {
    return Object.entries(this.facilities());
  }

  openHotel(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id) {
      void this.router.navigate(['/admin/insight', id]);
    }
  }

  onFacility(event: Event): void {
    this.newFacility.set((event.target as HTMLInputElement).value);
  }

  toggle(key: string): void {
    this.facilities.update((current) => ({ ...current, [key]: !current[key] }));
  }

  addFacility(): void {
    const key = this.newFacility().trim();
    if (!key) {
      return;
    }
    this.facilities.update((current) => ({ ...current, [key]: true }));
    this.newFacility.set('');
  }

  upload(event: Event, target: MediaTarget): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) {
      return;
    }
    const type = {
      restaurant: PlazaInnType.Restaurant,
      cafe: PlazaInnType.Cafe,
      restaurantMenu: PlazaInnType.RestaurantMenu,
      cafeMenu: PlazaInnType.CafeMenu,
    }[target];
    const photo = target === 'restaurant' || target === 'cafe';
    const send = () => this.api.upload(type, files).subscribe({
      next: (payload) => {
        const uploaded = uploadedFiles(payload, files);
        this.list(target).update((current) => mergeFiles(current, uploaded));
        input.value = '';
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
    if (!photo) {
      send();
      return;
    }
    void firstPhotoProblem(files).then((problem) => {
      if (problem) {
        this.error.set(problem);
        input.value = '';
        return;
      }
      send();
    });
  }

  drop(target: MediaTarget, id: number): void {
    const kind = target.endsWith('Menu') ? 'menu' : 'photo';
    if (!confirm(`Delete this ${kind}?`)) {
      return;
    }
    const list = this.list(target);
    const previous = list();
    list.set(previous.filter((file) => file.id !== id));
    if (!this.exists()) {
      this.notice.success(`The ${kind} was removed.`);
      return;
    }
    this.persist(`The ${kind} was removed.`, () => list.set(previous));
  }

  save(): void {
    if (!this.hotelId()) {
      return;
    }
    this.persist('Dining details saved.');
  }

  remove(): void {
    const id = this.hotelId();
    if (!id || !confirm('Remove dining details for this hotel?')) {
      return;
    }
    this.api.deleteInsight(id).subscribe({
      next: () => {
        this.exists.set(false);
        this.form.reset();
        this.clearMedia();
        this.notice.success('Dining details removed.');
      },
      error: (error) => this.notice.error(errorMessage(error)),
    });
  }

  private load(hotelId: string): void {
    this.api.insight(hotelId).subscribe({
      next: (insight) => {
        this.exists.set(true);
        this.form.patchValue({
          restaurantDescription: insight.restaurantDescription ?? '',
          restaurantDescriptionAr: insight.restaurantDescriptionAr ?? '',
          cafeDescription: insight.cafeDescription ?? '',
          cafeDescriptionAr: insight.cafeDescriptionAr ?? '',
        });
        this.facilities.set({ ...blankFacilities(), ...(insight.facilities ?? {}) });
        this.restaurantImages.set(mapFiles(insight.restaurantImageIds));
        this.cafeImages.set(mapFiles(insight.cafeImageIds));
        this.restaurantMenus.set(mapFiles(insight.restaurantMenuPdfIds, 'Restaurant menu'));
        this.cafeMenus.set(mapFiles(insight.cafeMenuPdfIds, 'Cafe menu'));
      },
      error: () => {
        this.exists.set(false);
        this.form.reset();
        this.facilities.set(blankFacilities());
        this.clearMedia();
      },
    });
  }

  private persist(success: string, restore?: () => void): void {
    const encodedHotelId = this.hotelId();
    if (!encodedHotelId || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const body = {
      encodedHotelId,
      ...value,
      facilities: this.facilities(),
      restaurantImageIds: idsOf(this.restaurantImages()),
      cafeImageIds: idsOf(this.cafeImages()),
      restaurantMenuPdfIds: idsOf(this.restaurantMenus()),
      cafeMenuPdfIds: idsOf(this.cafeMenus()),
    };
    this.saving.set(true);
    this.error.set(null);
    const request = this.exists()
      ? this.api.updateInsight(encodedHotelId, body)
      : this.api.createInsight(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.exists.set(true);
        this.notice.success(success);
      },
      error: (error) => {
        this.saving.set(false);
        restore?.();
        this.error.set(errorMessage(error));
      },
    });
  }

  private list(target: MediaTarget): WritableSignal<DiningFile[]> {
    if (target === 'restaurant') {
      return this.restaurantImages;
    }
    if (target === 'cafe') {
      return this.cafeImages;
    }
    if (target === 'restaurantMenu') {
      return this.restaurantMenus;
    }
    return this.cafeMenus;
  }

  private clearMedia(): void {
    this.restaurantImages.set([]);
    this.cafeImages.set([]);
    this.restaurantMenus.set([]);
    this.cafeMenus.set([]);
  }
}

function blankFacilities(): Record<string, boolean> {
  return Object.fromEntries(HOTEL_FACILITIES.map((key) => [key, false]));
}

type MediaTarget = 'restaurant' | 'cafe' | 'restaurantMenu' | 'cafeMenu';

interface DiningFile {
  id: number;
  url: string | null;
  name: string | null;
}

function mapFiles(files: FileDto[] | null | undefined, label?: string): DiningFile[] {
  return (files ?? []).flatMap((file, index) =>
    typeof file?.id === 'number'
      ? [{ id: file.id, url: file.url ?? null, name: label ? `${label} ${index + 1}` : null }]
      : [],
  );
}

function idsOf(files: DiningFile[]): number[] {
  return files.map((file) => file.id);
}

function mergeFiles(current: DiningFile[], incoming: DiningFile[]): DiningFile[] {
  const seen = new Set(current.map((file) => file.id));
  return [...current, ...incoming.filter((file) => !seen.has(file.id))];
}

function uploadedFiles(payload: unknown, locals: File[]): DiningFile[] {
  const parsed = collectFiles(payload);
  const source = parsed.length ? parsed : extractIds(payload).map((id) => ({ id, url: null, name: null }));
  return source.map((file, index) => {
    const local = locals[index];
    const preview = !file.url && local?.type.startsWith('image/') ? URL.createObjectURL(local) : file.url;
    return { id: file.id, url: preview, name: local?.name ?? file.name };
  });
}

function collectFiles(payload: unknown): DiningFile[] {
  if (payload == null) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => collectFiles(item));
  }
  if (typeof payload !== 'object') {
    return [];
  }
  const record = payload as Record<string, unknown>;
  if (typeof record['id'] === 'number') {
    return [{ id: record['id'], url: typeof record['url'] === 'string' ? record['url'] : null, name: null }];
  }
  if ('data' in record) {
    return collectFiles(record['data']);
  }
  return [];
}
