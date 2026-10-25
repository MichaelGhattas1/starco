import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/public-shell').then((m) => m.PublicShell),
    children: [
      { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
      { path: 'hotels', loadComponent: () => import('./pages/hotels.page').then((m) => m.HotelsPage) },
      {
        path: 'hotels/:id',
        loadComponent: () => import('./pages/hotel-detail.page').then((m) => m.HotelDetailPage),
      },
      { path: 'cart', loadComponent: () => import('./pages/cart.page').then((m) => m.CartPage) },
      {
        path: 'reserve/:hotelId/:roomId',
        loadComponent: () => import('./pages/reserve.page').then((m) => m.ReservePage),
      },
      {
        path: 'payment/result',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/payment-result.page').then((m) => m.PaymentResultPage),
      },
      { path: 'about', loadComponent: () => import('./pages/about.page').then((m) => m.AboutPage) },
      { path: 'contact', loadComponent: () => import('./pages/contact.page').then((m) => m.ContactPage) },
      { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage) },
      { path: 'register', loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPage) },
      { path: 'forgot-password', loadComponent: () => import('./pages/forgot.page').then((m) => m.ForgotPage) },
      { path: 'reset-password', loadComponent: () => import('./pages/reset.page').then((m) => m.ResetPage) },
      { path: 'offers', redirectTo: 'packages', pathMatch: 'full' },
      { path: 'trips', loadComponent: () => import('./pages/trips.page').then((m) => m.TripsPage) },
      {
        path: 'trips/:id',
        loadComponent: () => import('./pages/trip-detail.page').then((m) => m.TripDetailPage),
      },
      {
        path: 'transport',
        loadComponent: () => import('./pages/transport.page').then((m) => m.TransportPage),
      },
      {
        path: 'transport/:id',
        loadComponent: () => import('./pages/transport-detail.page').then((m) => m.TransportDetailPage),
      },
      { path: 'events', loadComponent: () => import('./pages/events.page').then((m) => m.EventsPage) },
      {
        path: 'events/:id',
        loadComponent: () => import('./pages/event-detail.page').then((m) => m.EventDetailPage),
      },
      { path: 'packages', loadComponent: () => import('./pages/packages.page').then((m) => m.PackagesPage) },
      {
        path: 'packages/:id',
        loadComponent: () => import('./pages/package-detail.page').then((m) => m.PackageDetailPage),
      },
      {
        path: 'bookings',
        pathMatch: 'full',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/bookings.page').then((m) => m.BookingsPage),
      },
      {
        path: 'bookings/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/booking-detail.page').then((m) => m.BookingDetailPage),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./layout/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', loadComponent: () => import('./admin/dashboard.page').then((m) => m.DashboardPage) },
      {
        path: 'currency',
        loadComponent: () => import('./admin/currency-admin.page').then((m) => m.CurrencyAdminPage),
      },
      {
        path: 'hotels',
        pathMatch: 'full',
        loadComponent: () => import('./admin/hotels-admin.page').then((m) => m.HotelsAdminPage),
      },
      {
        path: 'hotels/new',
        loadComponent: () => import('./admin/hotel-form.page').then((m) => m.HotelFormPage),
      },
      {
        path: 'hotels/:id',
        loadComponent: () => import('./admin/hotel-form.page').then((m) => m.HotelFormPage),
      },
      {
        path: 'rooms',
        pathMatch: 'full',
        loadComponent: () => import('./admin/rooms-admin.page').then((m) => m.RoomsAdminPage),
      },
      { path: 'rooms/new', loadComponent: () => import('./admin/room-form.page').then((m) => m.RoomFormPage) },
      { path: 'rooms/:id', loadComponent: () => import('./admin/room-form.page').then((m) => m.RoomFormPage) },
      {
        path: 'insight',
        pathMatch: 'full',
        loadComponent: () => import('./admin/insight.page').then((m) => m.InsightPage),
      },
      { path: 'insight/:hotelId', loadComponent: () => import('./admin/insight.page').then((m) => m.InsightPage) },
      { path: 'sliders', loadComponent: () => import('./admin/sliders.page').then((m) => m.SlidersPage) },
      { path: 'about', loadComponent: () => import('./admin/about-admin.page').then((m) => m.AboutAdminPage) },
      { path: 'contact', loadComponent: () => import('./admin/contact-admin.page').then((m) => m.ContactAdminPage) },
      { path: 'partners', loadComponent: () => import('./admin/partners.page').then((m) => m.PartnersPage) },
      { path: 'broadcast', loadComponent: () => import('./admin/broadcast.page').then((m) => m.BroadcastPage) },
      { path: 'users', loadComponent: () => import('./admin/users.page').then((m) => m.UsersPage) },
      {
        path: 'trips',
        pathMatch: 'full',
        loadComponent: () => import('./admin/trips-admin.page').then((m) => m.TripsAdminPage),
      },
      { path: 'trips/new', loadComponent: () => import('./admin/trip-form.page').then((m) => m.TripFormPage) },
      { path: 'trips/:id', loadComponent: () => import('./admin/trip-form.page').then((m) => m.TripFormPage) },
      {
        path: 'transport',
        pathMatch: 'full',
        loadComponent: () => import('./admin/transport-admin.page').then((m) => m.TransportAdminPage),
      },
      {
        path: 'transport/new',
        loadComponent: () => import('./admin/transport-form.page').then((m) => m.TransportFormPage),
      },
      {
        path: 'transport/:id',
        loadComponent: () => import('./admin/transport-form.page').then((m) => m.TransportFormPage),
      },
      {
        path: 'events',
        pathMatch: 'full',
        loadComponent: () => import('./admin/events-admin.page').then((m) => m.EventsAdminPage),
      },
      { path: 'events/new', loadComponent: () => import('./admin/event-form.page').then((m) => m.EventFormPage) },
      { path: 'events/:id', loadComponent: () => import('./admin/event-form.page').then((m) => m.EventFormPage) },
      {
        path: 'packages',
        pathMatch: 'full',
        loadComponent: () => import('./admin/packages-admin.page').then((m) => m.PackagesAdminPage),
      },
      {
        path: 'packages/new',
        loadComponent: () => import('./admin/package-form.page').then((m) => m.PackageFormPage),
      },
      {
        path: 'packages/:id',
        loadComponent: () => import('./admin/package-form.page').then((m) => m.PackageFormPage),
      },
      {
        path: 'bookings',
        pathMatch: 'full',
        loadComponent: () => import('./admin/bookings-admin.page').then((m) => m.BookingsAdminPage),
      },
      {
        path: 'bookings/:id',
        loadComponent: () => import('./pages/booking-detail.page').then((m) => m.BookingDetailPage),
      },
      {
        path: 'section-images',
        loadComponent: () => import('./admin/section-images.page').then((m) => m.SectionImagesPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
