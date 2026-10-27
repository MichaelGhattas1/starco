import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { NoticeService } from '../core/notice.service';
import { HotelLookup, Partner } from '../core/models';

@Component({
  selector: 'app-partners-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './partners.page.html',
})
export class PartnersPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  private readonly locale = inject(LocaleService);
  readonly partners = signal<Partner[]>([]);
  readonly hotels = signal<HotelLookup[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly selectedHotels = signal<string[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    inject(Title).setTitle('Partners · Admin');
    this.api.hotelLookup().subscribe({
      next: (hotels) => this.hotels.set(hotels),
      error: () => this.hotels.set([]),
    });
    this.load();
  }

  edit(partner: Partner): void {
    this.editingId.set(partner.id);
    this.form.patchValue({ name: partner.name ?? '', email: partner.email ?? '' });
    this.selectedHotels.set(partner.hotelsIds ?? []);
  }

  reset(): void {
    this.editingId.set(null);
    this.selectedHotels.set([]);
    this.form.reset();
  }

  toggleHotel(id: string | null): void {
    if (!id) {
      return;
    }
    this.selectedHotels.update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  checked(id: string | null): boolean {
    return !!id && this.selectedHotels().includes(id);
  }

  hotelLabel(hotel: HotelLookup): string {
    return this.locale.pick(hotel.name, hotel.nameAr) || this.locale.t('noun.hotel');
  }

  initial(name: string | null): string {
    const letter = (name ?? '').trim().slice(0, 1);
    return letter ? letter.toUpperCase() : 'P';
  }

  linkedHotels(partner: Partner): string[] {
    return (partner.hotelsIds ?? []).map((id) => {
      const hotel = this.hotels().find((item) => item.id === id);
      return hotel ? this.hotelLabel(hotel) : '';
    }).filter((name) => name.length > 0);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = { ...this.form.getRawValue(), hotelsIds: this.selectedHotels() };
    this.saving.set(true);
    const id = this.editingId();
    const request = id ? this.api.updatePartner(id, body) : this.api.createPartner(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.success('Partner saved.');
        this.reset();
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }

  remove(partner: Partner): void {
    if (!partner.id || !confirm(`Delete ${partner.name ?? 'this partner'}?`)) {
      return;
    }
    this.api.deletePartner(partner.id).subscribe({
      next: () => {
        this.notice.success('Partner deleted.');
        this.load();
      },
      error: (error) => this.notice.error(errorMessage(error)),
    });
  }

  private load(): void {
    this.api.partners().subscribe({
      next: (partners) => this.partners.set(partners),
      error: (error) => this.error.set(errorMessage(error)),
    });
  }
}
