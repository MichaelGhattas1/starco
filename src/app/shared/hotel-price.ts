import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CurrencyService } from '../core/currency.service';
import { hotelChargeLabels, quotedHotelBreakdown } from '../core/hotel-charges';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-hotel-price',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <dl class="grid gap-1 text-sm" [attr.aria-label]="labels().caption">
      @for (row of rows(); track row.key) {
        <div
          class="flex items-baseline justify-between gap-3 py-1"
          [class.border-t]="row.key === 'total'"
          [class.border-gold-300/40]="row.key === 'total'"
          [class.pt-2]="row.key === 'total'"
          [class.font-semibold]="row.key === 'total' || row.key === 'additional'"
          [class.text-gold-300]="row.key === 'total'"
        >
          <dt class="min-w-0">{{ row.label }}</dt>
          <dd class="shrink-0 text-end">{{ row.value }}</dd>
        </div>
      }
    </dl>
    <p class="mt-2 text-xs text-gold-200/70">{{ labels().note }}</p>
  `,
})
export class HotelPrice {
  readonly base = input.required<number>();
  readonly quote = input<number | null>(null);
  readonly mode = input<'display' | 'charge'>('display');

  private readonly currency = inject(CurrencyService);
  private readonly locale = inject(LocaleService);

  readonly labels = computed(() => hotelChargeLabels(this.locale.isAr()));
  readonly rows = computed(() => {
    const price = quotedHotelBreakdown(this.base(), this.quote());
    const labels = this.labels();
    const money = (amount: number) =>
      this.mode() === 'charge' ? this.currency.charge(amount) : this.currency.display(amount);
    return [
      { key: 'base', label: labels.base, value: money(price.base) },
      { key: 'vat', label: labels.vat, value: money(price.vat) },
      { key: 'service', label: labels.service, value: money(price.service) },
      { key: 'city', label: labels.city, value: money(price.city) },
      { key: 'additional', label: labels.additional, value: money(price.additional) },
      { key: 'total', label: labels.total, value: money(price.total) },
    ];
  });
}
