import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  forwardRef,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { fromEvent } from 'rxjs';

export function richTextLength(html: string): number {
  const text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
  return text.replace(/\u00a0/g, ' ').trim().length;
}

@Component({
  selector: 'app-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rich-text.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichText),
      multi: true,
    },
  ],
  host: { class: 'grid gap-2' },
})
export class RichText implements ControlValueAccessor {
  private readonly editor = viewChild<ElementRef<HTMLDivElement>>('editor');
  private readonly linkInput = viewChild<ElementRef<HTMLInputElement>>('linkInput');
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private queued: string | null = null;
  private range: Range | null = null;

  readonly disabled = signal(false);
  readonly linkOpen = signal(false);
  readonly linkUrl = signal('https://');
  readonly linkError = signal<string | null>(null);
  readonly marks = signal({ bold: false, italic: false, underline: false });

  constructor() {
    afterNextRender(() => {
      const element = this.editor()?.nativeElement;
      if (this.queued !== null && element) {
        element.innerHTML = this.queued;
        this.queued = null;
      }
    });
    fromEvent(document, 'selectionchange')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.refreshMarks());
  }

  writeValue(value: string | null): void {
    const html = value ?? '';
    const element = this.editor()?.nativeElement;
    if (!element) {
      this.queued = html;
      return;
    }
    if (document.activeElement !== element) {
      element.innerHTML = html;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  format(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList'): void {
    if (this.disabled()) {
      return;
    }
    const element = this.editor()?.nativeElement;
    if (!element) {
      return;
    }
    element.focus();
    document.execCommand(command);
    this.commit();
    this.refreshMarks();
  }

  openLink(): void {
    if (this.disabled()) {
      return;
    }
    const selection = document.getSelection();
    this.range = selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    this.linkError.set(null);
    this.linkUrl.set('https://');
    this.linkOpen.set(true);
    setTimeout(() => this.linkInput()?.nativeElement.focus());
  }

  cancelLink(): void {
    this.linkOpen.set(false);
    this.linkError.set(null);
    this.editor()?.nativeElement.focus();
  }

  applyLink(): void {
    const url = normalizeUrl(this.linkUrl());
    if (!url) {
      this.linkError.set('Enter a web or email address.');
      return;
    }
    const element = this.editor()?.nativeElement;
    if (!element) {
      return;
    }
    element.focus();
    const selection = document.getSelection();
    if (this.range && selection) {
      selection.removeAllRanges();
      selection.addRange(this.range);
    }
    if (!selection || selection.isCollapsed) {
      document.execCommand('insertHTML', false, `<a href="${escapeAttr(url)}">${escapeText(url)}</a>`);
    } else {
      document.execCommand('createLink', false, url);
    }
    this.linkOpen.set(false);
    this.linkError.set(null);
    this.commit();
  }

  onInput(): void {
    this.commit();
  }

  onBlur(): void {
    this.onTouched();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!text) {
      return;
    }
    document.execCommand('insertText', false, text);
    this.commit();
  }

  keepSelection(event: Event): void {
    event.preventDefault();
  }

  private commit(): void {
    const element = this.editor()?.nativeElement;
    if (!element) {
      return;
    }
    this.onChange(cleanHtml(element.innerHTML));
  }

  private refreshMarks(): void {
    const element = this.editor()?.nativeElement;
    const selection = document.getSelection();
    if (!element || !selection?.anchorNode || !element.contains(selection.anchorNode)) {
      return;
    }
    this.marks.set({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }
}

function cleanHtml(html: string): string {
  const root = new DOMParser().parseFromString(html, 'text/html').body;
  root.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove());
  root.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (attribute.name.startsWith('on') || attribute.name === 'style') {
        element.removeAttribute(attribute.name);
      }
    });
  });
  root.querySelectorAll('a').forEach((link) => {
    const href = normalizeUrl(link.getAttribute('href') ?? '');
    if (!href) {
      link.removeAttribute('href');
      return;
    }
    link.setAttribute('href', href);
  });
  return root.innerHTML.trim();
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const withProtocol = /^(https?:|mailto:)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'mailto:') {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
