/** Shell around every organizer page: top navigation + page content. */
import { CalendarHeart, LogOut, Shield, UserRound } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { signOut, useSession } from '../lib/auth-client';
import { Logo } from './Logo';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function DashboardLayout() {
  const { data } = useSession();
  const navigate = useNavigate();
  const user = data?.user;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
          <Logo to="/dashboard" />
          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            <NavLink to="/dashboard" end className={navClass}><CalendarHeart className="size-4" />Events</NavLink>
            {user?.role === 'admin' && <NavLink to="/dashboard/admin" className={navClass}><Shield className="size-4" />Admin</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <NavLink to="/dashboard/account" className={navClass}>
              {user?.image ? <img src={user.image} alt="" className="size-6 rounded-full" /> : <UserRound className="size-4" />}
              <span className="hidden sm:inline">{user?.name}</span>
            </NavLink>
            <button onClick={handleSignOut} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Sign out" title="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
        {/* Mobile navigation */}
        <nav className="flex gap-1 border-t border-slate-100 px-4 py-2 sm:hidden">
          <NavLink to="/dashboard" end className={navClass}><CalendarHeart className="size-4" />Events</NavLink>
          {user?.role === 'admin' && <NavLink to="/dashboard/admin" className={navClass}><Shield className="size-4" />Admin</NavLink>}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
