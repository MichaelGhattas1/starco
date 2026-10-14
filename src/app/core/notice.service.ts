import { Injectable, signal } from '@angular/core';

export interface Notice {
  type: 'ok' | 'err';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class NoticeService {
  readonly message = signal<Notice | null>(null);
  private timer = 0;

  success(text: string): void {
    this.push('ok', text);
  }

  error(text: string): void {
    this.push('err', text);
  }

  clear(): void {
    window.clearTimeout(this.timer);
    this.message.set(null);
  }

  private push(type: Notice['type'], text: string): void {
    window.clearTimeout(this.timer);
    this.message.set({ type, text });
    this.timer = window.setTimeout(() => this.message.set(null), 6000);
  }
}
