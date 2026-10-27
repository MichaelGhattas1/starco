import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { environment } from './environment';
import { I18nKey } from './i18n';
import { LocaleService } from './locale.service';

export type CurrencyCode = 'EGP' | 'USD' | 'EUR';

export interface CurrencyOption {
  code: CurrencyCode;
  nameEn: string;
  nameAr: string;
  symbol: string;
}

interface ExchangeRateResponse {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
  time_last_update_utc?: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'EGP', nameEn: 'Egyptian Pound', nameAr: 'جنيه مصري', symbol: 'ج.م' },
  { code: 'USD', nameEn: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$' },
  { code: 'EUR', nameEn: 'Euro', nameAr: 'يورو', symbol: '€' },
];

/** Plaza price fields have no currency. Paymob checkout was built for EGP. */
export const BASE_CURRENCY: CurrencyCode = 'EGP';
export const PAYMENT_CURRENCY: CurrencyCode = 'EGP';

const STORAGE_KEY = 'plaza_display_currency';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly http = inject(HttpClient);
  private readonly locale = inject(LocaleService);

  readonly options = CURRENCIES;
  readonly base = BASE_CURRENCY;
  readonly payment = PAYMENT_CURRENCY;
  readonly active = signal<CurrencyCode>(readStored());
  readonly rates = signal<Partial<Record<CurrencyCode, number>> | null>(null);
  readonly rateDate = signal<string | null>(null);
  private readonly rateErrorKey = signal<I18nKey | null>(null);
  readonly rateError = computed(() => {
    const key = this.rateErrorKey();
    return key ? this.locale.t(key) : null;
  });
  readonly ratesLoading = signal(false);
  readonly applied = computed(() => (this.canUse(this.active()) ? this.active() : this.base));

  constructor() {
    this.refreshRates();
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) {
        this.active.set(readStored());
      }
    });
  }

  refreshRates(): void {
    this.ratesLoading.set(true);
    this.rateErrorKey.set(null);
    this.http.get<ExchangeRateResponse>(environment.exchangeRateUrl).subscribe({
      next: (body) => {
        const usd = body.rates?.['USD'];
        const eur = body.rates?.['EUR'];
        if (body.result !== 'success' || body.base_code !== this.base || typeof usd !== 'number' || typeof eur !== 'number' || usd <= 0 || eur <= 0) {
          this.failRates('fx.badFeed');
          return;
        }
        this.rates.set({ EGP: 1, USD: usd, EUR: eur });
        this.rateDate.set(body.time_last_update_utc ?? null);
        this.ratesLoading.set(false);
      },
      error: () => this.failRates('fx.loadFail'),
    });
  }

  label(code: CurrencyCode): string {
    const option = this.options.find((item) => item.code === code) ?? this.options[0];
    const name = this.locale.isAr() ? option.nameAr : option.nameEn;
    return `${option.code} — ${name}`;
  }

  canUse(code: CurrencyCode): boolean {
    if (code === this.base) {
      return true;
    }
    const rate = this.rates()?.[code];
    return rate != null && rate > 0;
  }

  save(code: CurrencyCode): string | null {
    if (!this.options.some((item) => item.code === code)) {
      return this.locale.t('fx.choose');
    }
    if (this.ratesLoading() && code !== this.base) {
      return this.locale.t('fx.loading');
    }
    if (!this.canUse(code)) {
      return this.locale.t('fx.needRate');
    }
    this.active.set(code);
    localStorage.setItem(STORAGE_KEY, code);
    return null;
  }

  display(value: number | null | undefined): string {
    const amount = finite(value);
    const code = this.applied();
    if (code === this.base) {
      return this.format(amount, this.base);
    }
    const rate = this.rates()?.[code];
    if (rate == null || !(rate > 0)) {
      return this.format(amount, this.base);
    }
    return this.format(Math.round(amount * rate * 100) / 100, code);
  }

  charge(value: number | null | undefined): string {
    return this.format(finite(value), this.payment);
  }

  toUsdAmount(egp: number | null | undefined): number | null {
    const rate = this.usdRate();
    if (rate == null) {
      return null;
    }
    return roundMoney(finite(egp) * rate);
  }

  toEgpAmount(usd: number | null | undefined): number | null {
    const rate = this.usdRate();
    if (rate == null) {
      return null;
    }
    return roundMoney(finite(usd) / rate);
  }

  usdInputNote(usd: number | null | undefined): string {
    if (this.ratesLoading()) {
      return this.locale.t('fx.usdLoading');
    }
    const egp = this.toEgpAmount(usd);
    if (egp == null) {
      return this.locale.t('fx.usdRequired');
    }
    return this.locale.t('fx.paymentAmount', { amount: this.charge(egp) });
  }

  per(unit: 'night' | 'person' | 'child' | 'trip'): string {
    const arabic = this.locale.isAr();
    const labels = {
      night: arabic ? '/ ليلة' : '/ night',
      person: arabic ? '/ شخص' : '/ person',
      child: arabic ? '/ طفل' : '/ child',
      trip: arabic ? '/ رحلة' : '/ trip',
    };
    return labels[unit];
  }

  private format(amount: number, code: CurrencyCode): string {
    const arabic = this.locale.isAr();
    return new Intl.NumberFormat(arabic ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: code,
      numberingSystem: 'latn',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private usdRate(): number | null {
    const rate = this.rates()?.USD;
    return rate != null && rate > 0 ? rate : null;
  }

  private failRates(key: I18nKey): void {
    this.rates.set(null);
    this.rateDate.set(null);
    this.rateErrorKey.set(key);
    this.ratesLoading.set(false);
  }
}

function finite(value: number | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function applyStoredUsd(
  currency: CurrencyService,
  patch: (values: Record<string, number>) => void,
  fields: readonly string[],
  stored: () => Record<string, number> | null,
  clear: () => void,
): void {
  effect(() => {
    const pending = stored();
    if (!pending || !currency.canUse('USD')) {
      return;
    }
    const values: Record<string, number> = {};
    for (const field of fields) {
      const usd = currency.toUsdAmount(pending[field] ?? 0);
      if (usd == null) {
        return;
      }
      values[field] = usd;
    }
    patch(values);
    clear();
  });
}

function readStored(): CurrencyCode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'EGP' || value === 'USD' || value === 'EUR') {
      return value;
    }
  } catch {
    return BASE_CURRENCY;
  }
  return BASE_CURRENCY;
}
