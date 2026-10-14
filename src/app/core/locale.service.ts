import { Injectable, computed, signal } from '@angular/core';

export type AppLang = 'en' | 'ar';

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

  private apply(lang: AppLang): void {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
}
