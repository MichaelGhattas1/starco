import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { CartStore, stayNights } from '../core/cart.store';
import { LocaleService } from '../core/locale.service';
import { NoticeService } from '../core/notice.service';
import { CurrencyService } from '../core/currency.service';
import { firstImage, inputDate, mediaUrl, nextDate, toApiDateTime } from '../core/media';
import { AvailableRoom, FileDto, Hotel, Room, RoomType } from '../core/models';
import { HotelPrice } from '../shared/hotel-price';

@Component({
  selector: 'app-hotel-detail-page',
  imports: [ReactiveFormsModule, RouterLink, HotelPrice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hotel-detail.page.html',
})
export class HotelDetailPage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly sanitizer = inject(DomSanitizer);
  readonly locale = inject(LocaleService);
  readonly currency = inject(CurrencyService);
  readonly cart = inject(CartStore);
  private readonly notice = inject(NoticeService);
  private readonly roomDialog = viewChild<ElementRef<HTMLDialogElement>>('roomDialog');
  readonly openRoom = signal<AvailableRoom | null>(null);
  readonly roomRecord = signal<Room | null>(null);
  readonly roomBusy = signal(false);
  readonly roomPhoto = signal(0);

  readonly hotel = signal<Hotel | null>(null);
  readonly rooms = signal<AvailableRoom[]>([]);
  readonly loading = signal(true);
  readonly roomsLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly roomsError = signal<string | null>(null);
  readonly activeImage = signal(0);
  readonly mediaUrl = mediaUrl;
  readonly nights = stayNights;

  readonly today = inputDate(0);
  readonly minCheckOut = signal(nextDate(inputDate(1)));
  readonly form = inject(FormBuilder).nonNullable.group({
    adults: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    checkIn: [inputDate(1)],
    checkOut: [inputDate(3)],
  });

  readonly name = computed(() => this.locale.pick(this.hotel()?.name, this.hotel()?.nameAr) || this.locale.t('noun.hotel'));
  readonly city = computed(() => this.locale.pick(this.hotel()?.city, this.hotel()?.cityAr));
  readonly description = computed(() =>
    this.locale.pick(this.hotel()?.description, this.hotel()?.descriptionAr),
  );
  readonly address = computed(() => this.locale.pick(this.hotel()?.address, this.hotel()?.addressAr));
  readonly mapEmbed = computed(() => {
    const url = googleMapEmbed(this.hotel()?.location, this.address(), this.city());
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
  readonly gallery = computed(() => this.hotel()?.images ?? []);
  readonly photo = computed(() => mediaUrl(this.gallery()[this.activeImage()]?.url) || firstImage(this.gallery()));
  readonly facilities = computed(() => Object.entries(this.hotel()?.insight?.facilities ?? {}));
  readonly restaurantText = computed(() =>
    this.locale.pick(this.hotel()?.insight?.restaurantDescription, this.hotel()?.insight?.restaurantDescriptionAr),
  );
  readonly cafeText = computed(() =>
    this.locale.pick(this.hotel()?.insight?.cafeDescription, this.hotel()?.insight?.cafeDescriptionAr),
  );
  readonly restaurantImages = computed(() => this.photos(this.hotel()?.insight?.restaurantImageIds));
  readonly cafeImages = computed(() => this.photos(this.hotel()?.insight?.cafeImageIds));
  readonly restaurantMenus = computed(() => this.menus(this.hotel()?.insight?.restaurantMenuPdfIds));
  readonly cafeMenus = computed(() => this.menus(this.hotel()?.insight?.cafeMenuPdfIds));
  readonly showRestaurant = computed(
    () => !!this.restaurantText() || this.restaurantImages().length > 0 || this.restaurantMenus().length > 0,
  );
  readonly showCafe = computed(
    () => !!this.cafeText() || this.cafeImages().length > 0 || this.cafeMenus().length > 0,
  );

  constructor() {
    this.title.setTitle('Hotel · Plaza Inn');
    this.form.controls.checkIn.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => this.alignCheckout(value));
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const adults = Number(params.get('adults'));
      if (Number.isInteger(adults) && adults >= 1 && adults <= 20) {
        this.form.controls.adults.setValue(adults);
      }
      const checkIn = params.get('checkIn');
      const checkOut = params.get('checkOut');
      if (checkIn) {
        this.form.controls.checkIn.setValue(checkIn, { emitEvent: false });
      }
      if (checkOut) {
        this.form.controls.checkOut.setValue(checkOut, { emitEvent: false });
      }
      this.alignCheckout(this.form.controls.checkIn.value);
    });
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.loading.set(true);
          this.error.set(null);
          return this.api.hotel(params.get('id') ?? '');
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (hotel) => {
          this.hotel.set(hotel);
          this.activeImage.set(0);
          this.loading.set(false);
          this.title.setTitle(`${this.locale.pick(hotel.name, hotel.nameAr) || this.locale.t('noun.hotel')} · ${this.locale.t('brand.plaza')}`);
          this.loadRooms();
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }

  alignCheckout(checkIn: string): void {
    let start = checkIn;
    if (!start || start < this.today) {
      start = this.today;
      this.form.controls.checkIn.setValue(start, { emitEvent: false });
    }
    const minOut = nextDate(start);
    this.minCheckOut.set(minOut);
    if (this.form.controls.checkOut.value <= start) {
      this.form.controls.checkOut.setValue(minOut, { emitEvent: false });
    }
  }

  loadRooms(): void {
    const hotel = this.hotel();
    this.alignCheckout(this.form.controls.checkIn.value);
    const { checkIn, checkOut, adults } = this.form.getRawValue();
    if (!hotel?.id) {
      return;
    }
    if (checkIn < this.today) {
      this.roomsError.set(this.locale.t('hotel.checkInPast'));
      this.rooms.set([]);
      return;
    }
    if (!checkOut || checkOut <= checkIn) {
      this.roomsError.set(this.locale.t('hotel.checkoutAfter'));
      this.rooms.set([]);
      return;
    }
    const guestCount = Number(adults);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      this.roomsError.set(this.locale.t('hotel.adultsMin'));
      this.rooms.set([]);
      return;
    }
    this.roomsLoading.set(true);
    this.roomsError.set(null);
    this.api.availability(hotel.id, toApiDateTime(checkIn, 12), toApiDateTime(checkOut, 12)).subscribe({
      next: (rooms) => {
        const fitted = rooms.filter((room) => !room.maxSleep || room.maxSleep >= guestCount);
        this.rooms.set(fitted);
        if (!fitted.length && rooms.length) {
          this.roomsError.set(this.locale.t('hotel.noSleep', { n: guestCount }));
        }
        this.roomsLoading.set(false);
      },
      error: (error) => {
        this.roomsError.set(errorMessage(error));
        this.roomsLoading.set(false);
      },
    });
  }

  roomName(room: AvailableRoom | Room): string {
    return this.locale.pick(room.name, room.nameAr) || this.locale.t('noun.room');
  }

  roomTypeLabel(type: RoomType | null | undefined): string {
    if (type === RoomType.Double) {
      return this.locale.t('hotel.double');
    }
    if (type === RoomType.Suite) {
      return this.locale.t('hotel.suite');
    }
    return this.locale.t('hotel.single');
  }

  roomFeatures(room: Room | null): [string, boolean][] {
    return Object.entries(room?.features ?? {}).filter((entry) => entry[1]);
  }

  roomPhotos(): string[] {
    const files = this.roomRecord()?.images?.length ? this.roomRecord()?.images : this.openRoom()?.images;
    return (files ?? []).map((file) => mediaUrl(file.url)).filter((url): url is string => !!url);
  }

  showRoom(room: AvailableRoom): void {
    this.openRoom.set(room);
    this.roomRecord.set(null);
    this.roomPhoto.set(0);
    this.roomBusy.set(true);
    setTimeout(() => {
      const dialog = this.roomDialog()?.nativeElement;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    });
    const id = room.encodedRoomId;
    if (!id) {
      this.roomBusy.set(false);
      return;
    }
    this.api.room(id).subscribe({
      next: (record) => {
        this.roomRecord.set(record);
        this.roomBusy.set(false);
      },
      error: () => this.roomBusy.set(false),
    });
  }

  closeRoom(): void {
    this.roomDialog()?.nativeElement.close();
  }

  inCart(room: AvailableRoom): boolean {
    const hotelId = this.hotel()?.id;
    const roomId = room.encodedRoomId;
    if (!hotelId || !roomId) {
      return false;
    }
    const { checkIn, checkOut } = this.form.getRawValue();
    return this.cart.has(hotelId, roomId, checkIn, checkOut);
  }

  stayBase(room: AvailableRoom): number {
    const { checkIn, checkOut } = this.form.getRawValue();
    return (Number(room.pricePerNight) || 0) * this.nights(checkIn, checkOut);
  }

  nightWord(count: number): string {
    return this.locale.t(count === 1 ? 'noun.night' : 'noun.nights');
  }

  addToCart(room: AvailableRoom): void {
    this.alignCheckout(this.form.controls.checkIn.value);
    const stay = this.hotel();
    const { checkIn, checkOut, adults } = this.form.getRawValue();
    const guestCount = Number(adults);
    if (!stay?.id || !room.encodedRoomId) {
      return;
    }
    if (checkIn < this.today || !checkOut || checkOut <= checkIn) {
      this.roomsError.set(this.locale.t('hotel.checkoutAfter'));
      return;
    }
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
      this.roomsError.set(this.locale.t('hotel.adultsRange'));
      return;
    }
    const added = this.cart.add({
      hotelId: stay.id,
      hotelName: this.name(),
      roomId: room.encodedRoomId,
      roomName: this.roomName(room),
      checkIn,
      checkOut,
      adults: guestCount,
      pricePerNight: Number(room.pricePerNight) || 0,
      image: mediaUrl(room.images?.[0]?.url),
    });
    this.roomsError.set(null);
    this.notice.success(added ? `${this.roomName(room)} added to your cart.` : 'This stay is already in your cart.');
  }

  menuName(kind: string, index: number, total: number): string {
    const label = kind === 'Cafe' ? this.locale.t('hotel.cafe') : this.locale.t('hotel.restaurant');
    return total > 1
      ? this.locale.t('hotel.menuN', { kind: label, n: index + 1 })
      : this.locale.t('hotel.menu', { kind: label });
  }

  private photos(files: FileDto[] | null | undefined): string[] {
    return (files ?? []).map((file) => mediaUrl(file.url)).filter((url): url is string => !!url);
  }

  private menus(files: FileDto[] | null | undefined): { id: number; url: string }[] {
    return (files ?? []).flatMap((file) => {
      const url = mediaUrl(file.url);
      return url ? [{ id: file.id, url }] : [];
    });
  }
}

function googleMapEmbed(location: string | null | undefined, address: string, city: string): string | null {
  const fromLink = mapsLinkEmbed(location);
  if (fromLink) {
    return fromLink;
  }
  const query = [address, city].map((part) => part.trim()).filter(Boolean).join(', ');
  return query ? embedQuery(query) : null;
}

function mapsLinkEmbed(location: string | null | undefined): string | null {
  const raw = (location ?? '').trim();
  if (!raw) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== 'google.com' && !host.endsWith('.google.com')) {
    return null;
  }
  if (/\/maps\/embed/i.test(url.pathname) || url.searchParams.get('output') === 'embed') {
    url.protocol = 'https:';
    return url.toString();
  }
  const query = url.searchParams.get('q') || url.searchParams.get('query');
  if (query?.trim()) {
    return embedQuery(query.trim());
  }
  const at = url.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    return embedQuery(`${at[1]},${at[2]}`);
  }
  const place = url.pathname.match(/\/maps\/place\/([^/@]+)/);
  if (place?.[1]) {
    return embedQuery(decodeURIComponent(place[1].replace(/\+/g, ' ')));
  }
  return null;
}

function embedQuery(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}
