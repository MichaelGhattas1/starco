import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { errorMessage } from '../core/api-error';
import { ApiService } from '../core/api.service';
import { CartStore } from '../core/cart.store';
import { LocaleService } from '../core/locale.service';
import { NoticeService } from '../core/notice.service';
import { featureLabel, firstImage, inputDate, mediaUrl, nextDate, toApiDateTime } from '../core/media';
import { AvailableRoom, FileDto, Hotel } from '../core/models';

@Component({
  selector: 'app-hotel-detail-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hotel-detail.page.html',
})
export class HotelDetailPage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  readonly locale = inject(LocaleService);
  readonly cart = inject(CartStore);
  private readonly notice = inject(NoticeService);

  readonly hotel = signal<Hotel | null>(null);
  readonly rooms = signal<AvailableRoom[]>([]);
  readonly loading = signal(true);
  readonly roomsLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly roomsError = signal<string | null>(null);
  readonly activeImage = signal(0);
  readonly featureLabel = featureLabel;
  readonly mediaUrl = mediaUrl;

  readonly today = inputDate(0);
  readonly minCheckOut = signal(nextDate(inputDate(1)));
  readonly form = inject(FormBuilder).nonNullable.group({
    adults: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    checkIn: [inputDate(1)],
    checkOut: [inputDate(3)],
  });

  readonly name = computed(() => this.locale.pick(this.hotel()?.name, this.hotel()?.nameAr) || 'Hotel');
  readonly city = computed(() => this.locale.pick(this.hotel()?.city, this.hotel()?.cityAr));
  readonly description = computed(() =>
    this.locale.pick(this.hotel()?.description, this.hotel()?.descriptionAr),
  );
  readonly address = computed(() => this.locale.pick(this.hotel()?.address, this.hotel()?.addressAr));
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
          this.title.setTitle(`${this.locale.pick(hotel.name, hotel.nameAr) || 'Hotel'} · Plaza Inn`);
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
      this.roomsError.set('Check-in cannot be before today.');
      this.rooms.set([]);
      return;
    }
    if (!checkOut || checkOut <= checkIn) {
      this.roomsError.set('Choose a check-out date after check-in.');
      this.rooms.set([]);
      return;
    }
    const guestCount = Number(adults);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      this.roomsError.set('Enter at least 1 adult.');
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
          this.roomsError.set(`No rooms sleep ${guestCount} adults for these dates.`);
        }
        this.roomsLoading.set(false);
      },
      error: (error) => {
        this.roomsError.set(errorMessage(error));
        this.roomsLoading.set(false);
      },
    });
  }

  roomName(room: AvailableRoom): string {
    return this.locale.pick(room.name, room.nameAr) || 'Room';
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

  addToCart(room: AvailableRoom): void {
    this.alignCheckout(this.form.controls.checkIn.value);
    const stay = this.hotel();
    const { checkIn, checkOut, adults } = this.form.getRawValue();
    const guestCount = Number(adults);
    if (!stay?.id || !room.encodedRoomId) {
      return;
    }
    if (checkIn < this.today || !checkOut || checkOut <= checkIn) {
      this.roomsError.set('Choose a check-out date after check-in.');
      return;
    }
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
      this.roomsError.set('Enter 1 to 20 adults.');
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
    return total > 1 ? `${kind} menu ${index + 1}` : `${kind} menu`;
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
