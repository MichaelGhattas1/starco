import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { NoticeService } from '../core/notice.service';
import { WEEKDAYS } from '../core/models';

@Component({
  selector: 'app-contact-admin-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-admin.page.html',
})
export class ContactAdminPage {
  private readonly api = inject(ApiService);
  private readonly notice = inject(NoticeService);
  private readonly fb = inject(FormBuilder);
  readonly weekdays = WEEKDAYS;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    email: ['', Validators.email],
    address: [''],
    phone: [''],
    instagram: [''],
    facebook: [''],
    whatsApp: [''],
    linkedIn: [''],
    workingHours: this.fb.array([this.hourGroup()]),
  });

  constructor() {
    inject(Title).setTitle('Contact · Admin');
    this.api.contact().subscribe({
      next: (contact) => {
        if (!contact) {
          return;
        }
        this.form.patchValue({
          email: contact.email ?? '',
          address: contact.address ?? '',
          phone: contact.phone ?? '',
          instagram: contact.instagram ?? '',
          facebook: contact.facebook ?? '',
          whatsApp: contact.whatsApp ?? '',
          linkedIn: contact.linkedIn ?? '',
        });
        this.form.controls.workingHours.clear();
        for (const hour of contact.workingHours ?? []) {
          this.form.controls.workingHours.push(
            this.hourGroup(hour.day, hour.openTime.slice(0, 5), hour.closeTime.slice(0, 5)),
          );
        }
        if (!this.form.controls.workingHours.length) {
          this.addHour();
        }
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  addHour(): void {
    this.form.controls.workingHours.push(this.hourGroup());
  }

  removeHour(index: number): void {
    this.form.controls.workingHours.removeAt(index);
  }

  save(): void {
    const value = this.form.getRawValue();
    const body = {
      ...value,
      workingHours: value.workingHours.map((hour) => ({
        day: Number(hour.day),
        openTime: withSeconds(hour.openTime),
        closeTime: withSeconds(hour.closeTime),
      })),
    };
    this.saving.set(true);
    this.api.updateContact(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.success('Contact details saved.');
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }

  private hourGroup(day = 0, openTime = '09:00', closeTime = '17:00') {
    return this.fb.nonNullable.group({
      day: [day, Validators.required],
      openTime: [openTime, Validators.required],
      closeTime: [closeTime, Validators.required],
    });
  }
}

function withSeconds(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}
