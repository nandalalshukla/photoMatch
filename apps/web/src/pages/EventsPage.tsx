/** Dashboard home: a few totals and all of the organizer's events as a gallery of cards. */
import { useQuery } from '@tanstack/react-query';
import { Plus, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { EventStateBadge } from '../components/EventStateBadge';
import { Badge, ButtonLink, EmptyState, PageHeader, ProgressBar, Skeleton, StatCard } from '../components/ui';
import { api } from '../lib/api';
import { thumbnail } from '../lib/images';
import type { EventSummary } from '../lib/types';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** One event, like a card in a Notion gallery view: cover, title, then its properties. */
function EventCard({ event }: { event: EventSummary }) {
  const { progress } = event;
  const percent = progress.total ? Math.round(((progress.ready + progress.failed) / progress.total) * 100) : 0;
  return (
    <Link
      to={`/dashboard/events/${event.id}`}
      className="group overflow-hidden rounded-lg border border-line bg-white shadow-xs transition hover:bg-paper/50 hover:shadow-pop focus-visible:outline-2 focus-visible:outline-brand-500"
    >
      <div className="aspect-[16/9] overflow-hidden border-b border-line bg-paper">
        {event.coverUrl ? (
          <img src={thumbnail(event.coverUrl, 640)} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-3xl" aria-hidden>🖼️</div>
        )}
      </div>
      <div className="space-y-2.5 p-3.5">
        <h2 className="truncate font-semibold text-ink">{event.name}</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <EventStateBadge state={progress.state} />
          {event.pendingCount > 0 && <Badge color="orange">{event.pendingCount.toLocaleString()} to review</Badge>}
          {event.role === 'coorganizer' && <Badge color="blue">Shared with you</Badge>}
          {event.livenessRequired && <Badge color="violet"><ShieldCheck className="size-3" />Liveness</Badge>}
        </div>
        {progress.state === 'PROCESSING' && <ProgressBar value={percent} active />}
        <p className="text-xs text-muted">
          {progress.total.toLocaleString()} photos · {event.searchCount.toLocaleString()} searches · {formatDate(event.createdAt)}
        </p>
      </div>
    </Link>
  );
}

function LoadingState() {
  return (
    <>
      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[82px] rounded-lg" />)}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-line">
            <Skeleton className="aspect-[16/9] rounded-none" />
            <div className="space-y-2.5 p-3.5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
          </div>
        ))}
      </div>
    </>
  );
}

export function EventsPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api<{ events: EventSummary[] }>('/events')).events,
    // While photos are being analysed, refresh every few seconds.
    refetchInterval: (query) => (query.state.data?.some((e) => e.progress.state === 'PROCESSING') ? 4000 : false),
  });

  const totals = events && {
    photos: events.reduce((sum, e) => sum + e.progress.total, 0),
    searches: events.reduce((sum, e) => sum + e.searchCount, 0),
    open: events.filter((e) => e.progress.state === 'READY' && e.guestAccess).length,
  };

  return (
    <>
      <PageHeader
        icon="🗓️"
        title="Events"
        description="Upload photos, share the QR code, and let guests find themselves."
        actions={<ButtonLink to="/dashboard/events/new"><Plus className="size-4" />New event</ButtonLink>}
      />

      {isLoading ? (
        <LoadingState />
      ) : !events?.length ? (
        <div className="rounded-lg border border-dashed border-line">
          <EmptyState
            icon="📸"
            title="No events yet"
            body="Create your first event: give it a name, add your photos, and you'll get a QR code to share with guests."
            action={<ButtonLink to="/dashboard/events/new"><Plus className="size-4" />Create an event</ButtonLink>}
          />
        </div>
      ) : (
        <>
          <div className="mb-10 grid animate-enter grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Events" value={events.length.toLocaleString()} />
            <StatCard label="Photos" value={totals!.photos.toLocaleString()} />
            <StatCard label="Guest searches" value={totals!.searches.toLocaleString()} />
            <StatCard label="Open for guests" value={totals!.open.toLocaleString()} />
          </div>
          <div className="grid animate-enter gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => <EventCard key={event.id} event={event} />)}
            <Link
              to="/dashboard/events/new"
              className="flex min-h-40 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line text-sm text-muted transition hover:bg-hover hover:text-ink"
            >
              <Plus className="size-4" />New event
            </Link>
          </div>
        </>
      )}
    </>
  );
}
