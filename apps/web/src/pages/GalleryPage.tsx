/**
 * A guest's private gallery — the link the bot sends.
 * If the event requires liveness, the LivenessCheck is shown first; the API
 * only returns photos once the check has passed on this browser.
 */
import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Check, CheckSquare, Download, ImageOff, LoaderCircle, SearchX, X } from 'lucide-react';
import { LivenessCheck } from '../components/LivenessCheck';
import { Logo } from '../components/Logo';
import { Button, EmptyState, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { thumbnail } from '../lib/images';
import type { Gallery } from '../lib/types';

type GalleryPhoto = Gallery['photos'][number];

/** Cloudinary's "fl_attachment" flag makes the browser download instead of opening the image. */
const downloadUrl = (url: string) => url.replace('/image/upload/', '/image/upload/fl_attachment/');

export function GalleryPage() {
  const { searchId } = useParams();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState<number | null>(null);
  const [viewing, setViewing] = useState<GalleryPhoto | null>(null);
  const [downloadError, setDownloadError] = useState('');

  const query = useQuery({
    queryKey: ['gallery', searchId],
    queryFn: async () => (await api<{ gallery: Gallery }>(`/galleries/${searchId}`)).gallery,
    retry: false,
    // The search may still be running when the guest opens the link.
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' ? 2000 : false),
  });
  const gallery = query.data;

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Download the selected photos as one ZIP file, built in the browser. */
  const downloadZip = async () => {
    const photos = gallery!.photos.filter((p) => selected.has(p.id));
    setDownloadError('');
    setZipping(0);
    try {
      // The ZIP library is only downloaded when someone actually needs it.
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const [index, photo] of photos.entries()) {
        const response = await fetch(photo.url);
        if (!response.ok) throw new Error('download failed');
        zip.file(`photomatch-${String(index + 1).padStart(3, '0')}.jpg`, await response.blob());
        setZipping(Math.round(((index + 1) / photos.length) * 100));
      }
      const file = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = `${gallery!.eventName.replace(/\W+/g, '-').toLowerCase()}-photos.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
      setSelecting(false);
      setSelected(new Set());
    } catch {
      setDownloadError("Some photos couldn't be downloaded. Check your connection and try again.");
    } finally {
      setZipping(null);
    }
  };

  const content = () => {
    if (query.isLoading) return <Spinner label="Opening your gallery" />;
    if (query.error || !gallery) {
      return <EmptyState icon={<SearchX />} title="This gallery isn't available" body="The link may be wrong, or the organizer has switched photo search off." />;
    }
    if (gallery.status === 'PENDING') return <Spinner label="Finding your photos… this takes a few seconds" />;
    if (gallery.status === 'FAILED') {
      return <EmptyState icon={<ImageOff />} title="We couldn't search with that selfie" body="Please send a new, clear selfie to the bot." />;
    }
    if (gallery.locked) {
      return <LivenessCheck searchId={searchId!} attemptsLeft={gallery.attemptsLeft} onPassed={() => query.refetch()} />;
    }
    if (!gallery.photos.length) {
      return <EmptyState icon={<ImageOff />} title="No photos found yet" body="Try another selfie with good light — or check back once the organizer has uploaded more photos." />;
    }

    return (
      <>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-700">{gallery.eventName}</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">We found {gallery.photos.length} photo{gallery.photos.length === 1 ? '' : 's'} of you ✨</h1>
          </div>
          <Button variant={selecting ? 'secondary' : 'primary'} onClick={() => { setSelecting(!selecting); setSelected(new Set()); }}>
            {selecting ? <><X className="size-4" />Cancel</> : <><CheckSquare className="size-4" />Select & download</>}
          </Button>
        </div>

        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {gallery.photos.map((photo) => {
            const isSelected = selected.has(photo.id);
            return (
              <button
                key={photo.id}
                onClick={() => (selecting ? toggle(photo.id) : setViewing(photo))}
                className={`relative mb-3 block w-full overflow-hidden rounded-xl bg-slate-100 transition ${isSelected ? 'ring-4 ring-brand-500' : ''}`}
              >
                <img src={thumbnail(photo.url, 600, 'limit')} alt="" loading="lazy" className="w-full" />
                {selecting && (
                  <span className={`absolute top-2 right-2 grid size-7 place-items-center rounded-full border-2 border-white ${isSelected ? 'bg-brand-600' : 'bg-black/30'}`}>
                    {isSelected && <Check className="size-4 text-white" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selecting && (
          <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl bg-slate-900 p-3 pl-5 text-white shadow-2xl">
            <button className="text-sm font-medium text-white/80 hover:text-white" onClick={() => setSelected(selected.size === gallery.photos.length ? new Set() : new Set(gallery.photos.map((p) => p.id)))}>
              {selected.size === gallery.photos.length ? 'Clear' : 'Select all'}
            </button>
            <span className="flex-1 text-center text-sm">{downloadError ? <span className="text-red-300">{downloadError}</span> : `${selected.size} selected`}</span>
            <Button size="sm" disabled={!selected.size || zipping !== null} onClick={downloadZip}>
              {zipping !== null ? <><LoaderCircle className="size-4 animate-spin" />{zipping}%</> : <><Download className="size-4" />Download</>}
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-6"><Logo /></div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6">{content()}</main>

      {viewing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/95 p-4" onClick={() => setViewing(null)}>
          <button className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close"><X className="size-5" /></button>
          <img src={thumbnail(viewing.url, 1800, 'limit')} alt="" className="max-h-[82vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <a href={downloadUrl(viewing.url)} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">
            <Download className="size-4" />Download original
          </a>
        </div>
      )}
    </div>
  );
}
