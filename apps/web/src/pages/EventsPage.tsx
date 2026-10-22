/** Dashboard home: all of the organizer's events as cards. */
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Images, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router';
import { EventStateBadge } from '../components/EventStateBadge';
import { ButtonLink, Card, EmptyState, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { thumbnail } from '../lib/images';
import type { EventSummary } from '../lib/types';

export function EventsPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api<{ events: EventSummary[] }>('/events')).events,
    // While photos are being analysed, refresh every few seconds.
    refetchInterval: (query) => (query.state.data?.some((e) => e.progress.state === 'PROCESSING') ? 4000 : false),
  });

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your events</h1>
          <p className="mt-1 text-slate-500">Upload photos, share the QR code, and let guests find themselves.</p>
        </div>
        <ButtonLink to="/dashboard/events/new"><CalendarPlus className="size-4" />New event</ButtonLink>
      </div>

      {isLoading ? (
        <Spinner label="Loading events" />
      ) : !events?.length ? (
        <Card>
          <EmptyState
            icon={<CalendarPlus />}
            title="Create your first event"
            body="Give it a name, drop in your photos, and you'll get a QR code to share with guests."
            action={<ButtonLink to="/dashboard/events/new">New event</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link key={event.id} to={`/dashboard/events/${event.id}`} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                {event.coverUrl ? (
                  <img src={thumbnail(event.coverUrl, 640)} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="grid size-full place-items-center brand-gradient opacity-80"><Images className="size-10 text-white/80" /></div>
                )}
                <div className="absolute top-3 left-3"><EventStateBadge state={event.progress.state} /></div>
              </div>
              <div className="p-5">
                <h2 className="truncate font-semibold text-slate-900">{event.name}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><Images className="size-4" />{event.progress.total} photos</span>
                  <span className="flex items-center gap-1.5"><Users className="size-4" />{event.searchCount} searches</span>
                  {event.livenessRequired && <span className="flex items-center gap-1.5 text-brand-700"><ShieldCheck className="size-4" />Liveness</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
