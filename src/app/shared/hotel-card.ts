import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';
import { Hotel } from '../core/models';
import { firstImage } from '../core/media';

@Component({
  selector: 'app-hotel-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="group panel flex h-full flex-col overflow-hidden">
      <a [routerLink]="['/hotels', hotel().id]" [queryParams]="query()" class="relative block overflow-hidden">
        @if (image()) {
          <img [src]="image()" [alt]="name()" class="h-56 w-full object-cover transition duration-500 group-hover:scale-105" />
        } @else {
          <div class="grid h-56 place-items-center bg-navy-800 font-display text-4xl text-gold-300">
            {{ initial() }}
          </div>
        }
        <span class="absolute bottom-3 start-3 rounded-full bg-navy-950/80 px-3 py-1 text-xs text-gold-300">{{ rating() }}</span>
      </a>
      <div class="flex flex-1 flex-col gap-3 p-5">
        <p class="kicker">{{ city() }}</p>
        <h3 class="font-display text-3xl leading-none">
          <a [routerLink]="['/hotels', hotel().id]" [queryParams]="query()" class="transition hover:text-gold-300">
            {{ name() }}
          </a>
        </h3>
        <p class="line-clamp-3 text-sm text-gold-200/80">{{ summary() }}</p>
        <div class="mt-auto flex items-center justify-between gap-3 pt-2 text-sm">
          <span>{{ hotel().numOfAvailableRoomsToReserve }} rooms</span>
          <a class="font-bold text-gold-300" [routerLink]="['/hotels', hotel().id]" [queryParams]="query()">View stay</a>
        </div>
      </div>
    </article>
  `,
})
export class HotelCard {
  readonly hotel = input.required<Hotel>();
  readonly checkIn = input('');
  readonly checkOut = input('');
  readonly adults = input<string | number>('');

  private readonly locale = inject(LocaleService);

  readonly name = computed(() => this.locale.pick(this.hotel().name, this.hotel().nameAr) || 'Hotel');
  readonly city = computed(() => this.locale.pick(this.hotel().city, this.hotel().cityAr) || 'Egypt');
  readonly summary = computed(() =>
    this.locale.pick(this.hotel().description, this.hotel().descriptionAr),
  );
  readonly image = computed(() => firstImage(this.hotel().images));
  readonly initial = computed(() => this.name().slice(0, 1).toUpperCase());
  readonly query = computed(() => ({
    checkIn: this.checkIn() || null,
    checkOut: this.checkOut() || null,
    adults: this.adults() || null,
  }));

  rating(): string {
    const value = this.hotel().rating;
    if (!value) {
      return 'New';
    }
    return value <= 5 ? `${value.toFixed(1)} / 5` : `Score ${value}`;
  }
}
