/**
 * Shell around every organizer page, laid out like Notion: a quiet gray sidebar
 * (account menu + pages) on the left, the page itself on the right. On small
 * screens the sidebar becomes a top bar.
 */
import { ChevronsUpDown, LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { cn } from '../lib/cn';
import { signOut, useSession } from '../lib/auth-client';
import { Logo } from './Logo';
import { Avatar, Menu, MenuButton, MenuLink } from './ui';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 rounded-md px-2 py-1 text-sm whitespace-nowrap transition-colors',
    isActive ? 'bg-hover font-medium text-ink' : 'text-muted hover:bg-hover hover:text-ink',
  );

export function DashboardLayout() {
  const { data } = useSession();
  const navigate = useNavigate();
  const user = data?.user;
  const isAdmin = user?.role === 'admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const pages = [
    { to: '/dashboard', end: true, emoji: '🗓️', label: 'Events' },
    { to: '/dashboard/events/new', end: true, emoji: '➕', label: 'New event' },
    { to: '/dashboard/account', end: true, emoji: '⚙️', label: 'Settings' },
    ...(isAdmin ? [{ to: '/dashboard/admin', end: true, emoji: '🛡️', label: 'Admin' }] : []),
  ];
  const links = pages.map((page) => (
    <NavLink key={page.to} to={page.to} end={page.end} className={navClass}>
      <span className="w-4 text-center text-[13px]" aria-hidden>{page.emoji}</span>{page.label}
    </NavLink>
  ));

  const accountMenu = (align: 'left' | 'right') => (
    <Menu
      label="Account menu"
      align={align}
      className="w-full p-1.5"
      trigger={
        <>
          <Avatar name={user?.name} image={user?.image} size="sm" />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink">{user?.name}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-faint" />
        </>
      }
    >
      <p className="truncate px-2 pt-1.5 pb-2 text-xs text-muted">{user?.email}</p>
      <MenuLink to="/dashboard/account"><span className="w-4 text-center text-[13px]">⚙️</span>Settings</MenuLink>
      <MenuLink to="/"><span className="w-4 text-center text-[13px]">🌐</span>Home page</MenuLink>
      <div className="my-1 h-px bg-line" />
      <MenuButton onClick={handleSignOut}><LogOut />Log out</MenuButton>
    </Menu>
  );

  return (
    <div className="min-h-dvh bg-white md:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-paper px-2 py-3 md:flex">
        {accountMenu('left')}
        <nav className="mt-4 space-y-0.5">{links}</nav>
        <div className="mt-auto px-2 pt-4"><Logo to="/" className="opacity-60 transition hover:opacity-100" /></div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur md:hidden">
        <div className="flex h-12 items-center justify-between px-3">
          <Logo to="/dashboard" />
          <div className="w-44">{accountMenu('right')}</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">{links}</nav>
      </header>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-12 sm:py-14">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
