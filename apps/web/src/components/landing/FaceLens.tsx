/**
 * "Find the faces" — the landing page's hands-on demo of face detection.
 *
 * The photo is shown dim and black-and-white. A lens follows the pointer (or
 * finger, or arrow keys); inside it the photo is in color and the faces our AI
 * would detect are boxed. Every face you uncover is counted. Until someone
 * interacts, the lens drifts around on its own so the section feels alive.
 *
 * The face boxes are positioned for /editorial/lens-cafe.webp (in % of the photo).
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { RotateCcw, ScanFace } from 'lucide-react';
import { cn } from '../../lib/cn';

const PHOTO = '/editorial/lens-cafe.webp';
const FACES = [
  { x: 18.8, y: 37, w: 7, h: 12 },
  { x: 9.8, y: 46.5, w: 4.8, h: 8.5 },
  { x: 30, y: 49, w: 2.8, h: 4.8 },
  { x: 69.6, y: 46, w: 3.6, h: 6.3 },
  { x: 79.8, y: 50.2, w: 3.6, h: 6.5 },
  { x: 86.2, y: 52, w: 6.5, h: 10.5 },
];

export function FaceLens() {
  const areaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [lens, setLens] = useState({ x: 50, y: 50 }); // lens center, in % of the photo
  const [userControl, setUserControl] = useState(false);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [onScreen, setOnScreen] = useState(false);

  const radius = Math.max(64, size.w * 0.12);

  // Track the photo's size (the lens radius and hit-testing are in pixels).
  useEffect(() => {
    const element = areaRef.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    const visible = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    resize.observe(element);
    visible.observe(element);
    return () => {
      resize.disconnect();
      visible.disconnect();
    };
  }, []);

  // Autopilot: drift slowly in a figure-eight until the visitor takes over.
  useEffect(() => {
    if (userControl || !onScreen) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      setLens({ x: 50 + 34 * Math.sin(t * 0.45), y: 52 + 14 * Math.sin(t * 0.9) });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [userControl, onScreen]);

  // Which faces are inside the lens right now? Only the visitor's own finds count.
  const inLens = FACES.map((face) => {
    const dx = ((face.x + face.w / 2 - lens.x) / 100) * size.w;
    const dy = ((face.y + face.h / 2 - lens.y) / 100) * size.h;
    return Math.hypot(dx, dy) < radius * 0.8;
  });
  useEffect(() => {
    if (!userControl) return;
    const newly = inLens.flatMap((inside, i) => (inside && !found.has(i) ? [i] : []));
    if (newly.length) setFound((current) => new Set([...current, ...newly]));
  });

  const moveTo = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setUserControl(true);
    setLens({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
  };
  const onKey = (event: KeyboardEvent) => {
    const step = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[event.key];
    if (!step) return;
    event.preventDefault();
    setUserControl(true);
    setLens((l) => ({ x: Math.min(100, Math.max(0, l.x + step[0])), y: Math.min(100, Math.max(0, l.y + step[1])) }));
  };
  const reset = () => {
    setFound(new Set());
    setUserControl(false);
  };

  const done = found.size === FACES.length;

  return (
    <div className="relative">
      <div
        ref={areaRef}
        tabIndex={0}
        role="application"
        aria-label={`Face detection demo. Move the lens with your mouse, finger or arrow keys. ${found.size} of ${FACES.length} faces found.`}
        onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons) && moveTo(e)}
        onPointerDown={moveTo}
        onKeyDown={onKey}
        className="relative aspect-[3/2] cursor-none touch-pan-y overflow-hidden rounded-[28px] bg-ink select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        {/* Dim, black-and-white photo */}
        <img src={PHOTO} alt="A busy café full of people" className="absolute inset-0 size-full object-cover opacity-50 grayscale" draggable={false} />
        {/* The same photo in color, visible only inside the lens */}
        <div className="absolute inset-0" style={{ clipPath: `circle(${radius}px at ${lens.x}% ${lens.y}%)` }}>
          <img src={PHOTO} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
          {FACES.map((face, i) => (
            <span
              key={i}
              className={cn('absolute rounded-md border-2 transition-all duration-300', inLens[i] ? 'scale-100 border-white opacity-100' : 'scale-125 border-transparent opacity-0')}
              style={{ left: `${face.x}%`, top: `${face.y}%`, width: `${face.w}%`, height: `${face.h}%` }}
            >
              <span className="absolute -top-5 left-0 rounded-sm bg-white px-1 font-mono text-[9px] leading-4 font-semibold text-ink">{String(i + 1).padStart(2, '0')}</span>
            </span>
          ))}
        </div>
        {/* Lens rim with viewfinder marks */}
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full ring-1 ring-white/70"
          style={{ width: radius * 2, height: radius * 2, left: `calc(${lens.x}% - ${radius}px)`, top: `calc(${lens.y}% - ${radius}px)` }}
        >
          <span className="absolute top-1/2 -left-3 h-px w-6 bg-white/80" />
          <span className="absolute top-1/2 -right-3 h-px w-6 bg-white/80" />
          <span className="absolute -top-3 left-1/2 h-6 w-px bg-white/80" />
          <span className="absolute -bottom-3 left-1/2 h-6 w-px bg-white/80" />
          <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-white backdrop-blur">
            {inLens.filter(Boolean).length ? `${inLens.filter(Boolean).length} face${inLens.filter(Boolean).length === 1 ? '' : 's'} detected` : 'Scanning…'}
          </span>
        </div>

        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-5">
          <span className="eyebrow flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-white backdrop-blur">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-brand-500" /></span>
            Live detection
          </span>
          <span className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            <span className="flex gap-1">
              {FACES.map((_, i) => <span key={i} className={cn('size-1.5 rounded-full transition-colors duration-500', found.has(i) ? 'bg-brand-400' : 'bg-white/30')} />)}
            </span>
            <span className="tabular-nums">{found.size}/{FACES.length} found</span>
          </span>
        </div>

        {!userControl && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <span className="animate-float rounded-full bg-white px-4 py-2 text-[13px] font-medium text-ink shadow-elevated">Move the lens to find all {FACES.length} faces</span>
          </div>
        )}

        {done && (
          <div className="absolute inset-0 grid animate-fade-in place-items-center bg-ink/55 p-6 backdrop-blur-[2px]">
            <div className="max-w-sm animate-scale-in text-center text-white">
              <ScanFace className="mx-auto size-8 text-brand-400" />
              <p className="mt-4 font-display text-4xl leading-tight">All six. <em>Nicely done.</em></p>
              <p className="mt-2 text-sm text-white/75">Now imagine doing that for two thousand photos. PhotoMatch finds every face, in every photo, for you.</p>
              <button onClick={reset} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25">
                <RotateCcw className="size-4" />Play again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
