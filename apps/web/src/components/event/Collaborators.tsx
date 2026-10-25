/**
 * Who can add photos to an event:
 *   • the upload link — anyone with it can upload; their photos wait for approval
 *   • co-organizers — people the owner invited by email; they upload directly
 *     and can review photos, but can't delete the event or manage access
 */
import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, Copy, Link2, RefreshCw, Users, X } from 'lucide-react';
import { send } from '../../lib/api';
import type { EventDetail } from '../../lib/types';
import { Avatar, Badge, Button, CardHeader, ErrorText, Toggle } from '../ui';

type Props = { event: EventDetail; onChanged: () => void };

function UploadLink({ event, onChanged }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const link = useMutation({
    mutationFn: (on: boolean) => send(on ? 'POST' : 'DELETE', `/events/${event.id}/upload-link`),
    onSuccess: () => {
      setConfirmReset(false);
      onChanged();
    },
  });

  const copy = async () => {
    await navigator.clipboard.writeText(event.uploadUrl!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="-mx-2">
        <Toggle
          icon={<Link2 />}
          checked={!!event.uploadUrl}
          disabled={link.isPending}
          onChange={(on) => link.mutate(on)}
          title="Upload link"
          description="Anyone with the link can add photos — no account needed. Their photos wait for your approval."
        />
      </div>
      {event.uploadUrl && (
        <div className="mt-2 ml-7 space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-line p-1 pl-3">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{event.uploadUrl.replace(/^https?:\/\//, '')}</span>
            <Button variant="secondary" size="sm" onClick={copy} aria-label="Copy upload link">
              {copied ? <Check className="size-4 text-[#0f7b6c]" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={link.isPending}
            onClick={() => (confirmReset ? link.mutate(true) : setConfirmReset(true))}
            className={confirmReset ? 'text-[#eb5757] hover:text-[#eb5757]' : undefined}
          >
            <RefreshCw className="size-3.5" />{confirmReset ? 'Click again — the old link will stop working' : 'Reset link'}
          </Button>
        </div>
      )}
      <div className="mt-2"><ErrorText>{link.error?.message}</ErrorText></div>
    </div>
  );
}

function CoOrganizers({ event, onChanged }: Props) {
  const [email, setEmail] = useState('');
  const isOwner = event.role === 'owner';
  const invite = useMutation({
    mutationFn: (address: string) => send('POST', `/events/${event.id}/members`, { email: address }),
    onSuccess: () => {
      setEmail('');
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: (memberId: string) => send('DELETE', `/events/${event.id}/members/${memberId}`),
    onSuccess: onChanged,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    invite.mutate(email.trim());
  };

  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-medium text-ink"><Users className="size-4 text-muted" />Co-organizers</p>
      <p className="mt-0.5 ml-6 text-[13px] text-muted">They add photos directly and can review contributions, but can't delete the event.</p>
      <ul className="mt-3 ml-6 divide-y divide-line rounded-md border border-line">
        {event.owner && (
          <li className="flex items-center gap-2.5 px-3 py-2 text-sm">
            <Avatar name={event.owner.name} size="sm" />
            <span className="min-w-0 flex-1 truncate">{event.owner.name} <span className="text-muted">· {event.owner.email}</span></span>
            <Badge>Owner</Badge>
          </li>
        )}
        {event.members.map((member) => (
          <li key={member.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
            <Avatar name={member.email} size="sm" />
            <span className="min-w-0 flex-1 truncate">{member.email}</span>
            <Badge color="blue">Co-organizer</Badge>
            {isOwner && (
              <button
                onClick={() => remove.mutate(member.id)}
                disabled={remove.isPending}
                className="rounded p-1 text-muted transition hover:bg-hover hover:text-ink"
                aria-label={`Remove ${member.email}`}
                title="Remove"
              >
                <X className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {isOwner && (
        <form onSubmit={submit} className="mt-2 ml-6 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Invite by email"
            aria-label="Email address to invite"
            className="h-8 min-w-0 flex-1 rounded-md bg-paper/60 px-2.5 text-sm ring-1 ring-line transition ring-inset placeholder:text-faint focus:bg-white focus:ring-2 focus:ring-brand-500/50 focus:outline-none"
          />
          <Button type="submit" size="sm" loading={invite.isPending}>Invite</Button>
        </form>
      )}
      <div className="mt-2 ml-6 space-y-2">
        <ErrorText>{invite.error?.message}</ErrorText>
        <ErrorText>{remove.error?.message}</ErrorText>
      </div>
    </div>
  );
}

export function Collaborators({ event, onChanged }: Props) {
  return (
    <section className="mt-10 border-t border-line pt-8">
      <CardHeader title="Add photos together" description="Lots of people take photos at an event. Let them add theirs." />
      <div className="grid gap-8 lg:grid-cols-2">
        <UploadLink event={event} onChanged={onChanged} />
        <CoOrganizers event={event} onChanged={onChanged} />
      </div>
    </section>
  );
}
