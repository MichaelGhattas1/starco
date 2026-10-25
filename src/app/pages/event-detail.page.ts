import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { CurrencyService } from '../core/currency.service';
import { firstImage, fromApiDate } from '../core/media';
import { BookingType, PlazaEvent } from '../core/models';
import { ServiceBooking } from '../shared/service-booking';

@Component({
  selector: 'app-event-detail-page',
  imports: [RouterLink, ServiceBooking],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/events" class="text-sm text-gold-300">All events</a>
    @if (loading()) {
      <p class="mt-6" role="status">Loading event…</p>
    } @else if (error()) {
      <p class="mt-6 text-red-200" role="alert">{{ error() }}</p>
    } @else if (item(); as event) {
      <div class="mt-4 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <article class="grid gap-4">
          @if (firstImage(event.images); as src) {
            <img class="h-80 w-full rounded-[1.6rem] object-cover" [src]="src" [alt]="label(event)" />
          }
          <p class="kicker">{{ locale.pick(event.location, event.locationAr) }}</p>
          <h1 class="font-display text-5xl leading-none">{{ label(event) }}</h1>
          <p>{{ fromApiDate(event.eventDate) }}@if (event.endDate) { – {{ fromApiDate(event.endDate) }} }</p>
          <p>{{ event.totalTickets }} tickets</p>
          <p class="text-gold-300">{{ currency.display(event.ticketPrice) }}</p>
          <div class="rich-text text-gold-100/90" [innerHTML]="locale.pick(event.description, event.descriptionAr)"></div>
        </article>
        @if (event.id) {
          <app-service-booking [kind]="kind" [itemId]="event.id" [title]="label(event)" [price]="event.ticketPrice" />
        }
      </div>
    }
  `,
})
export class EventDetailPage {
  private readonly api = inject(ApiService);
  readonly locale = inject(LocaleService);
  readonly currency = inject(CurrencyService);
  readonly firstImage = firstImage;
  readonly fromApiDate = fromApiDate;
  readonly kind = BookingType.Event;
  readonly item = signal<PlazaEvent | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.api.event(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loading.set(false);
        inject(Title).setTitle(`${this.label(item)} · Plaza Inn`);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  label(item: PlazaEvent): string {
    return this.locale.pick(item.name, item.nameAr) || 'Event';
  }
}
