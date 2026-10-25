import { Injectable, computed, signal } from '@angular/core';
import { quotedHotelBreakdown } from './hotel-charges';

const CART_KEY = 'plaza_cart';
export const UNPAID_KEY = 'plaza_unpaid_bookings';

export interface UnpaidStay {
  encodedId: string;
  totalPrice: number;
  label: string;
  name: string;
  email: string;
  phone: string;
}

export interface CartLine {
  key: string;
  hotelId: string;
  hotelName: string;
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  pricePerNight: number;
  image: string | null;
  quote: number | null;
}

export interface CartDraft {
  hotelId: string;
  hotelName: string;
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  pricePerNight: number;
  image: string | null;
}

export function stayNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return nights > 0 ? nights : 1;
}

export function lineBase(line: CartLine): number {
  return line.pricePerNight * stayNights(line.checkIn, line.checkOut);
}

export function lineTotal(line: CartLine): number {
  return quotedHotelBreakdown(lineBase(line), line.quote).total;
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  readonly lines = signal<CartLine[]>(readCart());
  readonly count = computed(() => this.lines().length);
  readonly total = computed(() => this.lines().reduce((sum, line) => sum + lineTotal(line), 0));

  add(draft: CartDraft): boolean {
    const key = cartKey(draft.hotelId, draft.roomId, draft.checkIn, draft.checkOut);
    if (this.lines().some((line) => line.key === key)) {
      return false;
    }
    this.lines.update((lines) => [...lines, { ...draft, key, quote: null }]);
    this.persist();
    return true;
  }

  has(hotelId: string, roomId: string, checkIn: string, checkOut: string): boolean {
    const key = cartKey(hotelId, roomId, checkIn, checkOut);
    return this.lines().some((line) => line.key === key);
  }

  remove(key: string): void {
    this.lines.update((lines) => lines.filter((line) => line.key !== key));
    this.persist();
  }

  setQuote(key: string, quote: number): void {
    this.lines.update((lines) => lines.map((line) => (line.key === key ? { ...line, quote } : line)));
    this.persist();
  }

  clear(): void {
    this.lines.set([]);
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(CART_KEY, JSON.stringify(this.lines()));
  }
}

function cartKey(hotelId: string, roomId: string, checkIn: string, checkOut: string): string {
  return `${hotelId}|${roomId}|${checkIn}|${checkOut}`;
}

function readCart(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as CartLine[];
    return Array.isArray(parsed) ? parsed.filter((line) => line?.hotelId && line?.roomId && line?.checkIn && line?.checkOut) : [];
  } catch {
    return [];
  }
}
