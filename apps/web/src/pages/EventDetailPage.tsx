/**
 * One event, from the organizer's side:
 *   • processing progress (refreshes itself while faces are being analysed)
 *   • QR code + link to share with guests
 *   • guest access and liveness switches
 *   • all photos, with "add more" and delete
 */
import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check, CircleAlert, Copy, Download, ExternalLink, ImageOff, ImagePlus, Images, LoaderCircle, Power, Printer, ScanFace, ShieldCheck, Trash2, Users,
} from 'lucide-react';
import { EventStateBadge } from '../components/EventStateBadge';
import { PhotoDropzone } from '../components/PhotoDropzone';
import { PrintOnly, TableCard } from '../components/TableCard';
import { UploadProgressCard, UploadSummaryText } from '../components/UploadProgressCard';
import {
  Alert, Badge, Button, Card, CardHeader, EmptyState, ErrorText, Lightbox, Modal, PageHeader, ProgressBar, Skeleton, StatCard, Toggle, buttonClass,
} from '../components/ui';
import { api, send } from '../lib/api';
import { cn } from '../lib/cn';
import { thumbnail } from '../lib/images';
import type { EventDetail, Photo } from '../lib/types';
import { uploadEventPhotos, type UploadProgress } from '../lib/upload';

const progressCopy = {
  READY: { title: 'All set — guests can find their photos', body: 'Face analysis runs in the background after every upload.' },
  EMPTY: { title: 'Add photos to get started', body: 'Face analysis starts as soon as the first photos are uploaded.' },
  FAILED: { title: 'Photos could not be analysed', body: 'Try deleting the failed photos and uploading them again.' },
  PROCESSING: { title: 'Analysing faces…', body: 'This page updates by itself. You can close it — processing continues.' },
};

/** Small status chip on a photo tile. */
function PhotoStatus({ photo }: { photo: Photo }) {
  const base = 'absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur';
  if (photo.status === 'READY') return <span className={cn(base, 'bg-black/50')}><ScanFace className="size-3" />{photo.faceCount}</span>;
  if (photo.status === 'FAILED') return <span className={cn(base, 'bg-brand-600/90')}><CircleAlert className="size-3" />failed</span>;
  return <span className={cn(base, 'bg-ink/70')}><LoaderCircle className="size-3 animate-spin" />developing</span>;
}

function LoadingState() {
  return (
    <div className="space-y-8">
      <div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-72" /><Skeleton className="h-4 w-48" /></div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}</div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
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
      <Card>
        <EmptyState icon={<ImageOff />} title="Event not found" body="It may have been deleted, or the link is wrong." action={<Link to="/dashboard" className={buttonClass('secondary')}>Back to events</Link>} />
      </Card>
    );
  }

  const { progress } = event;
  const percent = progress.total ? Math.round(((progress.ready + progress.failed) / progress.total) * 100) : 0;
  const shareable = progress.state === 'READY' && event.guestAccess;
  const copy = progressCopy[progress.state];

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
        back={{ to: '/dashboard', label: 'All events' }}
        eyebrow={
          <>
            <EventStateBadge state={progress.state} />
            {event.livenessRequired && <Badge color="violet"><ShieldCheck className="size-3" />Liveness protected</Badge>}
            {!event.guestAccess && <Badge color="gray"><Power className="size-3" />Guest search off</Badge>}
          </>
        }
        title={event.name}
        description={<>Created {new Date(event.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })} · Code <span className="font-mono font-medium text-stone-700">{event.publicCode}</span></>}
        actions={
          <>
            <a href={event.guestUrl} target="_blank" rel="noreferrer" className={buttonClass('secondary')}><ExternalLink className="size-4" />Preview</a>
            <Button onClick={() => setShowUpload(true)}><ImagePlus className="size-4" />Add photos</Button>
            <Button variant="secondary" size="icon" onClick={() => setConfirmDelete(true)} aria-label="Delete event" title="Delete event"><Trash2 className="size-4 text-red-600" /></Button>
          </>
        }
      />

      {/* Result of the last upload, only when something was skipped or failed */}
      {uploadSummary && (uploadSummary.duplicates > 0 || uploadSummary.failed > 0) && (
        <div className="mb-6 flex animate-enter items-start gap-3 rounded-xl bg-white p-4 shadow-card ring-1 ring-stone-900/6">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold">Upload finished</p>
            <UploadSummaryText progress={uploadSummary} />
          </div>
          <button onClick={() => setUploadSummary(null)} className="rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800">Dismiss</button>
        </div>
      )}

      <div className="mb-6 grid animate-enter grid-cols-2 gap-4 [animation-delay:60ms] lg:grid-cols-4">
        <StatCard label="Photos" value={progress.total.toLocaleString()} icon={Images} />
        <StatCard label="Analysed" value={progress.ready.toLocaleString()} icon={ScanFace} />
        <StatCard label="Failed" value={progress.failed.toLocaleString()} icon={CircleAlert} />
        <StatCard label="Guest searches" value={event.searchCount.toLocaleString()} icon={Users} />
      </div>

      <div className="grid animate-enter items-start gap-6 [animation-delay:120ms] lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Progress */}
          <Card>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl leading-tight text-ink">{copy.title}</h2>
                <p className="mt-0.5 text-sm text-stone-500">{copy.body}</p>
              </div>
              <span className="font-display text-6xl leading-none tracking-tight text-ink tabular-nums">{percent}<span className="text-3xl text-stone-400">%</span></span>
            </div>
            <ProgressBar value={percent} active={progress.state === 'PROCESSING'} />
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader
              title="Photos"
              description={photos.length ? `${photos.length.toLocaleString()} files · click a photo to view it` : undefined}
              action={photos.length > 0 && <Button variant="secondary" size="sm" onClick={() => setShowUpload(true)}><ImagePlus className="size-4" />Add more</Button>}
            />
            {photosQuery.isLoading ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}</div>
            ) : photos.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setViewing(index)}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-paper-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    aria-label={`View photo ${index + 1}`}
                  >
                    {/* Photos still being analysed look like prints that haven't developed yet. */}
                    <img
                      src={thumbnail(photo.url, 300)}
                      alt=""
                      loading="lazy"
                      className={cn('size-full object-cover transition duration-700 ease-editorial group-hover:scale-105', photo.status === 'PROCESSING' && 'animate-pulse blur-[2px] grayscale')}
                    />
                    <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                    <PhotoStatus photo={photo} />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon={<ImagePlus />} title="No photos yet" body="Add the event's photos and we'll find every face in them." action={<Button onClick={() => setShowUpload(true)}><ImagePlus className="size-4" />Add photos</Button>} className="py-10" />
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          {/* Share */}
          <Card>
            <CardHeader
              title="Share with guests"
              description={shareable ? 'Put this card on every table, or share the link.' : !event.guestAccess ? 'Guest search is switched off.' : 'The QR code works as soon as processing finishes.'}
              className="mb-5"
            />
            <TableCard eventName={event.name} guestUrl={event.guestUrl} code={event.publicCode} qrRef={qrRef} dimmed={!shareable} className="-rotate-1 transition duration-500 ease-editorial hover:rotate-0" />
            <div className="mt-6 flex items-center gap-2 rounded-full bg-white p-1 pl-4 ring-1 ring-stone-900/10">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-stone-600">{event.guestUrl.replace(/^https?:\/\//, '')}</span>
              <Button variant={copied ? 'secondary' : 'primary'} size="sm" onClick={copyLink} aria-label="Copy guest link">
                {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowPrint(true)}><Printer className="size-4" />Print card</Button>
              <Button variant="secondary" size="sm" onClick={downloadQr}><Download className="size-4" />QR as PNG</Button>
            </div>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader title="Privacy & access" className="mb-4" />
            <div className="space-y-3">
              <Toggle
                icon={<Power className="size-4" />}
                checked={event.guestAccess}
                disabled={update.isPending}
                onChange={(guestAccess) => update.mutate({ guestAccess })}
                title="Guest search"
                description="When off, the QR code, bots and existing gallery links stop working immediately."
              />
              <Toggle
                icon={<ShieldCheck className="size-4" />}
                checked={event.livenessRequired}
                disabled={update.isPending}
                onChange={(livenessRequired) => update.mutate({ livenessRequired })}
                title="Liveness check"
                description="Guests prove they're the person in the selfie with a quick live camera check before their gallery opens."
              />
              <ErrorText>{update.error?.message}</ErrorText>
            </div>
          </Card>
        </div>
      </div>

      {showUpload && (
        <Modal title="Add photos" description="New photos are analysed automatically. Duplicates are skipped." onClose={() => !upload.isPending && setShowUpload(false)}>
          <PhotoDropzone compact disabled={upload.isPending} onFiles={(files) => files.length && upload.mutate(files)} />
          {uploadProgress && <div className="mt-4"><UploadProgressCard progress={uploadProgress} /></div>}
          {upload.error && <div className="mt-3"><ErrorText>{upload.error.message}</ErrorText></div>}
        </Modal>
      )}

      {showPrint && (
        <Modal title="Print a table card" description="Print one for every table — guests scan it with their phone camera." onClose={() => setShowPrint(false)} wide>
          <div className="rounded-2xl bg-paper-deep/70 p-6 sm:p-10">
            <TableCard eventName={event.name} guestUrl={event.guestUrl} code={event.publicCode} large />
          </div>
          <PrintOnly><TableCard eventName={event.name} guestUrl={event.guestUrl} code={event.publicCode} large className="shadow-none" /></PrintOnly>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowPrint(false)}>Close</Button>
            <Button onClick={() => window.print()}><Printer className="size-4" />Print</Button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title={`Delete "${event.name}"?`} onClose={() => setConfirmDelete(false)}>
          <Alert tone="error">This permanently deletes the event, all its photos, face data and guest galleries. This can't be undone.</Alert>
          {deleteEvent.error && <div className="mt-3"><ErrorText>{deleteEvent.error.message}</ErrorText></div>}
          <div className="mt-6 flex justify-end gap-2">
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
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[13px] text-white">
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
