import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CurrencyService } from './core/currency.service';
import { LocaleService } from './core/locale.service';
import { NoticeService } from './core/notice.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    @if (notice.message(); as msg) {
      <div class="toast-host">
        <div class="toast" role="status" [class.toast-ok]="msg.type === 'ok'" [class.toast-err]="msg.type === 'err'">
          <p>{{ msg.text }}</p>
          <button type="button" (click)="notice.clear()">Dismiss</button>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly locale = inject(LocaleService);
  private readonly currency = inject(CurrencyService);
  readonly notice = inject(NoticeService);
}
