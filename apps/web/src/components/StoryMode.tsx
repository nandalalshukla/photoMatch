/**
 * "Play memories" — a full-screen slideshow of a guest's photos, like stories:
 * each photo slowly zooms and pans (Ken Burns), progress bars run along the top,
 * tap right/left to skip, press and hold to pause, Escape or ✕ to close.
 *
 * The active progress bar is a CSS animation; when it ends we move to the next
 * photo, so pausing is just pausing that animation.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Download, Pause, Play, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { thumbnail } from '../lib/images';
import { useScrollLock } from '../lib/use-dismiss';

const SECONDS_PER_PHOTO = 5;
const HOLD_MS = 250; // pressing longer than this pauses instead of skipping

type Props = { photos: { id: string; url: string }[]; title: string; downloadUrl: (url: string) => string; onClose: () => void };

export function StoryMode({ photos, title, downloadUrl, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const pressedAt = useRef(0);
  useScrollLock();

  const go = (step: number) => {
    setFinished(false);
    setIndex((i) => Math.min(photos.length - 1, Math.max(0, i + step)));
  };
  const next = () => (index === photos.length - 1 ? setFinished(true) : go(1));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === ' ') {
        event.preventDefault();
        setPaused((p) => !p);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // Warm the cache for the next photo so it appears instantly.
  useEffect(() => {
    const upcoming = photos[index + 1];
    if (upcoming) new Image().src = thumbnail(upcoming.url, 1600, 'limit');
  }, [index, photos]);

  const photo = photos[index];
  const src = thumbnail(photo.url, 1600, 'limit');

  return (
    <div className="fixed inset-0 z-50 animate-fade-in overflow-hidden bg-ink text-white select-none" role="dialog" aria-modal="true" aria-label="Memories slideshow">
      {/* Blurred copy fills the screen behind the photo */}
      <img key={`bg-${photo.id}`} src={src} alt="" className="absolute inset-0 size-full scale-110 animate-fade-in object-cover opacity-40 blur-3xl" />

      <div className="relative mx-auto flex h-full max-w-xl flex-col">
        {/* Progress bars */}
        <div className="flex gap-1 px-3 pt-3">
          {photos.map((p, i) => (
            <div key={p.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              {i < index || (i === index && finished) ? (
                <div className="h-full bg-white" />
              ) : i === index ? (
                <div
                  key={`bar-${index}`}
                  className="h-full origin-left animate-story-progress bg-white"
                  style={{ '--story-duration': `${SECONDS_PER_PHOTO}s`, animationPlayState: paused ? 'paused' : 'running' } as CSSProperties}
                  onAnimationEnd={next}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-xl leading-tight">{title}</p>
            <p className="text-xs text-white/60 tabular-nums">{index + 1} of {photos.length}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button onClick={() => setPaused(!paused)} className="rounded-full p-2 transition hover:bg-white/15" aria-label={paused ? 'Play' : 'Pause'}>
              {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
            </button>
            <a href={downloadUrl(photo.url)} className="rounded-full p-2 transition hover:bg-white/15" aria-label="Download this photo"><Download className="size-5" /></a>
            <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/15" aria-label="Close"><X className="size-5" /></button>
          </div>
        </div>

        {/* The photo, with tap zones: left third goes back, the rest goes forward; hold to pause */}
        <div
          className="relative my-4 flex-1 overflow-hidden rounded-3xl"
          onPointerDown={() => {
            pressedAt.current = performance.now();
            setPaused(true);
          }}
          onPointerUp={(e) => {
            setPaused(false);
            // A long press was a "hold to pause" — don't also skip.
            if (performance.now() - pressedAt.current > HOLD_MS) return;
            const rect = e.currentTarget.getBoundingClientRect();
            if (e.clientX < rect.left + rect.width / 3) go(-1);
            else next();
          }}
          onPointerLeave={() => setPaused(false)}
        >
          <img
            key={photo.id}
            src={src}
            alt=""
            draggable={false}
            className={cn('absolute inset-0 size-full animate-ken-burns object-cover', paused && '[animation-play-state:paused]')}
            style={{ animationDuration: `${SECONDS_PER_PHOTO + 1}s` }}
          />
          {finished && (
            <div className="absolute inset-0 grid animate-fade-in place-items-center bg-black/55 p-6 text-center backdrop-blur-sm">
              <div>
                <p className="font-semibold text-5xl leading-tight">That's your night.</p>
                <p className="mt-2 text-white/70">{photos.length} photos of you, all in one place.</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFinished(false); setIndex(0); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-paper"
                >
                  Watch again
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="pb-4 text-center text-[11px] text-white/45">Tap to skip · hold to pause</p>
      </div>
    </div>
  );
}
