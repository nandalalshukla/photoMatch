/**
 * One event, from the organizer's side:
 *   • processing progress (refreshes itself while faces are being analysed)
 *   • QR code + link to share with guests
 *   • guest access and liveness switches
 *   • all photos, with "add more" and delete
 */
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ArrowLeft, Check, Copy, Download, ExternalLink, ImageOff, ImagePlus, Power, ScanFace, ShieldCheck, Trash2, X,
} from 'lucide-react';
import { EventStateBadge } from '../components/EventStateBadge';
import { PhotoDropzone } from '../components/PhotoDropzone';
import { UploadProgressCard } from '../components/UploadProgressCard';
import { Button, Card, EmptyState, ErrorText, Modal, ProgressBar, Spinner, Toggle } from '../components/ui';
import { api, send } from '../lib/api';
import { thumbnail } from '../lib/images';
import type { EventDetail, Photo } from '../lib/types';
import { uploadEventPhotos, type UploadProgress } from '../lib/upload';

export function EventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewing, setViewing] = useState<Photo | null>(null);

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
    onSuccess: () => {
      setShowUpload(false);
      setUploadProgress(null);
      refresh();
    },
  });

  if (eventQuery.isLoading) return <Spinner label="Opening event" />;
  if (!event) return <EmptyState icon={<ImageOff />} title="Event not found" action={<Link to="/dashboard" className="font-semibold text-brand-700">Back to events</Link>} />;

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
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" />All events</Link>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <EventStateBadge state={progress.state} />
            {event.livenessRequired && <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"><ShieldCheck className="size-3.5" />Liveness protected</span>}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{event.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Created {new Date(event.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })} · Code <span className="font-mono font-semibold">{event.publicCode}</span></p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowUpload(true)}><ImagePlus className="size-4" />Add photos</Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(true)} aria-label="Delete event"><Trash2 className="size-4 text-red-600" /></Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Progress */}
          <Card>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-semibold">{progress.state === 'READY' ? 'All set — guests can find their photos' : progress.state === 'EMPTY' ? 'Add photos to get started' : progress.state === 'FAILED' ? 'Photos could not be analysed' : 'Analysing faces…'}</h2>
                <p className="text-sm text-slate-500">{progress.state === 'PROCESSING' ? 'This page updates by itself. You can close it — processing continues.' : 'Face analysis runs in the background after every upload.'}</p>
              </div>
              <span className="text-2xl font-bold text-brand-700">{percent}%</span>
            </div>
            <ProgressBar value={percent} />
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Photos', progress.total],
                ['Ready', progress.ready],
                ['Failed', progress.failed],
                ['Guest searches', event.searchCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <dd className="text-xl font-bold">{Number(value).toLocaleString()}</dd>
                  <dt className="text-xs text-slate-500">{label}</dt>
                </div>
              ))}
            </dl>
          </Card>

          {/* Photos */}
          <Card>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-semibold">Photos</h2>
              <span className="text-sm text-slate-500">{(photosQuery.data?.length ?? 0).toLocaleString()} files</span>
            </div>
            {photosQuery.isLoading ? (
              <Spinner />
            ) : photosQuery.data?.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {photosQuery.data.map((photo) => (
                  <button key={photo.id} onClick={() => setViewing(photo)} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                    <img src={thumbnail(photo.url, 300)} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                    <span className={`absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white ${photo.status === 'READY' ? 'bg-black/55' : photo.status === 'FAILED' ? 'bg-red-600' : 'bg-amber-500'}`}>
                      {photo.status === 'READY' ? <><ScanFace className="size-3" />{photo.faceCount}</> : photo.status === 'FAILED' ? 'failed' : 'analysing'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon={<ImagePlus />} title="No photos yet" body="Add the event's photos and we'll find every face in them." action={<Button onClick={() => setShowUpload(true)}>Add photos</Button>} />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Share */}
          <Card>
            <h2 className="font-semibold">Share with guests</h2>
            <p className="mt-1 text-sm text-slate-500">
              {shareable ? 'Guests scan this, send a selfie on WhatsApp or Telegram, and get their photos.' : !event.guestAccess ? 'Guest search is switched off.' : 'The QR code works as soon as processing finishes.'}
            </p>
            <div ref={qrRef} className={`mx-auto my-5 w-fit rounded-2xl bg-white p-4 ring-1 ring-slate-200 ${shareable ? '' : 'opacity-40 grayscale'}`}>
              <QRCodeCanvas value={event.guestUrl} size={192} level="H" fgColor="#2e1065" imageSettings={{ src: '/logo.svg', height: 40, width: 40, excavate: true }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={copyLink}>{copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy link'}</Button>
              <Button variant="secondary" size="sm" onClick={downloadQr}><Download className="size-4" />Download QR</Button>
            </div>
            <a href={event.guestUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">Preview guest page<ExternalLink className="size-3.5" /></a>
          </Card>

          {/* Settings */}
          <Card className="space-y-3">
            <h2 className="font-semibold">Privacy & access</h2>
            <Toggle
              icon={<Power className="size-5" />}
              checked={event.guestAccess}
              disabled={update.isPending}
              onChange={(guestAccess) => update.mutate({ guestAccess })}
              title="Guest search"
              description="When off, the QR code, bots and existing gallery links stop working immediately."
            />
            <Toggle
              icon={<ShieldCheck className="size-5" />}
              checked={event.livenessRequired}
              disabled={update.isPending}
              onChange={(livenessRequired) => update.mutate({ livenessRequired })}
              title="Liveness check"
              description="Guests prove they're the person in the selfie with a quick live camera check before their gallery opens."
            />
            <ErrorText>{update.error?.message}</ErrorText>
          </Card>
        </div>
      </div>

      {showUpload && (
        <Modal title="Add photos" onClose={() => !upload.isPending && setShowUpload(false)}>
          <PhotoDropzone compact disabled={upload.isPending} onFiles={(files) => files.length && upload.mutate(files)} />
          {uploadProgress && <div className="mt-4"><UploadProgressCard progress={uploadProgress} /></div>}
          <div className="mt-3"><ErrorText>{upload.error?.message}</ErrorText></div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title={`Delete "${event.name}"?`} onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-slate-600">This permanently deletes the event, all its photos, face data and guest galleries. This can't be undone.</p>
          <ErrorText>{deleteEvent.error?.message}</ErrorText>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" loading={deleteEvent.isPending} onClick={() => deleteEvent.mutate()}><Trash2 className="size-4" />Delete event</Button>
          </div>
        </Modal>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/90 p-4" onClick={() => setViewing(null)}>
          <button className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close"><X className="size-5" /></button>
          <img src={thumbnail(viewing.url, 1600, 'limit')} alt="" className="max-h-[80vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white">{viewing.status === 'READY' ? `${viewing.faceCount} face(s) found` : viewing.status.toLowerCase()}</span>
            <Button variant="danger" size="sm" loading={deletePhoto.isPending} onClick={() => deletePhoto.mutate(viewing.id)}><Trash2 className="size-4" />Delete photo</Button>
          </div>
        </div>
      )}
    </>
  );
}
