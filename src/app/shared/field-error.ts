import { DestroyRef, Directive, ElementRef, OnInit, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NgControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { merge } from 'rxjs';
import { LocaleService } from '../core/locale.service';

/** Confirm field must equal the named sibling. Empty pairs are allowed. */
export function matches(other: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const sibling = control.parent?.get(other);
    if (!sibling) {
      return null;
    }
    const left = String(sibling.value ?? '');
    const right = String(control.value ?? '');
    if (!left && !right) {
      return null;
    }
    return left === right ? null : { mismatch: true };
  };
}

/** Rejects fractional numbers. Empty values are left to `required`. */
export function wholeNumber(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === '' || value == null) {
    return null;
  }
  return Number.isInteger(Number(value)) ? null : { whole: true };
}

export function fieldErrorText(errors: ValidationErrors, locale: LocaleService): string {
  if (errors['required']) {
    return locale.t('validation.required');
  }
  if (errors['email']) {
    return locale.t('validation.email');
  }
  if (errors['mismatch']) {
    return locale.t('auth.passwordMismatch');
  }
  if (errors['minlength']) {
    return locale.t('validation.minLength', { n: errors['minlength'].requiredLength });
  }
  if (errors['maxlength']) {
    return locale.t('validation.maxLength', { n: errors['maxlength'].requiredLength });
  }
  if (errors['min']) {
    return locale.t('validation.min', { n: errors['min'].min });
  }
  if (errors['max']) {
    return locale.t('validation.max', { n: errors['max'].max });
  }
  if (errors['pattern']) {
    const pattern = String(errors['pattern'].requiredPattern ?? '');
    if (pattern.includes('d{6,15}')) {
      return locale.t('validation.phone');
    }
    return locale.t('validation.invalid');
  }
  if (errors['whole']) {
    return locale.t('validation.whole');
  }
  if (errors['short']) {
    return locale.t('validation.minLength', { n: 10 });
  }
  if (errors['past']) {
    return locale.t('hotel.checkInPast');
  }
  if (errors['after']) {
    return locale.t('hotel.checkoutAfter');
  }
  return locale.t('validation.invalid');
}

/**
 * Marks an invalid control after it has been touched (including a failed submit)
 * and shows the message directly under the field.
 */
@Directive({
  selector: '[formControlName], [formControl]',
})
export class FieldError implements OnInit {
  private readonly ngControl = inject(NgControl, { self: true });
  private readonly locale = inject(LocaleService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private note: HTMLParagraphElement | null = null;

  constructor() {
    effect(() => {
      this.locale.lang();
      this.render();
    });
  }

  ngOnInit(): void {
    const control = this.ngControl.control;
    if (!control) {
      return;
    }
    const form = this.host.nativeElement.closest('form');
    const onSubmit = () => {
      control.markAsTouched();
      this.render();
    };
    form?.addEventListener('submit', onSubmit);
    const parent = control.parent;
    const updates = parent
      ? merge(control.statusChanges, control.valueChanges, parent.valueChanges)
      : merge(control.statusChanges, control.valueChanges);
    updates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (parent && control.parent === parent) {
        control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      }
      this.render();
    });
    this.destroyRef.onDestroy(() => {
      form?.removeEventListener('submit', onSubmit);
      this.clear();
    });
  }

  private render(): void {
    const control = this.ngControl.control;
    const element = this.host.nativeElement;
    if (!control || control.disabled || control.valid || !control.touched || !control.errors) {
      this.clear();
      return;
    }
    const message = fieldErrorText(control.errors, this.locale);
    element.classList.add('is-invalid');
    element.setAttribute('aria-invalid', 'true');
    const note = this.ensureNote(element);
    if (note.textContent !== message) {
      note.textContent = message;
    }
  }

  private ensureNote(element: HTMLElement): HTMLParagraphElement {
    if (this.note?.isConnected) {
      return this.note;
    }
    const note = document.createElement('p');
    note.className = 'field-error';
    note.setAttribute('role', 'alert');
    element.insertAdjacentElement('afterend', note);
    if (!element.getAttribute('aria-describedby')) {
      note.id = `field-error-${FieldError.nextId++}`;
      element.setAttribute('aria-describedby', note.id);
    }
    this.note = note;
    return note;
  }

  private clear(): void {
    const element = this.host.nativeElement;
    element.classList.remove('is-invalid');
    if (element.getAttribute('aria-invalid') === 'true') {
      element.removeAttribute('aria-invalid');
    }
    if (this.note) {
      if (element.getAttribute('aria-describedby') === this.note.id) {
        element.removeAttribute('aria-describedby');
      }
      this.note.remove();
      this.note = null;
    }
  }

  private static nextId = 1;
}
