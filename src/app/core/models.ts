export const ADMIN_ROLE = 1;

export enum PlazaInnType {
  Hotel = 0,
  Room = 1,
  Restaurant = 2,
  Cafe = 3,
  RestaurantMenu = 4,
  CafeMenu = 5,
  Logo = 6,
  HomeSlider = 7,
  AboutUs = 8,
  AboutUsExtra = 9,
}

export enum RoomType {
  Single = 0,
  Double = 1,
  Suite = 2,
}

export enum Role {
  Admin = 1,
  Member = 2,
  Partner = 3,
}

export const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: RoomType.Single, label: 'Single' },
  { value: RoomType.Double, label: 'Double' },
  { value: RoomType.Suite, label: 'Suite' },
];

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: Role.Admin, label: 'Admin' },
  { value: Role.Member, label: 'Member' },
  { value: Role.Partner, label: 'Partner' },
];

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const ROOM_FEATURES = [
  'haveCoffeCorner',
  'haveAc',
  'haveWifi',
  'haveTv',
  'haveMiniBar',
  'haveBalcony',
  'haveSafeBox',
  'haveHairDryer',
  'haveRoomService',
  'smokingAllowed',
  'extraBedAllowed',
  'isNileView',
] as const;

export const HOTEL_FACILITIES = ['haveSwimingPool', 'haveParking'] as const;

export interface FileDto {
  id: number;
  url: string | null;
}

export interface Hotel {
  id: string | null;
  name: string | null;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  address: string | null;
  addressAr: string | null;
  city: string | null;
  cityAr: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  rating: number;
  instagram: string | null;
  facebook: string | null;
  whatsApp: string | null;
  space: string | null;
  numOfAvailableRoomsToReserve: number;
  numOfAvailableSuitesToReserve: number;
  images: FileDto[] | null;
  logo: FileDto | null;
  insight: Insight | null;
}

export interface HotelLookup {
  id: string | null;
  name: string | null;
  nameAr: string | null;
}

export interface Insight {
  restaurantDescription: string | null;
  restaurantDescriptionAr: string | null;
  restaurantImageIds: FileDto[] | null;
  restaurantMenuPdfIds: FileDto[] | null;
  cafeDescription: string | null;
  cafeDescriptionAr: string | null;
  cafeImageIds: FileDto[] | null;
  cafeMenuPdfIds: FileDto[] | null;
  facilities: Record<string, boolean> | null;
}

export interface Room {
  id: string | null;
  name: string | null;
  nameAr: string | null;
  hotelName: string | null;
  type: RoomType;
  pricePerNight: number;
  extraBed: boolean;
  priceForExtraBed: number;
  maxSleep: number;
  features: Record<string, boolean> | null;
  images: FileDto[] | null;
}

export interface AvailableRoom {
  encodedRoomId: string | null;
  name: string | null;
  nameAr: string | null;
  pricePerNight: number;
  extraBedAvailable: boolean;
  maxSleep: number;
  isAvailable: boolean;
  images: FileDto[] | null;
}

export interface HomeSlider {
  id: number;
  tittle: string | null;
  subTittle: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  images: FileDto[] | null;
}

export interface AboutUs {
  id?: number;
  tittle: string | null;
  subTittle: string | null;
  description: string | null;
  square1ImageId: FileDto | number | null;
  circleImageId: FileDto | number | null;
  square2ImageId: FileDto | number | null;
}

export interface WorkingHour {
  id?: number;
  day: number;
  openTime: string;
  closeTime: string;
}

export interface ContactUs {
  id?: number;
  email: string | null;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsApp: string | null;
  linkedIn: string | null;
  workingHours: WorkingHour[] | null;
}

export interface Partner {
  id: string | null;
  name: string | null;
  email: string | null;
  hotelsIds: string[] | null;
}

export interface UserAccount {
  id: string | null;
  userName: string | null;
  email: string | null;
  role: Role;
}

export interface BookingResult {
  encodedId: string | null;
  encodedHotelId: string | null;
  encodedRoomId: string | null;
  totalPrice: number;
  checkIn: string;
  checkOut: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  isPaid: boolean;
  paymentReference: string | null;
  status: string | null;
}

export interface PriceQuote {
  totalPrice: number;
}

export interface LoginResult {
  message?: string | null;
  token?: string | null;
}

export interface HotelWrite {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  address: string;
  addressAr: string;
  city: string;
  cityAr: string;
  location: string;
  phone: string;
  email: string;
  numOfAvailableRoomsToReserve: number;
  numOfAvailableSuitesToReserve: number;
  rating: number;
  instagram: string | null;
  facebook: string | null;
  whatsApp: string | null;
  space: string | null;
  imageIds: number[];
  logoId: number;
}

export interface RoomWrite {
  hotelId: string;
  name: string;
  nameAr: string;
  type: RoomType;
  pricePerNight: number;
  features: Record<string, boolean>;
  extraBed: boolean;
  priceForExtraBed: number;
  maxSleep: number;
  imageIds: number[];
}

export interface BookingRequest {
  encodedHotelId: string;
  encodedRoomId: string;
  checkIn: string;
  checkOut: string;
  customerName: string;
  customerEmail: string;
}

export interface PaymentRequest {
  encodedBookingId: string;
  amountCents: number;
  currency: string;
  billingData: {
    name: string;
    email: string;
    phone: string;
  };
  items: Record<string, never>[];
}
