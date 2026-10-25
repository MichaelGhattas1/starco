import { lineTotal, stayNights } from './cart.store';
import { CartLine } from './cart.store';
import {
  HOTEL_CHARGES,
  hotelBaseFromTotal,
  hotelChargePercent,
  hotelChargeRate,
  hotelPriceBreakdown,
  quotedHotelBreakdown,
} from './hotel-charges';

describe('hotel charges', () => {
  it('keeps VAT, service, and city tax at 14%, 12%, and 2%', () => {
    expect(HOTEL_CHARGES.vat).toBe(0.14);
    expect(HOTEL_CHARGES.service).toBe(0.12);
    expect(HOTEL_CHARGES.city).toBe(0.02);
    expect(hotelChargeRate()).toBe(0.28);
    expect(hotelChargePercent(hotelChargeRate())).toBe('28%');
  });

  it('calculates a base of 100 as 14 + 12 + 2 and a final total of 128', () => {
    expect(hotelPriceBreakdown(100)).toEqual({
      base: 100,
      vat: 14,
      service: 12,
      city: 2,
      additional: 28,
      total: 128,
    });
  });

  it('keeps the calculated total when no server quote has arrived', () => {
    expect(quotedHotelBreakdown(100, null).total).toBe(128);
    expect(quotedHotelBreakdown(100, undefined).total).toBe(128);
  });

  it('does not apply the 28% twice when the server total is already taxed', () => {
    const taxed = hotelPriceBreakdown(100).total;
    const quoted = quotedHotelBreakdown(100, taxed);
    expect(quoted.vat).toBe(14);
    expect(quoted.service).toBe(12);
    expect(quoted.city).toBe(2);
    expect(quoted.additional).toBe(28);
    expect(quoted.total).toBe(128);
    expect(quoted.total).not.toBe(hotelPriceBreakdown(taxed).total);
  });

  it('recovers the base from a stored hotel total', () => {
    expect(hotelBaseFromTotal(128)).toBe(100);
    expect(quotedHotelBreakdown(hotelBaseFromTotal(512), 512)).toEqual({
      base: 400,
      vat: 56,
      service: 48,
      city: 8,
      additional: 112,
      total: 512,
    });
  });

  it('uses the calculate-price total for a cart stay', () => {
    const line: CartLine = {
      key: 'stay',
      hotelId: 'hotel',
      hotelName: 'Cleopatra',
      roomId: 'room',
      roomName: 'Deluxe',
      checkIn: '2026-10-26',
      checkOut: '2026-10-28',
      adults: 1,
      pricePerNight: 100,
      image: null,
      quote: 256,
    };
    const base = line.pricePerNight * stayNights(line.checkIn, line.checkOut);
    expect(base).toBe(200);
    expect(hotelPriceBreakdown(base).total).toBe(256);
    expect(lineTotal(line)).toBe(256);
  });
});
