import { Injectable, computed, signal } from '@angular/core';
import { I18N, I18nKey, facilityKey } from './i18n';

export type AppLang = 'en' | 'ar';

const TYPE_KEYS: Record<string, I18nKey> = {
  hotel: 'noun.hotel',
  trip: 'noun.trip',
  transport: 'noun.transport',
  event: 'noun.event',
  package: 'noun.package',
  booking: 'noun.booking',
};

const PHRASES: Record<string, I18nKey> = {
  'This account cannot change hotel records.': 'session.noWrite',
  'Your session expired. Sign in again.': 'session.expired',
};

const NAMED: Record<string, I18nKey> = {
  hotel: 'nav.hotels',
  trip: 'nav.trips',
  transport: 'nav.transport',
  event: 'nav.events',
  package: 'nav.offers',
  booking: 'noun.booking',
  pending: 'pay.pending',
  confirmed: 'pay.confirmed',
  cancelled: 'pay.cancelled',
  canceled: 'pay.cancelled',
  open: 'pay.open',
  paid: 'pay.paid',
  unpaid: 'pay.unpaid',
};

@Injectable({ providedIn: 'root' })
export class LocaleService {
  readonly lang = signal<AppLang>(localStorage.getItem('plaza_lang') === 'ar' ? 'ar' : 'en');
  readonly isAr = computed(() => this.lang() === 'ar');

  constructor() {
    this.apply(this.lang());
  }

  toggle(): void {
    this.set(this.lang() === 'en' ? 'ar' : 'en');
  }

  set(lang: AppLang): void {
    this.lang.set(lang);
    localStorage.setItem('plaza_lang', lang);
    this.apply(lang);
  }

  pick(en: string | null | undefined, ar: string | null | undefined): string {
    const primary = this.isAr() ? ar : en;
    const fallback = this.isAr() ? en : ar;
    return (primary || fallback || '').trim();
  }

  t(key: I18nKey, vars?: Record<string, string | number>): string {
    let text: string = I18N[key][this.lang()];
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  }

  phrase(value: string): string {
    const key = PHRASES[value];
    return key ? this.t(key) : value;
  }

  /** Translate a fixed English status or catalog noun, including "Type 3" and "Status 2". */
  label(value: string): string {
    const raw = value.trim();
    const key = TYPE_KEYS[raw.toLowerCase()];
    if (key) {
      return this.t(key);
    }
    const named = this.named(raw);
    if (named !== raw) {
      return named;
    }
    const type = /^Type\s+(.+)$/.exec(raw);
    if (type) {
      return this.t('book.typeN', { n: type[1] });
    }
    const status = /^Status\s+(.+)$/.exec(raw);
    if (status) {
      return this.t('book.statusN', { n: status[1] });
    }
    return raw;
  }

  /** Translate a known English label from the API. Unknown text is left as returned. */
  named(value: string | null | undefined): string {
    const raw = (value ?? '').trim();
    const key = NAMED[raw.toLowerCase()];
    return key ? this.t(key) : raw;
  }

  facility(name: string): string {
    const key = facilityKey(name);
    return key ? this.t(key) : name;
  }

  private apply(lang: AppLang): void {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
}
