import { environment } from './environment';
import { FileDto } from './models';

export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const path = url.replace(/^wwwroot\//, '').replace(/^\/+/, '');
  return `${environment.apiUrl}/${path}`;
}

export function firstImage(files: FileDto[] | null | undefined): string | null {
  return mediaUrl(files?.[0]?.url);
}

export function fileId(value: FileDto | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return value;
  }
  return value?.id ?? null;
}

export function extractIds(payload: unknown): number[] {
  if (payload == null) {
    return [];
  }
  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return [payload];
  }
  if (typeof payload === 'string' && /^\d+$/.test(payload.trim())) {
    return [Number(payload)];
  }
  if (Array.isArray(payload)) {
    return [...new Set(payload.flatMap((item) => extractIds(item)))];
  }
  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if ('data' in record) {
      return extractIds(record['data']);
    }
    if ('id' in record) {
      return extractIds(record['id']);
    }
    if ('ids' in record) {
      return extractIds(record['ids']);
    }
  }
  return [];
}

export function inputDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return formatInputDate(date);
}

export function nextDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return inputDate(1);
  }
  parsed.setDate(parsed.getDate() + 1);
  return formatInputDate(parsed);
}

function formatInputDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function toApiDateTime(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, '0')}:00:00`;
}

export function money(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2,
  }).format(amount);
}

const FEATURE_LABELS: Record<string, string> = {
  haveSwimingPool: 'Swimming pool',
  haveParking: 'Parking',
  cafe: 'Cafe',
  haveCoffeCorner: 'Coffee corner',
  haveAc: 'Air conditioning',
  haveWifi: 'Wi-Fi',
  haveTv: 'Television',
  haveMiniBar: 'Mini bar',
  haveBalcony: 'Balcony',
  haveSafeBox: 'Safe box',
  haveHairDryer: 'Hair dryer',
  haveRoomService: 'Room service',
  smokingAllowed: 'Smoking allowed',
  extraBedAllowed: 'Extra bed allowed',
  isNileView: 'Nile view',
};

export function featureLabel(key: string): string {
  return (
    FEATURE_LABELS[key] ??
    key
      .replace(/^have/, '')
      .replace(/^is/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
  );
}
