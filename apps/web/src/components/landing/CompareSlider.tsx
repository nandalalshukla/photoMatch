/**
 * "From 2,148 photos to your 23" — a before/after slider.
 * Left: the whole event as a black-and-white contact sheet. Right: one guest's
 * own gallery, in color. Built on a real range input, so it works with mouse,
 * touch and keyboard, and screen readers announce it.
 */
import { useEffect, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import { useInView } from '../ui';

const SHEET = [
  'moment-band', 'lens-cafe', 'moment-concert', 'moment-family', 'moment-festival', 'moment-couple', 'moment-fireworks', 'photographer',
  'auth-camera', 'guest-sparkler', 'hero-sparkler', 'lost-lights', 'privacy-glass', 'cta-fireworks', 'match-field', 'match-lake',
];
const MINE = ['match-portrait', 'match-field', 'match-lake', 'match-meadow', 'match-sunset'];

export function CompareSlider() {
  const [value, setValue] = useState(50);
  const [touched, setTouched] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>(0.5);

  // Once it scrolls into view, nudge the handle left and right as a hint — unless the visitor got there first.
  useEffect(() => {
    if (!inView || touched) return;
    const keys = [[0, 50], [700, 34], [1500, 64], [2200, 50]];
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      // The frame timestamp can be a little earlier than `start`; never let time go negative.
      const t = Math.max(1, now - start);
      const next = keys.findIndex(([at]) => at > t);
      if (next === -1) return setValue(50);
      const [t0, v0] = keys[next - 1];
      const [t1, v1] = keys[next];
      const p = (t - t0) / (t1 - t0);
      const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      setValue(v0 + (v1 - v0) * eased);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, touched]);

  return (
    <div ref={ref} className="relative aspect-[4/5] overflow-hidden rounded-[28px] select-none sm:aspect-[16/10]">
      {/* Before: every photo of the event */}
      <div className="absolute inset-0 grid grid-cols-6 gap-1 bg-ink p-1 sm:grid-cols-10" style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}>
        {Array.from({ length: 60 }, (_, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-[3px] bg-ink-soft">
            <img src={`/editorial/${SHEET[(i * 7) % SHEET.length]}.webp`} alt="" loading="lazy" className="size-full object-cover opacity-70 grayscale" draggable={false} />
            <span className="absolute bottom-0.5 left-1 font-mono text-[8px] text-white/50">{String(i + 1).padStart(3, '0')}</span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute top-4 left-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur sm:top-5 sm:left-5">
        2,148 photos<span className="hidden sm:inline"> from the night</span>
      </div>

      {/* After: just this guest's photos */}
      <div className="absolute inset-0 bg-paper" style={{ clipPath: `inset(0 0 0 ${value}%)` }}>
        <div className="grid h-full grid-cols-3 grid-rows-2 gap-2 p-2 sm:gap-3 sm:p-3">
          {MINE.map((name, i) => (
            <div key={name} className={i === 0 ? 'relative col-span-1 row-span-2 overflow-hidden rounded-2xl' : 'relative overflow-hidden rounded-2xl'}>
              <img src={`/editorial/${name}.webp`} alt="" loading="lazy" className="size-full object-cover" draggable={false} />
            </div>
          ))}
          <div className="grid place-items-center rounded-2xl bg-ink p-3 text-center text-paper">
            <div>
              <p className="font-display text-4xl leading-none sm:text-6xl">+18</p>
              <p className="mt-1 text-[11px] text-white/60 sm:text-xs">more of you</p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute top-4 right-4 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper sm:top-5 sm:right-5">
          Your 23<span className="hidden sm:inline"> — delivered to you</span>
        </div>
      </div>

      {/* Handle */}
      <div className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.1)]" style={{ left: `${value}%` }}>
        <span className="absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-elevated">
          <MoveHorizontal className="size-5" />
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={value}
        onChange={(e) => { setTouched(true); setValue(Number(e.target.value)); }}
        onPointerDown={() => setTouched(true)}
        aria-label="Compare all event photos with your own gallery"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
