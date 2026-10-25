import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { CurrencyCode, CurrencyService } from '../core/currency.service';
import { LocaleService } from '../core/locale.service';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-currency-admin-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-5">
      <p class="kicker">Desk</p>
      <h1 class="font-display text-5xl">Currency settings</h1>
      @if (locale.isAr()) {
        <p class="mt-2 max-w-2xl text-sm text-gold-200/80">
          العملة المختارة تغيّر عرض الأسعار في هذا المتصفح فقط. بلازا لا يحفظ عملة للموقع.
          أسعار الغرف والرحلات والمبالغ المرسلة إلى الدفع تبقى بالجنيه المصري. الدولار واليورو للعرض بعد تحويل سعر اليوم، وليسا مبلغ الدفع.
        </p>
      } @else {
        <p class="mt-2 max-w-2xl text-sm text-gold-200/80">
          The selected currency changes how catalog prices are shown in this browser. Plaza does not store a site-wide currency.
          Room, trip, and Paymob amounts stay in Egyptian pounds. USD and EUR figures are converted for display from the latest rate and are not the payment amount.
        </p>
      }
    </div>

    <section class="panel grid max-w-xl gap-4 p-5">
      <p>
        <span class="kicker">Active display</span>
        <span class="mt-1 block font-display text-3xl">{{ currency.label(currency.applied()) }}</span>
      </p>
      @if (currency.ratesLoading()) {
        <p role="status">Loading exchange rates…</p>
      } @else if (currency.rateDate()) {
        <p class="text-sm text-gold-200/80">Rates updated {{ currency.rateDate() }}. Base currency is {{ currency.base }}.</p>
      }
      @if (currency.rateError()) {
        <p class="text-red-200" role="alert">{{ currency.rateError() }}</p>
        <button type="button" class="btn btn-line w-fit" [disabled]="currency.ratesLoading()" (click)="currency.refreshRates()">
          Try rates again
        </button>
      }
      <form class="grid gap-4" [formGroup]="form" (ngSubmit)="save()">
        <label class="field">
          Website currency
          <select formControlName="currency">
            @for (option of currency.options; track option.code) {
              <option [value]="option.code">{{ currency.label(option.code) }}</option>
            }
          </select>
        </label>
        <button class="btn btn-gold w-fit" type="submit" [disabled]="saving()">
          {{ saving() ? 'Saving…' : 'Save changes' }}
        </button>
      </form>
    </section>
  `,
})
export class CurrencyAdminPage {
  private readonly notice = inject(NoticeService);
  readonly locale = inject(LocaleService);
  readonly currency = inject(CurrencyService);
  readonly saving = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    currency: this.currency.active(),
  });

  constructor() {
    inject(Title).setTitle('Currency settings · Admin');
  }

  save(): void {
    const code = this.form.controls.currency.getRawValue() as CurrencyCode;
    this.saving.set(true);
    const problem = this.currency.save(code);
    this.saving.set(false);
    if (problem) {
      this.notice.error(problem);
      return;
    }
    this.notice.success(`${this.currency.label(code)} is the display currency in this browser.`);
  }
}
