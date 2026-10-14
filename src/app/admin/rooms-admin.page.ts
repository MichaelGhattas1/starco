import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';
import { money } from '../core/media';
import { ROOM_TYPE_OPTIONS, Room } from '../core/models';

@Component({
  selector: 'app-rooms-admin-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5 flex items-end justify-between gap-4">
      <div>
        <p class="kicker">Inventory</p>
        <h1 class="font-display text-5xl">Rooms</h1>
      </div>
      <a class="btn btn-gold" routerLink="/admin/rooms/new">New room</a>
    </div>
    @if (loading()) {
      <p role="status">Loading rooms…</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else {
      <div class="grid gap-3">
        @for (room of rooms(); track room.id) {
          <article class="panel flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
            <div>
              <h2 class="font-display text-3xl">{{ room.name || 'Untitled room' }}</h2>
              <p class="text-sm text-gold-200/80">
                {{ room.hotelName }} · {{ typeLabel(room.type) }} · {{ money(room.pricePerNight) }}
              </p>
            </div>
            <div class="flex gap-2">
              <a class="btn btn-line" [routerLink]="['/admin/rooms', room.id]">Edit</a>
              <button type="button" class="btn btn-danger" (click)="remove(room)">Delete</button>
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
  readonly rooms = signal<Room[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly money = money;

  constructor() {
    inject(Title).setTitle('Rooms · Admin');
    this.load();
  }

  typeLabel(type: number): string {
    return ROOM_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? `Type ${type}`;
  }

  remove(room: Room): void {
    if (!room.id || !confirm(`Delete ${room.name ?? 'this room'}?`)) {
      return;
    }
    this.api.deleteRoom(room.id).subscribe({
      next: () => {
        this.notice.success('Room deleted.');
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
