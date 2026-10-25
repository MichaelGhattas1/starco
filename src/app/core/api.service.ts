import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { errorMessage } from './api-error';
import { environment } from './environment';
import { NoticeService } from './notice.service';
import {
  AboutUs,
  AvailableRoom,
  BookingQuery,
  BookingRequest,
  BookingResult,
  CatalogLookup,
  ContactUs,
  EventQuery,
  EventWrite,
  FileDto,
  HomeSlider,
  Hotel,
  HotelLookup,
  HotelWrite,
  Insight,
  LoginResult,
  PackageQuery,
  PackageWrite,
  Partner,
  PaymentRequest,
  PlazaEvent,
  PlazaInnType,
  PriceQuote,
  PriceQuoteRequest,
  Room,
  RoomWrite,
  TransportOffer,
  TransportQuery,
  TransportWrite,
  TravelPackage,
  Trip,
  TripQuery,
  TripWrite,
  UserAccount,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly notice = inject(NoticeService);
  private readonly base = environment.apiUrl;

  hotels(): Observable<Hotel[]> {
    return this.get<Hotel[]>('/api/Hotel');
  }

  hotel(id: string): Observable<Hotel> {
    return this.get<Hotel>(`/api/Hotel/${encodeURIComponent(id)}`);
  }

  hotelLookup(): Observable<HotelLookup[]> {
    return this.get<HotelLookup[]>('/api/Hotel/lookup');
  }

  createHotel(body: HotelWrite): Observable<unknown> {
    return this.send('POST', '/api/Hotel', body);
  }

  updateHotel(id: string, body: HotelWrite): Observable<unknown> {
    return this.send('PUT', `/api/Hotel/${encodeURIComponent(id)}`, body);
  }

  deleteHotel(id: string): Observable<unknown> {
    return this.send('DELETE', `/api/Hotel/${encodeURIComponent(id)}`);
  }

  rooms(): Observable<Room[]> {
    return this.get<Room[]>('/api/Room');
  }

  room(id: string): Observable<Room> {
    return this.get<Room>(`/api/Room/${encodeURIComponent(id)}`);
  }

  roomsByHotel(id: string): Observable<Room[]> {
    return this.get<Room[]>(`/api/Room/hotel/${encodeURIComponent(id)}`);
  }

  createRoom(body: RoomWrite): Observable<unknown> {
    return this.send('POST', '/api/Room', body);
  }

  updateRoom(id: string, body: RoomWrite): Observable<unknown> {
    return this.send('PUT', `/api/Room/${encodeURIComponent(id)}`, body);
  }

  deleteRoom(id: string): Observable<unknown> {
    return this.send('DELETE', `/api/Room/${encodeURIComponent(id)}`);
  }

  availability(hotelId: string, checkIn: string, checkOut: string): Observable<AvailableRoom[]> {
    return this.send<AvailableRoom[]>('POST', `/api/hotels/${encodeURIComponent(hotelId)}/rooms`, {
      checkIn,
      checkOut,
    });
  }

  calculatePrice(body: PriceQuoteRequest): Observable<PriceQuote> {
    return this.send<PriceQuote>('POST', '/api/hotels/calculate-price', body);
  }

  createBooking(body: BookingRequest): Observable<BookingResult> {
    return this.send<BookingResult>('POST', '/api/bookings', body);
  }

  confirmPayment(paymentRef: string): Observable<unknown> {
    return this.send('POST', `/api/bookings/confirm-payment?paymentRef=${encodeURIComponent(paymentRef)}`);
  }

  createPayment(body: PaymentRequest): Observable<unknown> {
    return this.send('POST', '/api/Payment/initiate', body);
  }

  checkOrder(paymobOrderId: string): Observable<unknown> {
    return this.send('GET', `/api/Payment/check-order/${encodeURIComponent(paymobOrderId)}`);
  }

  sliders(): Observable<HomeSlider[]> {
    return this.get<HomeSlider[]>('/api/HomeSlider');
  }

  createSlider(body: unknown): Observable<unknown> {
    return this.send('POST', '/api/HomeSlider', body);
  }

  updateSlider(id: number, body: unknown): Observable<unknown> {
    return this.send('PUT', `/api/HomeSlider/${id}`, body);
  }

  deleteSlider(id: number): Observable<unknown> {
    return this.send('DELETE', `/api/HomeSlider/${id}`);
  }

  about(): Observable<AboutUs | null> {
    return this.get<AboutUs | AboutUs[]>('/api/AboutUs').pipe(
      map((value) => (Array.isArray(value) ? (value[0] ?? null) : value)),
    );
  }

  updateAbout(body: unknown): Observable<unknown> {
    return this.send('PUT', '/api/AboutUs', body);
  }

  contact(): Observable<ContactUs | null> {
    return this.get<ContactUs | ContactUs[]>('/api/ContactUs').pipe(
      map((value) => (Array.isArray(value) ? (value[0] ?? null) : value)),
    );
  }

  updateContact(body: unknown): Observable<unknown> {
    return this.send('PUT', '/api/ContactUs', body);
  }

  partners(): Observable<Partner[]> {
    return this.get<Partner[]>('/api/Partner');
  }

  partnersByHotel(hotelId: string): Observable<Partner[]> {
    return this.get<Partner[]>(`/api/Partner/hotel/${encodeURIComponent(hotelId)}`);
  }

  myBookings(query: BookingQuery = {}): Observable<BookingResult[]> {
    return this.get<BookingResult[]>(`/api/bookings/my${toQuery(query)}`);
  }

  adminBookings(query: BookingQuery = {}): Observable<BookingResult[]> {
    return this.get<BookingResult[]>(`/api/admin/bookings${toQuery(query)}`);
  }

  booking(id: string): Observable<BookingResult> {
    return this.get<BookingResult>(`/api/bookings/${encodeURIComponent(id)}`);
  }

  cancelBooking(id: string): Observable<unknown> {
    return this.send('POST', `/api/bookings/${encodeURIComponent(id)}/cancel`);
  }

  trips(query: TripQuery = {}): Observable<Trip[]> {
    return this.get<Trip[]>(`/api/Trip${toQuery(query)}`);
  }

  tripLookup(): Observable<CatalogLookup[]> {
    return this.get<CatalogLookup[]>('/api/Trip/lookup');
  }

  trip(id: string): Observable<Trip> {
    return this.get<Trip>(`/api/Trip/${encodeURIComponent(id)}`);
  }

  createTrip(body: TripWrite): Observable<unknown> {
    return this.send('POST', '/api/Trip', body);
  }

  updateTrip(id: string, body: TripWrite): Observable<unknown> {
    return this.send('PUT', `/api/Trip/${encodeURIComponent(id)}`, body);
  }

  deleteTrip(id: string): Observable<unknown> {
    return this.send('DELETE', `/api/Trip/${encodeURIComponent(id)}`);
  }

  transports(query: TransportQuery = {}): Observable<TransportOffer[]> {
    return this.get<TransportOffer[]>(`/api/Transport${toQuery(query)}`);
  }

  transportLookup(): Observable<CatalogLookup[]> {
    return this.get<CatalogLookup[]>('/api/Transport/lookup');
  }

  transport(id: string): Observable<TransportOffer> {
    return this.get<TransportOffer>(`/api/Transport/${encodeURIComponent(id)}`);
  }

  createTransport(body: TransportWrite): Observable<unknown> {
    return this.send('POST', '/api/Transport', body);
  }

  updateTransport(id: string, body: TransportWrite): Observable<unknown> {
    return this.send('PUT', `/api/Transport/${encodeURIComponent(id)}`, body);
  }

  deleteTransport(id: string): Observable<unknown> {
    return this.send('DELETE', `/api/Transport/${encodeURIComponent(id)}`);
  }

  events(query: EventQuery = {}): Observable<PlazaEvent[]> {
    return this.get<PlazaEvent[]>(`/api/Event${toQuery(query)}`);
  }

  eventLookup(): Observable<CatalogLookup[]> {
    return this.get<CatalogLookup[]>('/api/Event/lookup');
  }

  event(id: string): Observable<PlazaEvent> {
    return this.get<PlazaEvent>(`/api/Event/${encodeURIComponent(id)}`);
  }

  createEvent(body: EventWrite): Observable<unknown> {
    return this.send('POST', '/api/Event', body);
  }

  updateEvent(id: string, body: EventWrite): Observable<unknown> {
    return this.send('PUT', `/api/Event/${encodeURIComponent(id)}`, body);
  }

  deleteEvent(id: string): Observable<unknown> {
    return this.send('DELETE', `/api/Event/${encodeURIComponent(id)}`);
  }

  packages(query: PackageQuery = {}): Observable<TravelPackage[]> {
    return this.get<TravelPackage[]>(`/api/Package${toQuery(query)}`);
  }

  packageLookup(): Observable<CatalogLookup[]> {
    return this.get<CatalogLookup[]>('/api/Package/lookup');
  }

  package(id: string): Observable<TravelPackage> {
    return this.get<TravelPackage>(`/api/Package/${encodeURIComponent(id)}`);
  }

  createPackage(body: PackageWrite): Observable<unknown> {
    return this.send('POST', '/api/Package', body);
  }

  updatePackage(id: string, body: PackageWrite): Observable<unknown> {
    return this.send('PUT', `/api/Package/${encodeURIComponent(id)}`, body);
  }

  deletePackage(id: string): Observable<unknown> {
    return this.send('DELETE', `/api/Package/${encodeURIComponent(id)}`);
  }

  sectionImages(type: PlazaInnType): Observable<FileDto[]> {
    return this.get<unknown>(`/api/section-images?type=${type}`).pipe(map((payload) => asFiles(payload)));
  }

  updateSectionImages(type: PlazaInnType, imagesId: number[]): Observable<unknown> {
    return this.send('PUT', `/api/section-images?type=${type}`, { imagesId });
  }

  createPartner(body: unknown): Observable<unknown> {
    return this.send('POST', '/api/Partner', body);
  }

  updatePartner(id: string, body: unknown): Observable<unknown> {
    return this.send('PUT', `/api/Partner/${encodeURIComponent(id)}`, body);
  }

  deletePartner(id: string): Observable<unknown> {
    return this.send('DELETE', `/api/Partner/${encodeURIComponent(id)}`);
  }

  broadcastPartnerEmail(hotelId: string, subject: string, body: string, attachments: File[]): Observable<unknown> {
    const form = new FormData();
    form.append('Subject', subject);
    form.append('Body', body);
    attachments.forEach((file) => form.append('Attachments', file, file.name));
    return this.send('POST', `/api/Partner/broadcastEmail/hotel/${encodeURIComponent(hotelId)}`, form);
  }

  users(): Observable<UserAccount[]> {
    return this.get<UserAccount[]>('/api/User');
  }

  createUser(body: unknown): Observable<unknown> {
    return this.send('POST', '/api/User', body);
  }

  updateUser(id: string, body: unknown): Observable<unknown> {
    return this.send('PUT', `/api/User/${encodeURIComponent(id)}`, body);
  }

  deleteUser(id: string): Observable<unknown> {
    return this.send('DELETE', `/api/User/${encodeURIComponent(id)}`);
  }

  insight(hotelId: string): Observable<Insight> {
    return this.get<Insight>(`/api/InsightHotel/${encodeURIComponent(hotelId)}`);
  }

  createInsight(body: unknown): Observable<unknown> {
    return this.send('POST', '/api/InsightHotel', body);
  }

  updateInsight(hotelId: string, body: unknown): Observable<unknown> {
    return this.send('PUT', `/api/InsightHotel/${encodeURIComponent(hotelId)}`, body);
  }

  deleteInsight(hotelId: string): Observable<unknown> {
    return this.send('DELETE', `/api/InsightHotel/${encodeURIComponent(hotelId)}`);
  }

  login(email: string, password: string): Observable<LoginResult> {
    return this.http.post<LoginResult>(`${this.base}/api/Account/login`, { email, password });
  }

  register(body: {
    userName: string;
    email: string;
    password: string;
    passwordConfirm: string;
  }): Observable<unknown> {
    return this.send('POST', '/api/Account/register', body);
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.send('POST', '/api/Account/forgot-password', { email });
  }

  resetPassword(body: { email: string; token: string; newPassword: string }): Observable<unknown> {
    return this.send('POST', '/api/Account/reset-password', body);
  }

  upload(type: PlazaInnType, files: File[]): Observable<unknown> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file, file.name));
    return this.send('POST', `/api/upload?type=${type}`, form);
  }

  private get<T>(path: string): Observable<T> {
    return this.send<T>('GET', path);
  }

  private send<T>(method: string, path: string, body?: unknown): Observable<T> {
    const toast = writesRecord(method, path);
    return this.http
      .request(method, `${this.base}${path}`, {
        body,
        responseType: 'text',
      })
      .pipe(
        map((text) => {
          const data = unwrap<T>(text);
          if (toast) {
            const message = responseMessage(text);
            if (message) {
              this.notice.apiSuccess(message);
            }
          }
          return data;
        }),
        catchError((error: unknown) => {
          if (toast) {
            this.notice.error(errorMessage(error));
          }
          return throwError(() => error);
        }),
      );
  }
}

function writesRecord(method: string, path: string): boolean {
  if (method === 'GET' || method === 'HEAD') {
    return false;
  }
  if (path.includes('/calculate-price') || path.includes('/api/Payment/') || path.includes('/confirm-payment')) {
    return false;
  }
  if (/\/api\/hotels\/[^/]+\/rooms(?:\?|$)/.test(path)) {
    return false;
  }
  if (path.includes('/api/Account/forgot-password') || path.includes('/api/Account/reset-password')) {
    return false;
  }
  return true;
}

function responseMessage(text: string): string | null {
  if (!text) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as { message?: unknown };
    if (typeof parsed.message === 'string' && parsed.message.trim() && !looksTechnical(parsed.message)) {
      return parsed.message.trim();
    }
  } catch {
    return null;
  }
  return null;
}

function looksTechnical(value: string): boolean {
  return value.length > 240 || /at\s+\S+\s+\(/.test(value) || /stack trace/i.test(value);
}

function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

function asFiles(payload: unknown): FileDto[] {
  const value = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { images?: unknown }).images)
      ? (payload as { images: unknown[] }).images
      : [];
  return value.flatMap((item) => {
    if (typeof item === 'number') {
      return [{ id: item, url: null }];
    }
    if (item && typeof item === 'object' && typeof (item as FileDto).id === 'number') {
      const file = item as FileDto;
      return [{ id: file.id, url: file.url ?? null }];
    }
    return [];
  });
}

function unwrap<T>(text: string): T {
  if (!text) {
    return null as T;
  }
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text as T;
  }
  if (parsed && typeof parsed === 'object' && 'success' in parsed && 'data' in parsed) {
    const envelope = parsed as { success?: boolean; data?: T; message?: string; error?: string };
    if (envelope.success === false) {
      throw new Error(envelope.message || envelope.error || 'Request failed');
    }
    return envelope.data as T;
  }
  return parsed as T;
}
