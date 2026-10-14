import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';

type SoonKind = 'trips' | 'transport' | 'offers';

function soonKind(value: unknown): SoonKind {
  return value === 'transport' || value === 'offers' ? value : 'trips';
}

const soonCopy: Record<SoonKind, { title: string; body: string }> = {
  trips: {
    title: 'Trips',
    body: 'Organized trips are part of the plan. The Plaza API currently covers hotels, rooms, reservations, and Paymob, and it has no trip endpoints yet.',
  },
  transport: {
    title: 'Transport',
    body: 'Airport and city transfers are part of the plan. The Plaza API currently covers hotels, rooms, reservations, and Paymob, and it has no transport endpoints yet.',
  },
  offers: {
    title: 'Offers',
    body: 'Seasonal rates and packages are part of the plan. The offers API is still under construction, so nothing can be booked from this page yet.',
  },
};

@Component({
  selector: 'app-soon-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel p-6 md:p-10">
      <p class="kicker">Plaza API</p>
      <h1 class="font-display text-6xl">{{ titleText() }}</h1>
      <p class="mt-4 max-w-2xl text-gold-100/90">{{ body() }}</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <a class="btn btn-gold" routerLink="/hotels">Reserve a hotel</a>
        <a class="btn btn-line" routerLink="/contact">Contact the desk</a>
      </div>
    </section>
  `,
})
export class SoonPage {
  private readonly title = inject(Title);
  readonly kind = signal<SoonKind>('trips');
  readonly titleText = signal('Trips');
  readonly body = signal('');

  constructor() {
    inject(ActivatedRoute)
      .data.pipe(takeUntilDestroyed())
      .subscribe((data) => {
        const kind = soonKind(data['kind']);
        const copy = soonCopy[kind];
        this.kind.set(kind);
        this.titleText.set(copy.title);
        this.body.set(copy.body);
        this.title.setTitle(`${copy.title} · Plaza Inn`);
      });
  }
}
