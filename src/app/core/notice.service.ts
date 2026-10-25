import { Injectable, signal } from '@angular/core';

export interface Notice {
  type: 'ok' | 'err';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class NoticeService {
  readonly message = signal<Notice | null>(null);
  private timer = 0;
  private apiMessage = false;

  success(text: string): void {
    if (this.apiMessage) {
      return;
    }
    this.push('ok', text);
  }

  apiSuccess(text: string): void {
    this.apiMessage = true;
    this.push('ok', text);
    queueMicrotask(() => {
      this.apiMessage = false;
    });
  }

  error(text: string): void {
    this.push('err', text);
  }

  clear(): void {
    window.clearTimeout(this.timer);
    this.apiMessage = false;
    this.message.set(null);
  }

  private push(type: Notice['type'], text: string): void {
    window.clearTimeout(this.timer);
    this.message.set({ type, text });
    this.timer = window.setTimeout(() => this.message.set(null), 6000);
  }
}
