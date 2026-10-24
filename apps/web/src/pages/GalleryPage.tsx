/**
 * A guest's private gallery — the link the bot sends.
 * If the event requires liveness, the LivenessCheck is shown first; the API
 * only returns photos once the check has passed on this browser.
 */
import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Check, CheckSquare, Download, ImageOff, LoaderCircle, Lock, Maximize2, Play, ScanFace, SearchX, X } from 'lucide-react';
import { LivenessCheck } from '../components/LivenessCheck';
import { Logo } from '../components/Logo';
import { StoryMode } from '../components/StoryMode';
import { Button, EmptyState, Lightbox, Skeleton, buttonClass } from '../components/ui';
import { api } from '../lib/api';
import { cn } from '../lib/cn';
import { thumbnail } from '../lib/images';
import type { Gallery } from '../lib/types';

/** Cloudinary's "fl_attachment" flag makes the browser download instead of opening the image. */
const downloadUrl = (url: string) => url.replace('/image/upload/', '/image/upload/fl_attachment/');

/** White card used for every non-gallery state (errors, searching). */
function StateCard({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white ring-1 ring-stone-900/7">{children}</div>;
}

function Searching() {
  return (
    <StateCard>
      <div className="flex animate-enter flex-col items-center px-6 py-14 text-center">
        {/* The darkroom: a safelight scans while the photos "develop". */}
        <div className="relative grid size-24 place-items-center overflow-hidden rounded-3xl bg-ink text-paper">
          <ScanFace className="size-10" />
          <span className="absolute inset-x-3 h-0.5 animate-scan rounded-full bg-brand-500 shadow-[0_0_14px_3px_rgb(223_86_54/0.7)]" />
        </div>
        <h1 className="mt-7 font-display text-4xl text-ink">Developing your photos…</h1>
        <p className="mt-2 text-sm text-stone-500">We're comparing your selfie with every photo from the event. This takes a few seconds.</p>
      </div>
    </StateCard>
  );
}

export function GalleryPage() {
  const { searchId } = useParams();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false); // the "Play memories" slideshow
  const [viewing, setViewing] = useState<number | null>(null); // index of the photo open in the lightbox
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
    if (query.isLoading) {
      return (
        <>
          <div className="mb-8 space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-9 w-80 max-w-full" /></div>
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
            {['h-64', 'h-44', 'h-56', 'h-72', 'h-48', 'h-60', 'h-44', 'h-64'].map((height, i) => <Skeleton key={i} className={`mb-3 w-full rounded-xl ${height}`} />)}
          </div>
        </>
      );
    }
    if (query.error || !gallery) {
      return <StateCard><EmptyState icon={<SearchX />} title="This gallery isn't available" body="The link may be wrong, or the organizer has switched photo search off." /></StateCard>;
    }
    if (gallery.status === 'PENDING') return <Searching />;
    if (gallery.status === 'FAILED') {
      return <StateCard><EmptyState icon={<ImageOff />} title="We couldn't search with that selfie" body="Please send a new, clear selfie to the bot — face the camera in good light." /></StateCard>;
    }
    if (gallery.locked) {
      return <LivenessCheck searchId={searchId!} attemptsLeft={gallery.attemptsLeft} onPassed={() => query.refetch()} />;
    }
    if (!gallery.photos.length) {
      return <StateCard><EmptyState icon={<ImageOff />} title="No photos found yet" body="Try another selfie with good light — or check back once the organizer has uploaded more photos." /></StateCard>;
    }

    const count = gallery.photos.length;
    const allSelected = selected.size === count;

    return (
      <>
        <div className="mb-10 flex animate-enter flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow flex items-center gap-2 text-stone-500"><span className="size-2 rounded-full bg-brand-500" />{gallery.eventName}</p>
            <h1 className="mt-4 font-display text-5xl leading-none tracking-tight text-ink sm:text-7xl">
              We found <em>{count}</em> photo{count === 1 ? '' : 's'}<br className="hidden sm:block" /> of you.
            </h1>
            <p className="mt-4 text-[15px] text-stone-500">Play them as a slideshow, open any photo, or select several to download at once.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!selecting && <Button size="lg" onClick={() => setPlaying(true)}><Play className="size-4 fill-current" />Play memories</Button>}
            <Button size="lg" variant="secondary" onClick={() => { setSelecting(!selecting); setSelected(new Set()); setDownloadError(''); }}>
              {selecting ? <><X className="size-4" />Cancel</> : <><CheckSquare className="size-4" />Select</>}
            </Button>
          </div>
        </div>

        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {gallery.photos.map((photo, index) => {
            const isSelected = selected.has(photo.id);
            return (
              <button
                key={photo.id}
                onClick={() => (selecting ? toggle(photo.id) : setViewing(index))}
                aria-pressed={selecting ? isSelected : undefined}
                aria-label={selecting ? `Select photo ${index + 1}` : `View photo ${index + 1}`}
                className={cn(
                  'group relative mb-3 block w-full overflow-hidden rounded-2xl bg-paper-deep transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                  isSelected && 'ring-[3px] ring-ink ring-offset-2 ring-offset-paper',
                )}
              >
                {/* Each photo develops like a print as the gallery opens. */}
                <img
                  src={thumbnail(photo.url, 600, 'limit')}
                  alt=""
                  loading="lazy"
                  className={cn('w-full animate-develop transition-transform duration-700 ease-editorial', isSelected ? 'scale-[0.96]' : 'group-hover:scale-[1.04]')}
                  style={{ animationDelay: `${Math.min(index, 12) * 90}ms` }}
                />
                {!selecting && (
                  <span className="absolute inset-0 flex items-end justify-end bg-linear-to-t from-black/35 via-transparent to-transparent p-3 opacity-0 transition duration-300 group-hover:opacity-100">
                    <span className="grid size-9 place-items-center rounded-full bg-white/90 text-ink"><Maximize2 className="size-4" /></span>
                  </span>
                )}
                {selecting && (
                  <span className={cn('absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full border-2 border-white shadow-sm transition', isSelected ? 'scale-110 bg-ink' : 'bg-black/25 backdrop-blur')}>
                    {isSelected && <Check className="size-4 text-white" strokeWidth={3} />}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selecting && (
          <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-md animate-slide-up items-center gap-3 rounded-full bg-ink/95 p-2 pl-5 text-white shadow-elevated ring-1 ring-white/10 backdrop-blur">
            <button className="text-sm font-medium text-white/75 transition hover:text-white" onClick={() => setSelected(allSelected ? new Set() : new Set(gallery.photos.map((p) => p.id)))}>
              {allSelected ? 'Clear' : 'Select all'}
            </button>
            <span className="flex-1 text-center text-sm">{downloadError ? <span className="text-red-300">{downloadError}</span> : <><b className="font-semibold tabular-nums">{selected.size}</b> selected</>}</span>
            <Button variant="white" size="sm" disabled={!selected.size || zipping !== null} onClick={downloadZip}>
              {zipping !== null ? <><LoaderCircle className="size-4 animate-spin" />{zipping}%</> : <><Download className="size-4" />Download</>}
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-stone-300/60 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="eyebrow hidden items-center gap-1.5 text-stone-500 sm:flex"><Lock className="size-3" />Private gallery</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12 pb-28 sm:px-6 sm:py-16">{content()}</main>

      {playing && gallery && (
        <StoryMode photos={gallery.photos} title={gallery.eventName} downloadUrl={downloadUrl} onClose={() => setPlaying(false)} />
      )}

      {viewing !== null && gallery?.photos[viewing] && (
        <Lightbox
          items={gallery.photos}
          index={viewing}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
          actions={(photo) => (
            <a href={downloadUrl(photo.url)} className={buttonClass('white')}><Download className="size-4" />Download original</a>
          )}
        />
      )}
    </div>
  );
}
