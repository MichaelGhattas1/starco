import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CartStore } from '../core/cart.store';
import { mediaUrl, toApiDateTime } from '../core/media';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-reserve-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p role="status">{{ locale.t('load.cart') }}</p>`,
})
export class ReservePage {
  readonly locale = inject(LocaleService);

  constructor() {
    inject(Title).setTitle('Cart · Plaza Inn');
    const route = inject(ActivatedRoute);
    const router = inject(Router);
    const api = inject(ApiService);
    const cart = inject(CartStore);
    const locale = this.locale;
    const hotelId = route.snapshot.paramMap.get('hotelId') ?? '';
    const roomId = route.snapshot.paramMap.get('roomId') ?? '';
    const checkIn = route.snapshot.queryParamMap.get('checkIn') ?? '';
    const checkOut = route.snapshot.queryParamMap.get('checkOut') ?? '';
    const adults = Number(route.snapshot.queryParamMap.get('adults') ?? '1');
    const guestCount = Number.isInteger(adults) && adults >= 1 && adults <= 20 ? adults : 1;

    const go = () => void router.navigate(['/cart'], { replaceUrl: true });
    if (!hotelId || !roomId || !checkIn || !checkOut) {
      go();
      return;
    }

    api.hotel(hotelId).subscribe({
      next: (hotel) => {
        const hotelName = locale.pick(hotel.name, hotel.nameAr) || locale.t('noun.hotel');
        api.availability(hotelId, toApiDateTime(checkIn, 12), toApiDateTime(checkOut, 12)).subscribe({
          next: (rooms) => {
            const room = rooms.find((item) => item.encodedRoomId === roomId);
            cart.add({
              hotelId,
              hotelName,
              roomId,
              roomName: locale.pick(room?.name, room?.nameAr) || locale.t('noun.room'),
              checkIn,
              checkOut,
              adults: guestCount,
              pricePerNight: Number(room?.pricePerNight) || 0,
              image: mediaUrl(room?.images?.[0]?.url),
            });
            go();
          },
          error: () => {
            cart.add({
              hotelId,
              hotelName,
              roomId,
              roomName: locale.t('noun.room'),
              checkIn,
              checkOut,
              adults: guestCount,
              pricePerNight: 0,
              image: null,
            });
            go();
          },
        });
      },
      error: () => go(),
    });
  }
}
