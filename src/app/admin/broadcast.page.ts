import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { HotelLookup, Partner } from '../core/models';
import { NoticeService } from '../core/notice.service';
import { RichText, richTextLength } from '../shared/rich-text';

function messageLength(control: AbstractControl<string>) {
  return richTextLength(control.value ?? '') >= 10 ? null : { short: true };
}

@Component({
  selector: 'app-broadcast-page',
  imports: [ReactiveFormsModule, RichText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './broadcast.page.html',
})
export class BroadcastPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  private readonly locale = inject(LocaleService);
  readonly partners = signal<Partner[]>([]);
  readonly hotels = signal<HotelLookup[]>([]);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly hotelId = signal('');
  readonly attachments = signal<File[]>([]);
  readonly mail = inject(FormBuilder).nonNullable.group({
    hotelId: ['', Validators.required],
    subject: ['', Validators.required],
    body: ['', messageLength],
  });
  private fileInput: HTMLInputElement | null = null;

  constructor() {
    inject(Title).setTitle('Broadcast · Admin');
    this.mail.controls.hotelId.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      this.hotelId.set(id);
      this.loadRecipients(id);
    });
    this.api.hotelLookup().subscribe({
      next: (hotels) => this.hotels.set(hotels),
      error: () => this.hotels.set([]),
    });
    this.api.partners().subscribe({
      next: (partners) => this.partners.set(partners),
      error: () => this.partners.set([]),
    });
  }

  private loadRecipients(hotelId: string): void {
    if (!hotelId) {
      return;
    }
    this.api.partnersByHotel(hotelId).subscribe({
      next: (partners) => this.partners.set(partners),
      error: () => undefined,
    });
  }

  hotelLabel(hotel: HotelLookup): string {
    return this.locale.pick(hotel.name, hotel.nameAr) || this.locale.t('noun.hotel');
  }

  recipients(): Partner[] {
    const id = this.hotelId();
    if (!id) {
      return [];
    }
    const listed = this.partners();
    const matched = listed.filter((partner) => (partner.hotelsIds ?? []).includes(id));
    return matched.length ? matched : listed;
  }

  pickFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileInput = input;
    this.attachments.set(Array.from(input.files ?? []));
  }

  send(): void {
    this.error.set(null);
    if (this.mail.invalid) {
      this.mail.markAllAsTouched();
      this.error.set('Choose a hotel, then enter a subject and a message of at least 10 characters.');
      return;
    }
    const value = this.mail.getRawValue();
    const hotel = this.hotels().find((item) => item.id === value.hotelId);
    const label = hotel ? this.hotelLabel(hotel) : 'this hotel';
    const count = this.recipients().length;
    const who = count === 1 ? '1 partner' : `${count} partners`;
    if (!confirm(`Send this email to ${who} linked to ${label}?`)) {
      return;
    }
    this.sending.set(true);
    this.api.broadcastPartnerEmail(value.hotelId, value.subject, value.body, this.attachments()).subscribe({
      next: () => {
        this.sending.set(false);
        this.notice.success(`Email sent for ${label}.`);
        this.mail.reset({ hotelId: '', subject: '', body: '' });
        this.hotelId.set('');
        this.attachments.set([]);
        if (this.fileInput) {
          this.fileInput.value = '';
        }
      },
      error: (error) => {
        this.sending.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }
}
