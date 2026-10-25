/**
 * Account settings — everything is provided by better-auth's client:
 * update name, change password, see signed-in devices and sign them out.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Laptop, LogOut, Smartphone } from 'lucide-react';
import { Avatar, Badge, Button, ErrorText, Input, PageHeader, Skeleton } from '../components/ui';
import { authClient, useSession } from '../lib/auth-client';

/** Very small user-agent reader — good enough to show "Chrome on Windows". */
function describeDevice(userAgent?: string | null) {
  const ua = userAgent ?? '';
  const browser = /edg/i.test(ua) ? 'Edge' : /chrome/i.test(ua) ? 'Chrome' : /firefox/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Browser';
  const os = /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Unknown OS';
  return { label: `${browser} on ${os}`, mobile: /android|iphone|ipad/i.test(ua) };
}

/** A settings row: title + description on the left, the card on the right. */
function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="animate-enter border-t border-line pt-6">
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-0.5 text-sm text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Saved({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <span className="inline-flex animate-fade-in items-center gap-1.5 text-sm text-[#0f7b6c]"><Check className="size-4" />{children}</span>;
}

export function AccountPage() {
  const { data: session, refetch } = useSession();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState({ profile: '', password: '', passwordError: '' });
  const [saving, setSaving] = useState<'profile' | 'password' | null>(null);

  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await authClient.listSessions()).data ?? [],
  });

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving('profile');
    await authClient.updateUser({ name: String(new FormData(event.currentTarget).get('name')) });
    await refetch();
    setSaving(null);
    setMessage((m) => ({ ...m, profile: 'Saved' }));
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving('password');
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get('current')),
      newPassword: String(form.get('new')),
      revokeOtherSessions: true,
    });
    setSaving(null);
    setMessage((m) => ({ ...m, password: error ? '' : 'Password changed. Other devices were signed out.', passwordError: error?.message ?? '' }));
    if (!error) formElement.reset();
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
    <div className="max-w-2xl">
      <PageHeader icon="⚙️" title="Settings" description="Manage your profile, password and the devices you're signed in on." />

      <div className="space-y-10">
        <Section title="Profile" description="Your name is shown in the dashboard and in emails we send you.">
          <form onSubmit={saveName} className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name} image={user?.image} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{user?.email}</p>
                <div className="mt-1">{user?.emailVerified ? <Badge color="green" dot>Verified</Badge> : <Badge color="amber" dot>Not verified</Badge>}</div>
              </div>
            </div>
            <Input label="Name" name="name" defaultValue={user?.name} required minLength={2} />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving === 'profile'}>Save changes</Button>
              <Saved>{message.profile}</Saved>
            </div>
          </form>
        </Section>

        <Section title="Password" description='Signed up with Google? Use "Forgot password" on the sign-in page to set one.'>
          <form onSubmit={changePassword} className="space-y-4">
            <Input label="Current password" name="current" type="password" autoComplete="current-password" required />
            <Input label="New password" name="new" type="password" autoComplete="new-password" required minLength={8} hint="At least 8 characters. Other devices will be signed out." />
            <ErrorText>{message.passwordError}</ErrorText>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={saving === 'password'}>Change password</Button>
              <Saved>{message.password}</Saved>
            </div>
          </form>
        </Section>

        <Section title="Signed-in devices" description="Sign out anywhere you don't recognise.">
          <div className="-my-2 flex items-center justify-between gap-3 pb-3">
            <p className="text-sm text-muted">{sessions.data ? `${sessions.data.length} active session${sessions.data.length === 1 ? '' : 's'}` : ' '}</p>
            {(sessions.data?.length ?? 0) > 1 && <Button variant="secondary" size="sm" onClick={revokeOthers}><LogOut className="size-4" />Sign out others</Button>}
          </div>
          <ul className="divide-y divide-line">
            {sessions.isLoading && Array.from({ length: 2 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 py-3"><Skeleton className="size-10 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-56" /></div></li>
            ))}
            {sessions.data?.map((s) => {
              const device = describeDevice(s.userAgent);
              const current = s.token === session?.session.token;
              return (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-muted">{device.mobile ? <Smartphone className="size-5" /> : <Laptop className="size-5" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">{device.label} {current && <Badge color="violet">This device</Badge>}</p>
                    <p className="truncate text-xs text-muted">{s.ipAddress || 'Unknown IP'} · last active {new Date(s.updatedAt).toLocaleString()}</p>
                  </div>
                  {!current && <Button variant="ghost" size="sm" onClick={() => revoke(s.token)}>Sign out</Button>}
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </div>
  );
}
