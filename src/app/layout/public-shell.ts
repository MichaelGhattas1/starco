import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CartStore } from '../core/cart.store';
import { LocaleService } from '../core/locale.service';
import { NoticeService } from '../core/notice.service';

@Component({
  selector: 'app-public-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-shell.html',
  host: {
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class PublicShell {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartStore);
  readonly locale = inject(LocaleService);
  readonly notice = inject(NoticeService);
  readonly menuOpen = signal(false);
  readonly year = new Date().getFullYear();

  private readonly route = inject(ActivatedRoute);

  constructor() {
    if (sessionStorage.getItem('plaza_expired') === '1') {
      sessionStorage.removeItem('plaza_expired');
      this.notice.error('Your session expired. Sign in again.');
    }
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const notice = params.get('notice');
      if (notice) {
        this.notice.error(notice);
      }
    });
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.closeMenu();
  }
}
