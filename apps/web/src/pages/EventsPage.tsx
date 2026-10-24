/** Dashboard home: totals and all of the organizer's events, shown as photo prints. */
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Images, Plus, QrCode, ScanSearch, ShieldCheck, Upload, Users } from 'lucide-react';
import { Link } from 'react-router';
import { EventStateBadge } from '../components/EventStateBadge';
import { ButtonLink, Card, EmptyState, PageHeader, ProgressBar, Skeleton, StatCard } from '../components/ui';
import { api } from '../lib/api';
import { cn } from '../lib/cn';
import { useSession } from '../lib/auth-client';
import { thumbnail } from '../lib/images';
import type { EventSummary } from '../lib/types';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** One event as a print: white border, soft shadow, caption underneath. Tilts a little on hover. */
function EventPrint({ event, index }: { event: EventSummary; index: number }) {
  const { progress } = event;
  const percent = progress.total ? Math.round(((progress.ready + progress.failed) / progress.total) * 100) : 0;
  const developing = progress.state === 'PROCESSING';
  const tilt = index % 2 ? 'group-hover:rotate-[0.8deg]' : 'group-hover:-rotate-[0.8deg]';

  return (
    <Link
      to={`/dashboard/events/${event.id}`}
      className="group block animate-enter rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className={cn('rounded-[20px] bg-white p-2.5 shadow-print transition duration-500 ease-editorial group-hover:-translate-y-1.5 group-hover:shadow-elevated', tilt)}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-paper-deep">
          {event.coverUrl ? (
            <img
              src={thumbnail(event.coverUrl, 640)}
              alt=""
              className={cn('size-full object-cover transition duration-700 ease-editorial group-hover:scale-[1.04]', developing && 'animate-pulse grayscale')}
            />
          ) : (
            <div className="grid size-full place-items-center">
              <div className="text-center text-stone-400">
                <Images className="mx-auto size-7" />
                <p className="mt-2 text-xs">No photos yet</p>
              </div>
            </div>
          )}
          <div className="absolute top-2.5 left-2.5 rounded-full bg-white/90 backdrop-blur"><EventStateBadge state={progress.state} /></div>
          {event.livenessRequired && (
            <span className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full bg-ink text-paper" title="Liveness protected">
              <ShieldCheck className="size-3.5" />
            </span>
          )}
          {developing && (
            <div className="absolute inset-x-3 bottom-3 rounded-full bg-black/45 p-2 backdrop-blur">
              <ProgressBar value={percent} active className="bg-white/20" />
            </div>
          )}
        </div>
        <div className="px-2 pt-4 pb-2">
          <h2 className="truncate font-display text-[26px] leading-tight text-ink">{event.name}</h2>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-stone-500">
            <span><span className="font-mono">{event.publicCode}</span> · {formatDate(event.createdAt)}</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1" title="Photos"><Images className="size-3.5" />{progress.total.toLocaleString()}</span>
              <span className="flex items-center gap-1" title="Guest searches"><Users className="size-3.5" />{event.searchCount.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function NewEventPrint() {
  return (
    <Link
      to="/dashboard/events/new"
      className="group grid min-h-48 place-items-center rounded-[20px] border border-dashed border-stone-400/70 p-6 text-center transition duration-300 hover:border-ink hover:bg-white/60"
    >
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-ink text-paper transition-transform duration-500 ease-editorial group-hover:rotate-90"><Plus className="size-5" /></span>
        <p className="mt-4 font-display text-2xl text-ink">New event</p>
        <p className="mt-1 text-xs text-stone-500">Name it, add photos, share the QR.</p>
      </div>
    </Link>
  );
}

function LoadingState() {
  return (
    <>
      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[132px] rounded-3xl" />)}</div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-[20px] bg-white p-2.5 shadow-print">
            <Skeleton className="aspect-[4/3] rounded-[12px]" />
            <div className="space-y-3 px-2 pt-4 pb-2"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
          </div>
        ))}
      </div>
    </>
  );
}

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

export function EventsPage() {
  const { data: session } = useSession();
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
  const firstName = session?.user.name?.split(' ')[0];

  return (
    <>
      <PageHeader
        eyebrow={<span className="eyebrow text-stone-500">{greeting()}{firstName ? `, ${firstName}` : ''}</span>}
        title={<>Your <em>events</em></>}
        description="Upload photos, share the QR code, and let guests find themselves."
      />

      {isLoading ? (
        <LoadingState />
      ) : !events?.length ? (
        <Card className="animate-enter">
          <EmptyState
            icon={<CalendarPlus />}
            title="Your first event awaits"
            body="Give it a name, drop in your photos, and you'll get a QR code to share with guests."
            action={<ButtonLink to="/dashboard/events/new" size="lg"><Plus className="size-4" />Create an event</ButtonLink>}
          />
          <ol className="mx-auto grid max-w-2xl gap-3 border-t border-stone-200 pt-6 pb-2 sm:grid-cols-3">
            {[
              { icon: Upload, text: 'Upload your photos' },
              { icon: QrCode, text: 'Share the QR code' },
              { icon: ScanSearch, text: 'Guests find themselves' },
            ].map(({ icon: Icon, text }, i) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl bg-paper p-3 text-sm text-stone-600">
                <span className="font-display text-2xl text-stone-400">{String(i + 1).padStart(2, '0')}</span>
                <Icon className="size-4 shrink-0 text-ink" />{text}
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <>
          <div className="mb-12 grid animate-enter grid-cols-2 gap-4 [animation-delay:80ms] lg:grid-cols-4">
            <StatCard label="Events" value={events.length.toLocaleString()} />
            <StatCard label="Photos" value={totals!.photos.toLocaleString()} />
            <StatCard label="Guest searches" value={totals!.searches.toLocaleString()} />
            <StatCard label="Open for guests" value={totals!.open.toLocaleString()} hint={`of ${events.length} event${events.length === 1 ? '' : 's'}`} />
          </div>
          <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => <EventPrint key={event.id} event={event} index={index} />)}
            <NewEventPrint />
          </div>
        </>
      )}
    </>
  );
}
