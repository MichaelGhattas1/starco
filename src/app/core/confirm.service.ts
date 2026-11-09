import { Injectable, computed, signal } from '@angular/core';

interface ConfirmRequest {
  message: string;
  resolve: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly request = signal<ConfirmRequest | null>(null);
  readonly message = computed(() => this.request()?.message ?? '');
  readonly open = computed(() => this.request() !== null);

  ask(message: string): Promise<boolean> {
    this.answer(false);
    return new Promise((resolve) => {
      this.request.set({ message, resolve });
    });
  }

  answer(ok: boolean): void {
    const current = this.request();
    if (!current) {
      return;
    }
    this.request.set(null);
    current.resolve(ok);
  }
}
