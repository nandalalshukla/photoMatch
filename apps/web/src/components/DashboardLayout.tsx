/** Shell around every organizer page: top navigation, account menu and page content. */
import { LogOut, Plus, Shield, UserRound } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { cn } from '../lib/cn';
import { signOut, useSession } from '../lib/auth-client';
import { Logo } from './Logo';
import { Avatar, ButtonLink, Menu, MenuButton, MenuLink } from './ui';

/** Editorial tabs: plain text, with an ink underline under the current page. */
const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative inline-flex h-16 items-center text-sm transition after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:bg-ink after:transition-transform after:duration-300',
    isActive ? 'font-medium text-ink after:scale-x-100' : 'text-stone-500 after:scale-x-0 hover:text-ink',
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

  const links = (
    <>
      <NavLink to="/dashboard" end className={navClass}>Events</NavLink>
      {isAdmin && <NavLink to="/dashboard/admin" className={navClass}>Admin</NavLink>}
    </>
  );

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-stone-300/60 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
          <Logo to="/dashboard" />
          <nav className="hidden items-center gap-7 sm:flex">{links}</nav>
          <div className="ml-auto flex items-center gap-3">
            <ButtonLink to="/dashboard/events/new" size="sm" className="hidden sm:inline-flex"><Plus className="size-4" />New event</ButtonLink>
            <Menu label="Account menu" trigger={<Avatar name={user?.name} image={user?.image} size="sm" />}>
              <div className="flex items-center gap-3 px-3 pt-2 pb-3">
                <Avatar name={user?.name} image={user?.image} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                  <p className="truncate text-xs text-stone-500">{user?.email}</p>
                </div>
              </div>
              <div className="my-1 h-px bg-stone-100" />
              <MenuLink to="/dashboard/account"><UserRound />Account settings</MenuLink>
              {isAdmin && <MenuLink to="/dashboard/admin"><Shield />Admin</MenuLink>}
              <div className="my-1 h-px bg-stone-100" />
              <MenuButton onClick={handleSignOut}><LogOut />Sign out</MenuButton>
            </Menu>
          </div>
        </div>
        {/* Mobile navigation */}
        <nav className="-mt-2 flex gap-6 overflow-x-auto px-4 [&>a]:h-10 sm:hidden">{links}</nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Outlet />
      </main>
    </div>
  );
}
