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
  Trip = 10,
  Transport = 11,
  Event = 12,
  Package = 13,
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

export enum BookingType {
  Hotel = 0,
  Trip = 1,
  Transport = 2,
  Event = 3,
  Package = 4,
}

export enum BookingStatus {
  Pending = 0,
  Confirmed = 1,
  Cancelled = 2,
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
  bookingType?: number | string | null;
  encodedHotelId: string | null;
  encodedRoomId: string | null;
  encodedTripId?: string | null;
  encodedTransportId?: string | null;
  encodedEventId?: string | null;
  encodedPackageId?: string | null;
  itemName?: string | null;
  itemNameAr?: string | null;
  hotelName?: string | null;
  hotelNameAr?: string | null;
  roomName?: string | null;
  roomNameAr?: string | null;
  serviceDate?: string | null;
  quantity?: number | null;
  adults?: number | null;
  children?: number | null;
  roomsBooked?: number | null;
  extraBed?: boolean | null;
  totalPrice: number;
  checkIn: string;
  checkOut: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  isPaid: boolean;
  paymentReference: string | null;
  status: string | number | null;
  createdAt?: string | null;
}

export interface PriceQuoteRequest {
  encodedHotelId: string;
  encodedRoomId: string;
  roomsCount: number;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  extraBed: boolean;
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
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingType?: BookingType;
  encodedHotelId?: string;
  encodedRoomId?: string;
  roomsCount?: number;
  adults?: number;
  children?: number;
  checkIn?: string;
  checkOut?: string;
  extraBed?: boolean;
  encodedTripId?: string;
  encodedTransportId?: string;
  encodedEventId?: string;
  encodedPackageId?: string;
  serviceDate?: string;
  quantity?: number;
}

export interface BookingQuery {
  hotelId?: number | null;
  from?: string | null;
  to?: string | null;
  status?: BookingStatus | null;
  bookingType?: BookingType | null;
}

export interface CatalogLookup {
  id: string | null;
  name: string | null;
  nameAr: string | null;
}

export interface Trip {
  id: string | null;
  name: string | null;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  city: string | null;
  cityAr: string | null;
  itinerary: string | null;
  itineraryAr: string | null;
  durationDays: number;
  durationHours: number;
  pricePerPerson: number;
  pricePerChild: number;
  maxCapacity: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  images: FileDto[] | null;
}

export interface TripWrite {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  city: string;
  cityAr: string;
  itinerary: string;
  itineraryAr: string;
  durationDays: number;
  durationHours: number;
  pricePerPerson: number;
  pricePerChild: number;
  maxCapacity: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  imageIds: number[];
}

export interface TripQuery {
  City?: string;
  Search?: string;
  Date?: string;
  MinPrice?: number | null;
  MaxPrice?: number | null;
  IsActive?: boolean | null;
}

export interface TransportOffer {
  id: string | null;
  name: string | null;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  vehicleType: string | null;
  vehicleTypeAr: string | null;
  pickupLocation: string | null;
  pickupLocationAr: string | null;
  dropoffLocation: string | null;
  dropoffLocationAr: string | null;
  maxPassengers: number;
  maxLuggage: number;
  pricePerTrip: number;
  availableVehicles: number;
  isActive: boolean;
  images: FileDto[] | null;
}

export interface TransportWrite {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  vehicleType: string;
  vehicleTypeAr: string;
  pickupLocation: string;
  pickupLocationAr: string;
  dropoffLocation: string;
  dropoffLocationAr: string;
  maxPassengers: number;
  maxLuggage: number;
  pricePerTrip: number;
  availableVehicles: number;
  isActive: boolean;
  imageIds: number[];
}

export interface TransportQuery {
  Search?: string;
  VehicleType?: string;
  PickupLocation?: string;
  DropoffLocation?: string;
  Passengers?: number | null;
  MinPrice?: number | null;
  MaxPrice?: number | null;
  IsActive?: boolean | null;
}

export interface PlazaEvent {
  id: string | null;
  name: string | null;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  location: string | null;
  locationAr: string | null;
  eventDate: string;
  endDate: string | null;
  ticketPrice: number;
  totalTickets: number;
  isActive: boolean;
  images: FileDto[] | null;
}

export interface EventWrite {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  location: string;
  locationAr: string;
  eventDate: string;
  endDate?: string | null;
  ticketPrice: number;
  totalTickets: number;
  isActive: boolean;
  imageIds: number[];
}

export interface EventQuery {
  Search?: string;
  Location?: string;
  Date?: string;
  MinPrice?: number | null;
  MaxPrice?: number | null;
  IsActive?: boolean | null;
}

export interface TravelPackage {
  id: string | null;
  name: string | null;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  durationDays: number;
  packagePrice: number;
  maxPackagesAvailable: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  images: FileDto[] | null;
  hotelId: string | null;
  hotelName: string | null;
  hotelNameAr: string | null;
  roomId: string | null;
  roomName: string | null;
  roomNameAr: string | null;
  nightsCount: number | null;
  trips: CatalogLookup[] | null;
  transports: CatalogLookup[] | null;
  events: CatalogLookup[] | null;
}

export interface PackageWrite {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  durationDays: number;
  packagePrice: number;
  maxPackagesAvailable: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  imageIds: number[];
  hotelId?: string | null;
  roomId?: string | null;
  nightsCount?: number | null;
  tripIds?: string[];
  transportIds?: string[];
  eventIds?: string[];
}

export interface PackageQuery {
  Search?: string;
  Date?: string;
  MinPrice?: number | null;
  MaxPrice?: number | null;
  DurationDays?: number | null;
  IncludesHotel?: boolean | null;
  IsActive?: boolean | null;
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

export function pairedName(en: string | null | undefined, ar: string | null | undefined): string {
  const english = en?.trim() ?? '';
  const arabic = ar?.trim() ?? '';
  if (english && arabic && english !== arabic) {
    return `${english} · ${arabic}`;
  }
  return english || arabic;
}

export function bookingTypeLabel(value: number | string | null | undefined): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  switch (value) {
    case BookingType.Hotel:
      return 'Hotel';
    case BookingType.Trip:
      return 'Trip';
    case BookingType.Transport:
      return 'Transport';
    case BookingType.Event:
      return 'Event';
    case BookingType.Package:
      return 'Package';
    default:
      return value == null ? 'Booking' : `Type ${value}`;
  }
}

export function bookingStatusLabel(value: number | string | null | undefined): string {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  switch (value) {
    case BookingStatus.Pending:
      return 'Pending';
    case BookingStatus.Confirmed:
      return 'Confirmed';
    case BookingStatus.Cancelled:
      return 'Cancelled';
    default:
      return value == null ? 'Open' : `Status ${value}`;
  }
}
