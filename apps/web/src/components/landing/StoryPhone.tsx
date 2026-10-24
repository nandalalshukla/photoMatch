/**
 * "How it works" told as a scroll story: a phone stays pinned while the three
 * steps scroll past, and its screen plays the matching scene. On small screens
 * each step shows its own phone instead.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Camera, Check, QrCode } from 'lucide-react';
import { cn } from '../../lib/cn';
import { steps } from './content';

const UPLOADS = [
  'moment-couple', 'moment-band', 'moment-family', 'match-field', 'moment-festival', 'lens-cafe',
  'match-lake', 'moment-concert', 'guest-sparkler', 'moment-fireworks', 'match-meadow', 'hero-sparkler',
];
const MATCHES = ['match-portrait', 'match-field', 'match-lake', 'match-meadow', 'match-sunset', 'hero-sparkler'];

/** Reveals children one by one, `gap` ms apart, each time it mounts. */
function useSequence(count: number, gap: number) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = Array.from({ length: count }, (_, i) => setTimeout(() => setShown(i + 1), gap * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [count, gap]);
  return shown;
}

function UploadScene() {
  const shown = useSequence(UPLOADS.length + 1, 260); // the extra step shows the "ready" toast
  return (
    <div className="relative flex h-full flex-col bg-paper p-4 pt-10">
      <p className="eyebrow text-stone-500">New event</p>
      <p className="mt-1 font-display text-2xl leading-tight text-ink">Maya &amp; Aarav's Wedding</p>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${(Math.min(shown, UPLOADS.length) / UPLOADS.length) * 100}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-stone-500 tabular-nums">{Math.round((Math.min(shown, UPLOADS.length) / UPLOADS.length) * 1240).toLocaleString()} of 1,240 photos · finding faces</p>
      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {UPLOADS.map((name, i) => (
          <div key={name} className="aspect-square overflow-hidden rounded-md bg-stone-200">
            {i < shown && <img src={`/editorial/${name}.webp`} alt="" className="size-full animate-develop object-cover" />}
          </div>
        ))}
      </div>
      {shown > UPLOADS.length && (
        <div className="absolute inset-x-3 bottom-4 flex animate-slide-up items-center gap-2.5 rounded-2xl bg-ink p-3 text-paper shadow-elevated">
          <span className="grid size-8 place-items-center rounded-full bg-white/10"><Check className="size-4 text-brand-400" /></span>
          <div className="leading-tight"><p className="text-[12px] font-semibold">3,912 faces found</p><p className="text-[11px] text-white/60">Ready — share your QR code</p></div>
        </div>
      )}
    </div>
  );
}

function ScanScene() {
  const shown = useSequence(2, 1600);
  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-ink-soft">
      <img src="/editorial/guest-sparkler.webp" alt="" className="absolute inset-0 size-full object-cover opacity-30 blur-[2px]" />
      <div className="relative grid size-44 place-items-center rounded-3xl bg-white p-4">
        <QrCode className="size-full text-ink" strokeWidth={1.2} />
        <span className="absolute inset-x-3 h-0.5 animate-scan rounded-full bg-brand-500 shadow-[0_0_14px_3px_rgb(223_86_54/0.7)]" />
        {['top-0 left-0 border-t-2 border-l-2 rounded-tl-xl', 'top-0 right-0 border-t-2 border-r-2 rounded-tr-xl', 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl', 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl'].map((c) => (
          <span key={c} className={cn('absolute -m-3 size-8 border-white', c)} />
        ))}
      </div>
      {shown >= 1 && (
        <div className="absolute inset-x-3 top-10 animate-slide-up rounded-2xl bg-white/95 p-3 shadow-elevated backdrop-blur">
          <p className="text-[11px] font-semibold text-ink">Open in WhatsApp</p>
          <p className="text-[11px] text-stone-500">“Find my photos for event K7P2QM9X”</p>
        </div>
      )}
    </div>
  );
}

function Bubble({ me, children, className }: { me?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn('w-fit max-w-[85%] animate-slide-up rounded-2xl px-3 py-2 text-[12px] leading-snug shadow-xs', me ? 'ml-auto rounded-br-md bg-ink text-paper' : 'rounded-bl-md bg-white text-ink', className)}>
      {children}
    </div>
  );
}

function ChatScene() {
  const shown = useSequence(5, 900);
  return (
    <div className="flex h-full flex-col bg-paper-deep">
      <div className="flex items-center gap-2 border-b border-stone-300/60 bg-paper px-3 pt-9 pb-2.5">
        <img src="/logo.svg" alt="" className="size-7" />
        <div className="leading-tight"><p className="text-[12px] font-semibold text-ink">PhotoMatch AI</p><p className="text-[10px] text-stone-500">online</p></div>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2 p-3">
        {shown >= 1 && <Bubble me>Find my photos for event K7P2QM9X</Bubble>}
        {shown >= 2 && <Bubble>Connected to <b>Maya &amp; Aarav's Wedding</b> 🎉 Send me a selfie!</Bubble>}
        {shown >= 3 && (
          <Bubble me className="p-1">
            <img src="/editorial/selfie.webp" alt="" className="size-24 rounded-xl object-cover" />
          </Bubble>
        )}
        {shown === 4 && <Bubble className="flex gap-1 py-3">{[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: `${i * 120}ms` }} />)}</Bubble>}
        {shown >= 5 && (
          <Bubble>
            I found <b>23 photos</b> of you ✨
            <div className="mt-2 grid grid-cols-3 gap-1">
              {MATCHES.map((name, i) => <img key={name} src={`/editorial/${name}.webp`} alt="" className="aspect-square animate-develop rounded-md object-cover" style={{ animationDelay: `${i * 90}ms` }} />)}
            </div>
            <p className="mt-2 flex items-center gap-1 font-semibold text-brand-600">Open my gallery →</p>
          </Bubble>
        )}
      </div>
    </div>
  );
}

const SCENES = [UploadScene, ScanScene, ChatScene];

function Phone({ step, className }: { step: number; className?: string }) {
  const Scene = SCENES[step];
  return (
    <div className={cn('relative mx-auto w-70 rounded-[44px] bg-ink p-2.5 shadow-elevated ring-1 ring-black', className)}>
      <div className="relative h-140 overflow-hidden rounded-[36px]">
        <div className="absolute top-2.5 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
        {/* key → the scene restarts its animation whenever the step changes */}
        <div key={step} className="h-full animate-fade-in"><Scene /></div>
      </div>
    </div>
  );
}

export function StoryPhone() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(Number((entry.target as HTMLElement).dataset.step))),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    stepRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const icons = [Camera, QrCode, Check];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,1fr)] lg:gap-20">
      <div className="hidden lg:block">
        <div className="sticky top-[calc(50vh-290px)]"><Phone step={active} /></div>
      </div>
      <ol>
        {steps.map((step, i) => {
          const Icon = icons[i];
          return (
            <li
              key={step.title}
              ref={(element) => { stepRefs.current[i] = element; }}
              data-step={i}
              className="flex min-h-[70vh] flex-col justify-center border-t border-stone-300/70 py-12 first:border-t-0 lg:py-0"
            >
              <div className={cn('transition-opacity duration-700 ease-editorial lg:opacity-30', active === i && 'lg:opacity-100')}>
                <div className="flex items-center gap-3 text-stone-500">
                  <span className="font-display text-6xl leading-none text-ink">{String(i + 1).padStart(2, '0')}</span>
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-6 font-display text-4xl leading-tight text-ink sm:text-5xl">{step.title}</h3>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-stone-600">{step.body}</p>
              </div>
              <Phone step={i} className="mt-10 lg:hidden" />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
