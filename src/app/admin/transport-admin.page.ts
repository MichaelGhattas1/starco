import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { CurrencyService } from '../core/currency.service';
import { TransportOffer } from '../core/models';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-transport-admin-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="kicker">{{ locale.t('admin.catalog') }}</p>
        <h1 class="font-display text-5xl">{{ locale.t('nav.transport') }}</h1>
      </div>
      <a class="btn btn-gold" routerLink="/admin/transport/new">{{ locale.t('admin.newTransport') }}</a>
    </div>
    <form class="panel mb-4 flex flex-col gap-3 p-4 sm:flex-row" (ngSubmit)="load($event)">
      <label class="field flex-1">{{ locale.t('field.search') }} <input name="q" [value]="query()" /></label>
      <button class="btn btn-gold self-end" type="submit">{{ locale.t('action.search') }}</button>
    </form>
    @if (loading()) {
      <p role="status">{{ locale.t('load.transport') }}</p>
    } @else if (error()) {
      <p class="text-red-200" role="alert">{{ error() }}</p>
    } @else if (!items().length) {
      <p>{{ locale.t('empty.transport') }}</p>
    } @else {
      <div class="grid gap-3">
        @for (item of items(); track item.id) {
          <article class="panel flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
            <div>
              <h2 class="font-display text-3xl">{{ label(item) }}</h2>
              <p class="text-sm text-gold-200/80">
                {{ locale.pick(item.vehicleType, item.vehicleTypeAr) }} · {{ money(item.pricePerTrip) }} ·
                {{ item.isActive ? locale.t('field.active') : locale.t('field.hidden') }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              @if (item.id) {
                <a class="btn btn-line" [routerLink]="['/transport', item.id]">{{ locale.t('action.view') }}</a>
              }
              <a class="btn btn-line" [routerLink]="['/admin/transport', item.id]">{{ locale.t('action.edit') }}</a>
              <button type="button" class="btn btn-danger" (click)="remove(item)">{{ locale.t('action.delete') }}</button>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class TransportAdminPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  readonly locale = inject(LocaleService);
  private readonly currency = inject(CurrencyService);
  readonly money = (value: number | null | undefined) => this.currency.charge(value);
  readonly items = signal<TransportOffer[]>([]);
  readonly query = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Transport · Admin');
    this.load();
  }

  label(item: TransportOffer): string {
    return this.locale.pick(item.name, item.nameAr) || 'Transport';
  }

  load(event?: Event): void {
    event?.preventDefault();
    if (event) {
      const data = new FormData(event.target as HTMLFormElement);
      this.query.set(String(data.get('q') ?? ''));
    }
    this.loading.set(true);
    this.error.set(null);
    const search = this.query().trim();
    this.api.transports(search ? { Search: search } : {}).subscribe({
      next: (items) => {
        this.items.set(items ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  remove(item: TransportOffer): void {
    if (!item.id || !confirm(this.locale.t('action.deleteAsk', { name: this.label(item) }))) {
      return;
    }
    this.api.deleteTransport(item.id).subscribe({
      next: () => {
        this.notice.success(this.locale.t('toast.deleted', { name: this.locale.t('noun.transport') }));
        this.load();
      },
      error: (error) => this.notice.error(errorMessage(error)),
    });
  }
}
