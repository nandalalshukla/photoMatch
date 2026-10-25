/**
 * Admin dashboard (users with role "admin").
 * - Totals and recent events come from our API (/api/admin/*).
 * - The user list and role/ban actions come from better-auth's admin plugin.
 */
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CalendarHeart, Images, ScanFace, Search, ShieldCheck, Users } from 'lucide-react';
import { Avatar, Badge, Button, Card, PageHeader, Skeleton, StatCard } from '../components/ui';
import { api } from '../lib/api';
import { authClient, useSession } from '../lib/auth-client';

type Overview = { users: number; events: number; photos: number; faces: number; searches: number };
type AdminEvent = {
  id: string; name: string; createdAt: string; guestAccess: boolean; livenessRequired: boolean;
  owner: { name: string; email: string }; _count: { photos: number; searches: number };
};

const th = 'px-5 py-2.5 text-xs font-medium text-muted';
const td = 'px-5 py-3.5';

/** A card with a title and a horizontally scrollable table. */
function TableCard({ title, count, loading, columns, children }: { title: string; count?: number; loading: boolean; columns: string[]; children: ReactNode }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {count !== undefined && <Badge>{count.toLocaleString()}</Badge>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-y border-line bg-paper"><tr>{columns.map((c, i) => <th key={i} className={th}>{c}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {loading
              ? Array.from({ length: 3 }, (_, i) => (
                  <tr key={i}>{columns.map((_, j) => <td key={j} className={td}><Skeleton className="h-4 w-full max-w-36" /></td>)}</tr>
                ))
              : children}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

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
      <PageHeader icon="🛡️" title="Admin" description="Everything happening across PhotoMatch AI." className="mb-0" />

      <div className="grid animate-enter grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) =>
          overview.isLoading
            ? <Skeleton key={s.label} className="h-[104px] rounded-2xl" />
            : <StatCard key={s.label} label={s.label} value={s.value?.toLocaleString() ?? '–'} icon={s.icon} />,
        )}
      </div>

      <TableCard title="Users" count={users.data?.length} loading={users.isLoading} columns={['User', 'Status', 'Joined', '']}>
        {users.data?.map((u) => (
          <tr key={u.id} className="transition-colors hover:bg-paper">
            <td className={td}>
              <div className="flex items-center gap-3">
                <Avatar name={u.name} image={u.image} size="sm" />
                <div className="min-w-0"><p className="truncate font-medium text-ink">{u.name}</p><p className="truncate text-xs text-muted">{u.email}</p></div>
              </div>
            </td>
            <td className={td}>
              <div className="flex flex-wrap gap-1">
                {u.role === 'admin' && <Badge color="violet">admin</Badge>}
                {u.emailVerified ? <Badge color="green">verified</Badge> : <Badge color="amber">unverified</Badge>}
                {u.banned && <Badge color="red">banned</Badge>}
              </div>
            </td>
            <td className={`${td} whitespace-nowrap text-muted`}>{new Date(u.createdAt).toLocaleDateString()}</td>
            <td className={`${td} text-right whitespace-nowrap`}>
              {u.id !== session?.user.id && (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={async () => { await authClient.admin.setRole({ userId: u.id, role: u.role === 'admin' ? 'user' : 'admin' }); await reloadUsers(); }}>
                    <ShieldCheck className="size-4" />{u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                  </Button>
                  <Button variant="ghost" size="sm" className={u.banned ? '' : 'text-red-600 hover:bg-tag-red/70 hover:text-tag-red-text'} onClick={async () => { await (u.banned ? authClient.admin.unbanUser({ userId: u.id }) : authClient.admin.banUser({ userId: u.id })); await reloadUsers(); }}>
                    <Ban className="size-4" />{u.banned ? 'Unban' : 'Ban'}
                  </Button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </TableCard>

      <TableCard title="Latest events" count={events.data?.length} loading={events.isLoading} columns={['Event', 'Organizer', 'Photos', 'Searches', 'Settings']}>
        {events.data?.map((e) => (
          <tr key={e.id} className="transition-colors hover:bg-paper">
            <td className={td}><p className="font-medium text-ink">{e.name}</p><p className="text-xs text-muted">{new Date(e.createdAt).toLocaleDateString()}</p></td>
            <td className={`${td} text-muted`}>{e.owner.email}</td>
            <td className={`${td} tabular-nums`}>{e._count.photos.toLocaleString()}</td>
            <td className={`${td} tabular-nums`}>{e._count.searches.toLocaleString()}</td>
            <td className={td}>
              <div className="flex flex-wrap gap-1">
                {e.guestAccess ? <Badge color="green" dot>open</Badge> : <Badge dot>closed</Badge>}
                {e.livenessRequired && <Badge color="violet">liveness</Badge>}
              </div>
            </td>
          </tr>
        ))}
      </TableCard>
    </div>
  );
}
