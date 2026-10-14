import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { UNPAID_KEY, UnpaidStay } from '../core/cart.store';

@Component({
  selector: 'app-payment-result-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-result.page.html',
})
export class PaymentResultPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  readonly loading = signal(false);
  readonly message = signal('Add the payment reference from Paymob to confirm this reservation.');
  readonly detail = signal('');
  readonly paymentRef = signal(this.params.get('paymentRef') ?? this.params.get('merchant_order_id') ?? '');
  readonly unpaid = signal<UnpaidStay[]>(readUnpaid());

  constructor() {
    inject(Title).setTitle('Payment · Plaza Inn');
    const orderId = this.params.get('order') ?? this.params.get('id');
    if (this.paymentRef()) {
      this.confirm();
    } else if (orderId) {
      this.check(orderId);
    }
  }

  onRef(event: Event): void {
    this.paymentRef.set((event.target as HTMLInputElement).value);
  }

  payStay(stay: UnpaidStay): void {
    if (!stay.phone) {
      this.message.set('This stay is missing a phone number for Paymob.');
      return;
    }
    this.loading.set(true);
    this.api
      .createPayment({
        encodedBookingId: stay.encodedId,
        amountCents: Math.round(Number(stay.totalPrice) * 100),
        currency: 'EGP',
        billingData: {
          name: stay.name,
          email: stay.email,
          phone: stay.phone,
        },
        items: [],
      })
      .subscribe({
        next: (payload) => {
          const url = paymentLink(payload);
          const rest = this.unpaid().filter((item) => item.encodedId !== stay.encodedId);
          sessionStorage.setItem(UNPAID_KEY, JSON.stringify(rest));
          this.unpaid.set(rest);
          if (url) {
            window.location.href = url;
            return;
          }
          this.loading.set(false);
          void this.router.navigate(['/payment/result'], { queryParams: { bookingId: stay.encodedId } });
        },
        error: (error) => {
          this.loading.set(false);
          this.message.set(errorMessage(error));
        },
      });
  }

  confirm(): void {
    const paymentRef = this.paymentRef().trim();
    if (!paymentRef) {
      this.message.set('Enter the payment reference.');
      return;
    }
    this.loading.set(true);
    this.api.confirmPayment(paymentRef).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.message.set('Payment confirmation was sent.');
        this.detail.set(typeof result === 'string' ? result : JSON.stringify(result));
      },
      error: (error) => {
        this.loading.set(false);
        this.message.set(errorMessage(error));
      },
    });
  }

  private check(orderId: string): void {
    this.loading.set(true);
    this.api.checkOrder(orderId).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.message.set('Paymob order status');
        this.detail.set(typeof result === 'string' ? result : JSON.stringify(result));
      },
      error: (error) => {
        this.loading.set(false);
        this.message.set(errorMessage(error));
      },
    });
  }
}

function readUnpaid(): UnpaidStay[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(UNPAID_KEY) ?? '[]') as UnpaidStay[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.encodedId) : [];
  } catch {
    return [];
  }
}

function paymentLink(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const value = payload.trim().replace(/^"|"$/g, '');
    return /^https?:\/\//i.test(value) ? value : null;
  }
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const record = payload as Record<string, unknown>;
  for (const key of ['url', 'paymentUrl', 'iframeUrl', 'redirectUrl', 'link', 'paymentLink']) {
    const value = record[key];
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      return value;
    }
  }
  if ('data' in record) {
    return paymentLink(record['data']);
  }
  return null;
}
