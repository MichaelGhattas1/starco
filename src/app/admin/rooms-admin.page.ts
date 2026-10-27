import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { NoticeService } from '../core/notice.service';
import { HotelPrice } from '../shared/hotel-price';
import { ROOM_TYPE_OPTIONS, Room } from '../core/models';

@Component({
  selector: 'app-rooms-admin-page',
  imports: [RouterLink, HotelPrice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="kicker">{{ locale.t('admin.inventory') }}</p>
        <h1 class="font-display text-5xl">{{ locale.t('admin.rooms') }}</h1>
      </div>
      <a class="btn btn-gold" routerLink="/admin/rooms/new">{{ locale.t('admin.newRoom') }}</a>
    </div>
    <form class="panel mb-4 flex flex-col gap-3 p-4 sm:flex-row" (ngSubmit)="applySearch($event)">
      <label class="field flex-1">{{ locale.t('field.search') }} <input name="q" [value]="query()" /></label>
      <button class="btn btn-gold self-end" type="submit">{{ locale.t('action.search') }}</button>
    </form>
    @if (loading()) {
      <p role="status">{{ locale.t('load.roomsAdmin') }}</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else if (!visible().length) {
      <p>{{ locale.t('empty.roomsSearch') }}</p>
    } @else {
      <div class="grid gap-3">
        @for (room of visible(); track room.id) {
          <article class="panel flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
            <div>
              <h2 class="font-display text-3xl">{{ room.name || locale.t('noun.untitledRoom') }}</h2>
              <p class="text-sm text-gold-200/80">{{ room.hotelName }} · {{ typeLabel(room.type) }}</p>
              <app-hotel-price class="mt-3 max-w-md" [base]="room.pricePerNight || 0" mode="charge" />
            </div>
            <div class="flex gap-2">
              <a class="btn btn-line" [routerLink]="['/admin/rooms', room.id]">{{ locale.t('action.edit') }}</a>
              <button type="button" class="btn btn-danger" (click)="remove(room)">{{ locale.t('action.delete') }}</button>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class RoomsAdminPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  readonly locale = inject(LocaleService);
  readonly rooms = signal<Room[]>([]);
  readonly query = signal('');
  readonly visible = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) {
      return this.rooms();
    }
    return this.rooms().filter((room) =>
      `${room.name ?? ''} ${room.nameAr ?? ''} ${room.hotelName ?? ''}`.toLowerCase().includes(query),
    );
  });
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Rooms · Admin');
    this.load();
  }

  applySearch(event: Event): void {
    const data = new FormData(event.target as HTMLFormElement);
    this.query.set(String(data.get('q') ?? ''));
  }

  typeLabel(type: number): string {
    const label = ROOM_TYPE_OPTIONS.find((item) => item.value === type)?.label;
    if (label === 'Single') {
      return this.locale.t('hotel.single');
    }
    if (label === 'Double') {
      return this.locale.t('hotel.double');
    }
    if (label === 'Suite') {
      return this.locale.t('hotel.suite');
    }
    return this.locale.t('book.typeN', { n: type });
  }

  remove(room: Room): void {
    if (!room.id || !confirm(this.locale.t('action.deleteAsk', { name: room.name || this.locale.t('noun.room') }))) {
      return;
    }
    this.api.deleteRoom(room.id).subscribe({
      next: () => {
        this.notice.success(this.locale.t('toast.deleted', { name: this.locale.t('noun.room') }));
        this.load();
      },
      error: (error) => this.notice.error(errorMessage(error)),
    });
  }

  private load(): void {
    this.api.rooms().subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }
}
