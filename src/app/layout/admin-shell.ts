import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { LocaleService } from '../core/locale.service';
import { ROLE_OPTIONS } from '../core/models';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-shell.html',
})
export class AdminShell {
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);

  roleLabel(): string {
    const label = ROLE_OPTIONS.find((role) => role.value === this.auth.role())?.label;
    if (label === 'Admin') {
      return this.locale.t('admin.roleAdmin');
    }
    if (label === 'Member') {
      return this.locale.t('admin.roleMember');
    }
    if (label === 'Partner') {
      return this.locale.t('admin.rolePartner');
    }
    return this.locale.t('admin.signedIn');
  }

  logout(): void {
    this.auth.logout();
  }
}
