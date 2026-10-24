/**
 * All pages of the app and their URLs.
 *
 * Public:     /  /e/:code (guest page)  /g/:searchId (private gallery)
 * Auth:       /sign-in  /sign-up  /forgot-password  /reset-password
 * Organizer:  /dashboard/...  (must be signed in)
 */
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { RequireAuth, RequireAdmin, GuestOnly } from './components/RouteGuards';
import { DashboardLayout } from './components/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { SignInPage, SignUpPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AuthPages';
import { EventsPage } from './pages/EventsPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { GuestEventPage } from './pages/GuestEventPage';
import { GalleryPage } from './pages/GalleryPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** Start each new page at the top (the browser keeps the old scroll position otherwise). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/e/:code" element={<GuestEventPage />} />
        <Route path="/g/:searchId" element={<GalleryPage />} />

        <Route element={<GuestOnly />}>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<EventsPage />} />
            <Route path="events/new" element={<CreateEventPage />} />
            <Route path="events/:eventId" element={<EventDetailPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
