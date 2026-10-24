/**
 * "Made for the moments that matter" — a film strip that scrolls sideways as
 * you scroll down (desktop). Each frame turns from black-and-white to color as
 * it crosses the middle of the screen. On phones it's a normal swipeable row.
 */
import { useEffect, useRef, useState } from 'react';
import { moments } from './content';

export function MomentsReel() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0); // px the track has moved left
  const [centers, setCenters] = useState<number[]>([]); // each frame's distance from screen center, 0–1

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      if (desktop) {
        const rect = section.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight)));
        setOffset(progress * Math.max(0, track.scrollWidth - window.innerWidth + 96));
      } else {
        setOffset(0);
      }
      const middle = window.innerWidth / 2;
      setCenters(Array.from(track.children, (child) => {
        const r = child.getBoundingClientRect();
        return Math.min(1, Math.abs(r.left + r.width / 2 - middle) / (window.innerWidth * 0.55));
      }));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const track = trackRef.current;
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    track?.addEventListener('scroll', schedule, { passive: true }); // phones: the row itself scrolls
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      track?.removeEventListener('scroll', schedule);
    };
  }, []);

  return (
    <div ref={sectionRef} className="relative md:h-[260vh]">
      <div className="md:sticky md:top-0 md:flex md:h-screen md:flex-col md:justify-center md:overflow-hidden">
        <div className="mx-auto mb-10 w-full max-w-6xl px-4 sm:px-6">
          <p className="eyebrow text-brand-600">Use cases</p>
          <h2 className="mt-4 max-w-2xl font-display text-5xl leading-[1.02] tracking-tight text-ink sm:text-7xl">Made for the moments <em>that matter.</em></h2>
        </div>
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-6 md:snap-none md:overflow-visible md:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
          style={{ transform: `translate3d(${-offset}px, 0, 0)` }}
        >
          {moments.map((moment, i) => {
            const distance = centers[i] ?? 1;
            return (
              <figure key={moment.title} className="w-[72vw] shrink-0 snap-center sm:w-[340px]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-ink">
                  <img
                    src={`/editorial/${moment.image}.webp`}
                    alt={moment.alt}
                    loading="lazy"
                    className="size-full object-cover transition-[filter] duration-300"
                    style={{ filter: `grayscale(${Math.min(1, distance * 1.4)}) brightness(${1 - distance * 0.25})` }}
                  />
                  <span className="absolute top-3 left-3 font-mono text-[10px] tracking-widest text-white/80">{String(i + 1).padStart(2, '0')}A ▸ ISO 400</span>
                </div>
                <figcaption className="mt-4 flex items-baseline justify-between gap-3">
                  <span className="font-display text-3xl text-ink">{moment.title}</span>
                  <span className="text-xs text-stone-500">{moment.note}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </div>
  );
}
