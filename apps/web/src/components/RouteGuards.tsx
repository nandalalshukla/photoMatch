/**
 * Route guards decide who may see a group of pages.
 * They read the current session from better-auth's useSession() hook.
 */
import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '../lib/auth-client';
import { Spinner } from './ui';

/** Signed-in users only; everyone else goes to /sign-in (and comes back afterwards). */
export function RequireAuth() {
  const { data, isPending } = useSession();
  const location = useLocation();
  // Spinner only on the very first load. better-auth re-checks the session after
  // actions like "update name"; unmounting the page then would lose its state.
  if (isPending && !data) return <Spinner className="min-h-dvh" />;
  if (!data) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <Outlet />;
}

/** Admins only (role is set with `npm run admin:promote`). */
export function RequireAdmin() {
  const { data } = useSession();
  if (data?.user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/**
 * Pages like /sign-in make no sense when already signed in → go to the dashboard.
 * No loading spinner here on purpose: the session is re-checked after sign-up,
 * and swapping the form for a spinner would wipe the "check your inbox" message.
 */
export function GuestOnly() {
  const { data } = useSession();
  if (data) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
