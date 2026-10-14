import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { NoticeService } from '../core/notice.service';
import { ROLE_OPTIONS } from '../core/models';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-shell.html',
})
export class AdminShell {
  readonly auth = inject(AuthService);
  readonly notice = inject(NoticeService);

  roleLabel(): string {
    return ROLE_OPTIONS.find((role) => role.value === this.auth.role())?.label ?? 'Signed in';
  }

  logout(): void {
    this.auth.logout();
  }
}
