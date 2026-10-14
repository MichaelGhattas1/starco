import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from './environment';
import {
  AboutUs,
  AvailableRoom,
  BookingRequest,
  BookingResult,
  ContactUs,
  HomeSlider,
  Hotel,
  HotelLookup,
  HotelWrite,
  Insight,
  LoginResult,
  Partner,
  PaymentRequest,
  PlazaInnType,
  PriceQuote,
  Room,
  RoomWrite,
  UserAccount,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
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

  calculatePrice(body: BookingRequest): Observable<PriceQuote> {
    return this.send<PriceQuote>('POST', '/api/hotels/calculate-price', body);
  }

  createBooking(body: BookingRequest): Observable<BookingResult> {
    return this.send<BookingResult>('POST', '/api/bookings', body);
  }

  confirmPayment(paymentRef: string): Observable<unknown> {
    return this.send('POST', `/api/bookings/confirm-payment?paymentRef=${encodeURIComponent(paymentRef)}`);
  }

  createPayment(body: PaymentRequest): Observable<unknown> {
    return this.send('POST', '/api/Payment/test', body);
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
    return this.http
      .request(method, `${this.base}${path}`, {
        body,
        responseType: 'text',
      })
      .pipe(map((text) => unwrap<T>(text)));
  }
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
