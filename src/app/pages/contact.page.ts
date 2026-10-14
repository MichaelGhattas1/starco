import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ContactSection } from '../shared/contact-section';

@Component({
  selector: 'app-contact-page',
  imports: [ContactSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-contact-section [page]="true" />`,
})
export class ContactPage {
  constructor() {
    inject(Title).setTitle('Contact · Plaza Inn');
  }
}
