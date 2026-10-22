/**
 * Account settings — everything is provided by better-auth's client:
 * update name, change password, see signed-in devices and sign them out.
 */
import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, LogOut, Smartphone } from 'lucide-react';
import { Badge, Button, Card, ErrorText, Input } from '../components/ui';
import { authClient, useSession } from '../lib/auth-client';

/** Very small user-agent reader — good enough to show "Chrome on Windows". */
function describeDevice(userAgent?: string | null) {
  const ua = userAgent ?? '';
  const browser = /edg/i.test(ua) ? 'Edge' : /chrome/i.test(ua) ? 'Chrome' : /firefox/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Browser';
  const os = /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Unknown OS';
  return { label: `${browser} on ${os}`, mobile: /android|iphone|ipad/i.test(ua) };
}

export function AccountPage() {
  const { data: session, refetch } = useSession();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState({ profile: '', password: '', passwordError: '' });

  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await authClient.listSessions()).data ?? [],
  });

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await authClient.updateUser({ name: String(new FormData(event.currentTarget).get('name')) });
    await refetch();
    setMessage((m) => ({ ...m, profile: 'Saved!' }));
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get('current')),
      newPassword: String(form.get('new')),
      revokeOtherSessions: true,
    });
    setMessage((m) => ({ ...m, password: error ? '' : 'Password changed. Other devices were signed out.', passwordError: error?.message ?? '' }));
    if (!error) event.currentTarget.reset();
  };

  const revoke = async (token: string) => {
    await authClient.revokeSession({ token });
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };
  const revokeOthers = async () => {
    await authClient.revokeOtherSessions();
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  const user = session?.user;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Account</h1>

      <Card>
        <h2 className="mb-4 font-semibold">Profile</h2>
        <form onSubmit={saveName} className="space-y-4">
          <Input label="Name" name="name" defaultValue={user?.name} required minLength={2} />
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {user?.email}
            {user?.emailVerified ? <Badge color="green">Verified</Badge> : <Badge color="amber">Not verified</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit">Save</Button>
            {message.profile && <span className="text-sm text-emerald-600">{message.profile}</span>}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Password</h2>
        <p className="mb-4 text-sm text-slate-500">Signed up with Google? Use "Forgot password" on the sign-in page to set one.</p>
        <form onSubmit={changePassword} className="space-y-4">
          <Input label="Current password" name="current" type="password" autoComplete="current-password" required />
          <Input label="New password" name="new" type="password" autoComplete="new-password" required minLength={8} />
          <ErrorText>{message.passwordError}</ErrorText>
          <div className="flex items-center gap-3">
            <Button type="submit">Change password</Button>
            {message.password && <span className="text-sm text-emerald-600">{message.password}</span>}
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Signed-in devices</h2>
          {(sessions.data?.length ?? 0) > 1 && <Button variant="secondary" size="sm" onClick={revokeOthers}><LogOut className="size-4" />Sign out others</Button>}
        </div>
        <ul className="divide-y divide-slate-100">
          {sessions.data?.map((s) => {
            const device = describeDevice(s.userAgent);
            const current = s.token === session?.session.token;
            return (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600">{device.mobile ? <Smartphone className="size-5" /> : <Laptop className="size-5" />}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{device.label} {current && <Badge color="violet">This device</Badge>}</p>
                  <p className="text-xs text-slate-500">{s.ipAddress || 'Unknown IP'} · last active {new Date(s.updatedAt).toLocaleString()}</p>
                </div>
                {!current && <Button variant="ghost" size="sm" onClick={() => revoke(s.token)}>Sign out</Button>}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
