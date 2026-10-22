/**
 * Admin dashboard (users with role "admin").
 * - Totals and recent events come from our API (/api/admin/*).
 * - The user list and role/ban actions come from better-auth's admin plugin.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CalendarHeart, Images, ScanFace, Search, ShieldCheck, Users } from 'lucide-react';
import { Badge, Button, Card, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { authClient, useSession } from '../lib/auth-client';

type Overview = { users: number; events: number; photos: number; faces: number; searches: number };
type AdminEvent = {
  id: string; name: string; createdAt: string; guestAccess: boolean; livenessRequired: boolean;
  owner: { name: string; email: string }; _count: { photos: number; searches: number };
};

export function AdminPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const overview = useQuery({ queryKey: ['admin-overview'], queryFn: async () => (await api<{ overview: Overview }>('/admin/overview')).overview });
  const events = useQuery({ queryKey: ['admin-events'], queryFn: async () => (await api<{ events: AdminEvent[] }>('/admin/events')).events });
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await authClient.admin.listUsers({ query: { limit: 100, sortBy: 'createdAt', sortDirection: 'desc' } })).data?.users ?? [],
  });
  const reloadUsers = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const stats = [
    { label: 'Users', value: overview.data?.users, icon: Users },
    { label: 'Events', value: overview.data?.events, icon: CalendarHeart },
    { label: 'Photos', value: overview.data?.photos, icon: Images },
    { label: 'Faces indexed', value: overview.data?.faces, icon: ScanFace },
    { label: 'Guest searches', value: overview.data?.searches, icon: Search },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="!p-5">
            <s.icon className="size-5 text-brand-600" />
            <p className="mt-3 text-2xl font-bold">{s.value?.toLocaleString() ?? '–'}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto !p-0">
        <h2 className="p-5 pb-3 font-semibold">Users</h2>
        {users.isLoading ? <Spinner /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase"><tr><th className="px-5 py-2">User</th><th className="px-5 py-2">Status</th><th className="px-5 py-2">Joined</th><th className="px-5 py-2" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {users.data?.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3"><p className="font-medium">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                  <td className="space-x-1 px-5 py-3">
                    {u.role === 'admin' && <Badge color="violet">admin</Badge>}
                    {u.emailVerified ? <Badge color="green">verified</Badge> : <Badge color="amber">unverified</Badge>}
                    {u.banned && <Badge color="red">banned</Badge>}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="space-x-1 px-5 py-3 text-right whitespace-nowrap">
                    {u.id !== session?.user.id && (
                      <>
                        <Button variant="ghost" size="sm" onClick={async () => { await authClient.admin.setRole({ userId: u.id, role: u.role === 'admin' ? 'user' : 'admin' }); await reloadUsers(); }}>
                          <ShieldCheck className="size-4" />{u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={async () => { await (u.banned ? authClient.admin.unbanUser({ userId: u.id }) : authClient.admin.banUser({ userId: u.id })); await reloadUsers(); }}>
                          <Ban className="size-4" />{u.banned ? 'Unban' : 'Ban'}
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-x-auto !p-0">
        <h2 className="p-5 pb-3 font-semibold">Latest events</h2>
        {events.isLoading ? <Spinner /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase"><tr><th className="px-5 py-2">Event</th><th className="px-5 py-2">Organizer</th><th className="px-5 py-2">Photos</th><th className="px-5 py-2">Searches</th><th className="px-5 py-2">Settings</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {events.data?.map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-3 font-medium">{e.name}<p className="text-xs font-normal text-slate-500">{new Date(e.createdAt).toLocaleDateString()}</p></td>
                  <td className="px-5 py-3 text-slate-600">{e.owner.email}</td>
                  <td className="px-5 py-3">{e._count.photos.toLocaleString()}</td>
                  <td className="px-5 py-3">{e._count.searches.toLocaleString()}</td>
                  <td className="space-x-1 px-5 py-3">
                    {e.guestAccess ? <Badge color="green">open</Badge> : <Badge>closed</Badge>}
                    {e.livenessRequired && <Badge color="violet">liveness</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
