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
      <p class="kicker">{{ locale.t('admin.desk') }}</p>
      <h1 class="font-display text-5xl">{{ locale.t('fx.adminTitle') }}</h1>
      <p class="mt-2 max-w-2xl text-sm text-gold-200/80">{{ locale.t('fx.adminLead') }}</p>
    </div>

    <section class="panel grid max-w-xl gap-4 p-5">
      <p>
        <span class="kicker">{{ locale.t('fx.activeDisplay') }}</span>
        <span class="mt-1 block font-display text-3xl">{{ currency.label(currency.applied()) }}</span>
      </p>
      @if (currency.ratesLoading()) {
        <p role="status">{{ locale.t('fx.loadingRates') }}</p>
      } @else if (currency.rateDate()) {
        <p class="text-sm text-gold-200/80">{{ locale.t('fx.updated', { date: currency.rateDate() || '', code: currency.base }) }}</p>
      }
      @if (currency.rateError()) {
        <p class="text-red-200" role="alert">{{ currency.rateError() }}</p>
        <button type="button" class="btn btn-line w-fit" [disabled]="currency.ratesLoading()" (click)="currency.refreshRates()">
          {{ locale.t('action.tryRates') }}
        </button>
      }
      <form class="grid gap-4" [formGroup]="form" (ngSubmit)="save()">
        <label class="field">
          {{ locale.t('field.websiteCurrency') }}
          <select formControlName="currency">
            @for (option of currency.options; track option.code) {
              <option [value]="option.code">{{ currency.label(option.code) }}</option>
            }
          </select>
        </label>
        <button class="btn btn-gold w-fit" type="submit" [disabled]="saving()">
          {{ saving() ? locale.t('action.saving') : locale.t('action.saveChanges') }}
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
    this.notice.success(this.locale.t('fx.displaySet', { label: this.currency.label(code) }));
  }
}
