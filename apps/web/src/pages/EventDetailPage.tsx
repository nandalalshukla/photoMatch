/**
 * One event, from the organizer's side — laid out like a Notion page:
 *   • title + a list of properties (status, code, progress, counts)
 *   • share: table card with QR code, link, print/download
 *   • guest access and liveness switches
 *   • all photos, with "add more" and delete
 */
import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays, Check, CircleDot, Copy, Download, ExternalLink, Hash, ImagePlus, Images, Loader, LoaderCircle, Power, Printer, ScanFace, ShieldCheck, Trash2, Users,
} from 'lucide-react';
import { EventStateBadge } from '../components/EventStateBadge';
import { PhotoDropzone } from '../components/PhotoDropzone';
import { PrintOnly, TableCard } from '../components/TableCard';
import { UploadProgressCard, UploadSummaryText } from '../components/UploadProgressCard';
import {
  Alert, Button, CardHeader, EmptyState, ErrorText, Lightbox, Modal, PageHeader, ProgressBar, Properties, Skeleton, Toggle, buttonClass,
} from '../components/ui';
import { api, send } from '../lib/api';
import { cn } from '../lib/cn';
import { thumbnail } from '../lib/images';
import type { EventDetail, Photo } from '../lib/types';
import { uploadEventPhotos, type UploadProgress } from '../lib/upload';

/** Small status chip on a photo tile. */
function PhotoStatus({ photo }: { photo: Photo }) {
  const base = 'absolute right-1 bottom-1 flex items-center gap-1 rounded px-1 py-px text-[10px] font-medium text-white';
  if (photo.status === 'READY') return <span className={cn(base, 'bg-black/55')}><ScanFace className="size-3" />{photo.faceCount}</span>;
  if (photo.status === 'FAILED') return <span className={cn(base, 'bg-[#eb5757]')}>failed</span>;
  return <span className={cn(base, 'bg-black/55')}><LoaderCircle className="size-3 animate-spin" />analysing</span>;
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="size-12" />
      <Skeleton className="h-10 w-80" />
      <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-5 w-96 max-w-full" />)}</div>
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}

export function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  // Duplicates skipped / failures from the last upload (also handed over by the create-event page).
  const location = useLocation();
  const [uploadSummary, setUploadSummary] = useState<UploadProgress | null>(location.state?.uploadSummary ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null); // index of the photo open in the lightbox

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => (await api<{ event: EventDetail }>(`/events/${eventId}`)).event,
    refetchInterval: (query) => (query.state.data?.progress.state === 'PROCESSING' ? 3000 : false),
  });
  const event = eventQuery.data;
  const photosQuery = useQuery({
    queryKey: ['photos', eventId],
    queryFn: async () => (await api<{ photos: Photo[] }>(`/events/${eventId}/photos`)).photos,
    refetchInterval: event?.progress.state === 'PROCESSING' ? 5000 : false,
  });
  const photos = photosQuery.data ?? [];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    void queryClient.invalidateQueries({ queryKey: ['photos', eventId] });
    void queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const update = useMutation({
    mutationFn: (data: Partial<Pick<EventDetail, 'guestAccess' | 'livenessRequired'>>) => send('PATCH', `/events/${eventId}`, data),
    onSuccess: refresh,
  });
  const deleteEvent = useMutation({
    mutationFn: () => send('DELETE', `/events/${eventId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/dashboard');
    },
  });
  const deletePhoto = useMutation({
    mutationFn: (photoId: string) => send('DELETE', `/events/${eventId}/photos/${photoId}`),
    onSuccess: () => {
      setViewing(null);
      refresh();
    },
  });
  const upload = useMutation({
    mutationFn: (files: File[]) => uploadEventPhotos(eventId!, files, setUploadProgress),
    onSuccess: (result) => {
      setShowUpload(false);
      setUploadProgress(null);
      setUploadSummary(result);
      refresh();
    },
  });

  if (eventQuery.isLoading) return <LoadingState />;
  if (!event) {
    return (
      <EmptyState icon="🔍" title="Event not found" body="It may have been deleted, or the link is wrong." action={<Link to="/dashboard" className={buttonClass('secondary')}>Back to events</Link>} />
    );
  }

  const { progress } = event;
  const percent = progress.total ? Math.round(((progress.ready + progress.failed) / progress.total) * 100) : 0;
  const shareable = progress.state === 'READY' && event.guestAccess;

  const copyLink = async () => {
    await navigator.clipboard.writeText(event.guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${event.name.replace(/\W+/g, '-').toLowerCase()}-qr.png`;
    link.click();
  };

  return (
    <>
      <PageHeader
        back={{ to: '/dashboard', label: 'Events' }}
        icon="📸"
        title={event.name}
        actions={
          <>
            <a href={event.guestUrl} target="_blank" rel="noreferrer" className={buttonClass('ghost', 'sm')}><ExternalLink className="size-4" />Guest page</a>
            <Button size="sm" onClick={() => setShowUpload(true)}><ImagePlus className="size-4" />Add photos</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} aria-label="Delete event" title="Delete event"><Trash2 className="size-4" /></Button>
          </>
        }
        meta={
          <Properties
            items={[
              { icon: <CircleDot />, label: 'Status', value: <EventStateBadge state={progress.state} /> },
              {
                icon: <Loader />,
                label: 'Face analysis',
                value: (
                  <span className="flex items-center gap-2.5">
                    <ProgressBar value={percent} active={progress.state === 'PROCESSING'} className="w-32" />
                    <span className="text-muted tabular-nums">{percent}%</span>
                  </span>
                ),
              },
              { icon: <Images />, label: 'Photos', value: `${progress.total.toLocaleString()}${progress.failed ? ` · ${progress.failed} failed` : ''}` },
              { icon: <Users />, label: 'Guest searches', value: event.searchCount.toLocaleString() },
              { icon: <Hash />, label: 'Guest code', value: <span className="font-mono text-[13px]">{event.publicCode}</span> },
              { icon: <CalendarDays />, label: 'Created', value: new Date(event.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }) },
            ]}
          />
        }
      />

      {/* Result of the last upload, only when something was skipped or failed */}
      {uploadSummary && (uploadSummary.duplicates > 0 || uploadSummary.failed > 0) && (
        <div className="mb-8 flex items-start gap-3 rounded-md bg-paper px-3.5 py-3">
          <div className="flex-1 space-y-0.5 text-sm">
            <p className="font-medium text-ink">Upload finished</p>
            <UploadSummaryText progress={uploadSummary} />
          </div>
          <button onClick={() => setUploadSummary(null)} className="rounded px-1.5 py-0.5 text-xs text-muted transition hover:bg-hover hover:text-ink">Dismiss</button>
        </div>
      )}

      <div className="grid animate-enter gap-10 border-t border-line pt-8 lg:grid-cols-2">
        {/* Share */}
        <section>
          <CardHeader
            title="Share with guests"
            description={shareable ? 'Print the card for each table, or share the link.' : !event.guestAccess ? 'Guest search is switched off.' : 'The QR code works as soon as face analysis finishes.'}
          />
          <TableCard eventName={event.name} guestUrl={event.guestUrl} code={event.publicCode} qrRef={qrRef} dimmed={!shareable} />
          <div className="mt-4 flex items-center gap-2 rounded-md border border-line p-1 pl-3">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{event.guestUrl.replace(/^https?:\/\//, '')}</span>
            <Button variant="secondary" size="sm" onClick={copyLink} aria-label="Copy guest link">
              {copied ? <Check className="size-4 text-[#0f7b6c]" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowPrint(true)}><Printer className="size-4" />Print table card</Button>
            <Button variant="ghost" size="sm" onClick={downloadQr}><Download className="size-4" />QR as PNG</Button>
          </div>
        </section>

        {/* Settings */}
        <section>
          <CardHeader title="Privacy & access" description="Changes apply immediately." />
          <div className="-mx-2 space-y-1">
            <Toggle
              icon={<Power />}
              checked={event.guestAccess}
              disabled={update.isPending}
              onChange={(guestAccess) => update.mutate({ guestAccess })}
              title="Guest search"
              description="When off, the QR code, bots and existing gallery links stop working immediately."
            />
            <Toggle
              icon={<ShieldCheck />}
              checked={event.livenessRequired}
              disabled={update.isPending}
              onChange={(livenessRequired) => update.mutate({ livenessRequired })}
              title="Liveness check"
              description="Guests prove they're the person in the selfie with a quick live camera check before their gallery opens."
            />
          </div>
          <div className="mt-3"><ErrorText>{update.error?.message}</ErrorText></div>
        </section>
      </div>

      {/* Photos */}
      <section className="mt-10 border-t border-line pt-8">
        <CardHeader
          title="Photos"
          description={photos.length ? `${photos.length.toLocaleString()} files · click one to view it` : undefined}
          action={photos.length > 0 && <Button variant="secondary" size="sm" onClick={() => setShowUpload(true)}><ImagePlus className="size-4" />Add more</Button>}
        />
        {photosQuery.isLoading ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
        ) : photos.length ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-6">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setViewing(index)}
                className="group relative aspect-square overflow-hidden rounded-md bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                aria-label={`View photo ${index + 1}`}
              >
                <img src={thumbnail(photo.url, 300)} alt="" loading="lazy" className={cn('size-full object-cover transition group-hover:opacity-90', photo.status === 'PROCESSING' && 'opacity-60')} />
                <PhotoStatus photo={photo} />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line">
            <EmptyState icon="🖼️" title="No photos yet" body="Add the event's photos and we'll find every face in them." action={<Button onClick={() => setShowUpload(true)}><ImagePlus className="size-4" />Add photos</Button>} />
          </div>
        )}
      </section>

      {showUpload && (
        <Modal title="Add photos" description="New photos are analysed automatically. Duplicates are skipped." onClose={() => !upload.isPending && setShowUpload(false)}>
          <PhotoDropzone compact disabled={upload.isPending} onFiles={(files) => files.length && upload.mutate(files)} />
          {uploadProgress && <div className="mt-4"><UploadProgressCard progress={uploadProgress} /></div>}
          {upload.error && <div className="mt-3"><ErrorText>{upload.error.message}</ErrorText></div>}
        </Modal>
      )}

      {showPrint && (
        <Modal title="Print a table card" description="Print one for every table — guests scan it with their phone camera." onClose={() => setShowPrint(false)} wide>
          <div className="rounded-lg bg-paper p-6 sm:p-8">
            <TableCard eventName={event.name} guestUrl={event.guestUrl} code={event.publicCode} large />
          </div>
          <PrintOnly><TableCard eventName={event.name} guestUrl={event.guestUrl} code={event.publicCode} large /></PrintOnly>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowPrint(false)}>Close</Button>
            <Button onClick={() => window.print()}><Printer className="size-4" />Print</Button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title={`Delete "${event.name}"?`} onClose={() => setConfirmDelete(false)}>
          <Alert tone="error">This permanently deletes the event, all its photos, face data and guest galleries. This can't be undone.</Alert>
          {deleteEvent.error && <div className="mt-3"><ErrorText>{deleteEvent.error.message}</ErrorText></div>}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" loading={deleteEvent.isPending} onClick={() => deleteEvent.mutate()}><Trash2 className="size-4" />Delete event</Button>
          </div>
        </Modal>
      )}

      {viewing !== null && photos[viewing] && (
        <Lightbox
          items={photos}
          index={viewing}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
          actions={(photo) => (
            <>
              <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-[13px] text-white">
                <ScanFace className="size-4" />{photo.status === 'READY' ? `${photo.faceCount} face${photo.faceCount === 1 ? '' : 's'} found` : photo.status.toLowerCase()}
              </span>
              <Button variant="danger" size="sm" loading={deletePhoto.isPending} onClick={() => deletePhoto.mutate(photo.id)}><Trash2 className="size-4" />Delete photo</Button>
            </>
          )}
        />
      )}
    </>
  );
}
