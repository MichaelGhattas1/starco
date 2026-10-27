import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-catalog-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="panel flex h-full flex-col overflow-hidden">
      @if (image()) {
        <img class="h-56 w-full object-cover" [src]="image()" [alt]="title()" />
      }
      <div class="flex flex-1 flex-col gap-2 p-5">
        <p class="kicker">{{ kicker() }}</p>
        <h2 class="font-display text-3xl leading-none break-words">{{ title() }}</h2>
        <p class="line-clamp-3 text-sm text-gold-200/80">{{ summary() }}</p>
        <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <span class="min-w-0 text-gold-300">{{ price() }}</span>
          <a class="font-bold text-gold-300" [routerLink]="link()">{{ locale.t('action.view') }}</a>
        </div>
      </div>
    </article>
  `,
})
export class CatalogCard {
  readonly locale = inject(LocaleService);
  readonly title = input.required<string>();
  readonly kicker = input('');
  readonly summary = input('');
  readonly price = input('');
  readonly image = input<string | null>(null);
  readonly link = input.required<string[]>();
}
