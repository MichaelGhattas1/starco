/**
 * Hotel stay charges. Plaza has no tax-settings endpoint.
 * POST /api/hotels/calculate-price already returns base × (1 + 28%).
 * Each rate is applied to the base room price, not to a price that already includes another charge.
 */
export const HOTEL_CHARGES = {
  vat: 0.14,
  service: 0.12,
  city: 0.02,
} as const;

export interface HotelStayRef {
  bookingType?: number | string | null;
  encodedHotelId?: string | null;
  encodedTripId?: string | null;
  encodedTransportId?: string | null;
  encodedEventId?: string | null;
  encodedPackageId?: string | null;
}

export interface HotelPriceBreakdown {
  base: number;
  vat: number;
  service: number;
  city: number;
  additional: number;
  total: number;
}

export function hotelChargeRate(): number {
  return roundMoney(HOTEL_CHARGES.vat + HOTEL_CHARGES.service + HOTEL_CHARGES.city);
}

export function hotelChargePercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function hotelPriceBreakdown(base: number): HotelPriceBreakdown {
  const amount = roundMoney(finite(base));
  const vat = roundMoney(amount * HOTEL_CHARGES.vat);
  const service = roundMoney(amount * HOTEL_CHARGES.service);
  const city = roundMoney(amount * HOTEL_CHARGES.city);
  const additional = roundMoney(vat + service + city);
  return {
    base: amount,
    vat,
    service,
    city,
    additional,
    total: roundMoney(amount + additional),
  };
}

/** Recover the untaxed base from a server total that already includes the 28%. */
export function hotelBaseFromTotal(total: number): number {
  return roundMoney(finite(total) / (1 + hotelChargeRate()));
}

/**
 * `quote` is the calculate-price or booking total and already includes the 28%.
 * It is used as the final amount and is not taxed again.
 */
export function quotedHotelBreakdown(base: number, quote: number | null | undefined): HotelPriceBreakdown {
  const built = hotelPriceBreakdown(base);
  if (quote == null || !Number.isFinite(Number(quote))) {
    return built;
  }
  return { ...built, total: roundMoney(Number(quote)) };
}

export function isHotelBooking(stay: HotelStayRef): boolean {
  const type = stay.bookingType;
  if (type === 0 || type === 'Hotel') {
    return true;
  }
  if (typeof type === 'string' && type.trim()) {
    return type.trim().toLowerCase() === 'hotel';
  }
  if (typeof type === 'number') {
    return false;
  }
  return !!stay.encodedHotelId && !stay.encodedTripId && !stay.encodedTransportId && !stay.encodedEventId && !stay.encodedPackageId;
}

export interface HotelChargeLabels {
  base: string;
  vat: string;
  service: string;
  city: string;
  additional: string;
  total: string;
  note: string;
  caption: string;
}

export function hotelChargeLabels(isAr: boolean): HotelChargeLabels {
  const vat = hotelChargePercent(HOTEL_CHARGES.vat);
  const service = hotelChargePercent(HOTEL_CHARGES.service);
  const city = hotelChargePercent(HOTEL_CHARGES.city);
  const additional = hotelChargePercent(hotelChargeRate());
  if (isAr) {
    return {
      base: 'سعر الغرفة الأساسي',
      vat: `ضريبة القيمة المضافة (${vat})`,
      service: `رسم الخدمة (${service})`,
      city: `ضريبة المدينة والإضافات (${city})`,
      additional: `إجمالي الرسوم الإضافية (${additional})`,
      total: 'السعر النهائي',
      note: 'تُحسب كل رسوم على سعر الغرفة الأساسي.',
      caption: 'تفصيل السعر',
    };
  }
  return {
    base: 'Base room price',
    vat: `VAT (${vat})`,
    service: `Service charge (${service})`,
    city: `City tax & extras (${city})`,
    additional: `Total additional charges (${additional})`,
    total: 'Final total price',
    note: 'Each charge is calculated on the base room price.',
    caption: 'Price breakdown',
  };
}

function finite(value: number): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
