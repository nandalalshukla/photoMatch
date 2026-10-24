/** Things that float above the page: dialogs, the photo lightbox and dropdown menus. */
import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { thumbnail } from '../../lib/images';
import { useDismiss, useScrollLock } from '../../lib/use-dismiss';

// ---------- Modal ----------

/** A centered dialog on a dimmed background. Closes on Escape and on a click outside. */
export function Modal({ title, description, onClose, children, wide }: { title: string; description?: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDismiss(onClose);
  useScrollLock();
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-ink/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn('max-h-[calc(100dvh-2rem)] w-full animate-scale-in overflow-y-auto rounded-3xl bg-white p-6 shadow-elevated outline-none sm:p-8', wide ? 'max-w-2xl' : 'max-w-md')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl leading-tight text-ink">{title}</h2>
            {description && <p className="mt-1.5 text-sm text-stone-500">{description}</p>}
          </div>
          <button onClick={onClose} className="-m-1 rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-ink" aria-label="Close"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Lightbox ----------

type LightboxProps<T extends { id: string; url: string }> = {
  items: T[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Buttons or info shown under the photo. */
  actions?: (item: T) => ReactNode;
};

/**
 * Full-screen photo viewer: previous/next with buttons, arrow keys or a swipe,
 * a counter, and a filmstrip of thumbnails to jump to any photo.
 */
export function Lightbox<T extends { id: string; url: string }>({ items, index, onIndexChange, onClose, actions }: LightboxProps<T>) {
  const item = items[index];
  const count = items.length;
  const swipeStart = useRef<number | null>(null);
  const swiped = useRef(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const go = useCallback((step: number) => onIndexChange((index + step + count) % count), [index, count, onIndexChange]);
  useDismiss(onClose);
  useScrollLock();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);
  // Keep the current thumbnail in view.
  useEffect(() => {
    stripRef.current?.children[index]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [index]);

  if (!item) return null;
  const arrow = 'absolute top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20 sm:block';

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-ink/97" onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div className="flex items-center justify-between p-4 text-white/70">
        <span className="eyebrow tabular-nums">{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span>
        <button className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20" aria-label="Close"><X className="size-5" /></button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-4 sm:px-20"
        onPointerDown={(e) => { swipeStart.current = e.clientX; }}
        onPointerUp={(e) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (start !== null && Math.abs(e.clientX - start) > 50) {
            swiped.current = true;
            go(e.clientX < start ? 1 : -1);
          }
        }}
        // A swipe also fires a click; don't let it reach the backdrop (which closes the viewer).
        onClickCapture={(e) => {
          if (swiped.current) {
            swiped.current = false;
            e.stopPropagation();
          }
        }}
      >
        {count > 1 && <button className={cn(arrow, 'left-5')} onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous photo"><ChevronLeft className="size-5" /></button>}
        <img
          key={item.id}
          src={thumbnail(item.url, 1800, 'limit')}
          alt=""
          draggable={false}
          className="max-h-full max-w-full animate-develop rounded-md object-contain select-none"
          onClick={(e) => e.stopPropagation()}
        />
        {count > 1 && <button className={cn(arrow, 'right-5')} onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next photo"><ChevronRight className="size-5" /></button>}
      </div>
      <div className="flex flex-col items-center gap-3 p-4" onClick={(e) => e.stopPropagation()}>
        {actions && <div className="flex min-h-10 items-center justify-center gap-2">{actions(item)}</div>}
        {count > 1 && (
          <div ref={stripRef} className="flex max-w-full gap-1.5 overflow-x-auto px-2 pb-1 [scrollbar-width:none]">
            {items.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => onIndexChange(i)}
                aria-label={`Photo ${i + 1}`}
                className={cn('size-12 shrink-0 overflow-hidden rounded-md transition duration-300', i === index ? 'opacity-100 ring-2 ring-white' : 'opacity-40 hover:opacity-80')}
              >
                <img src={thumbnail(photo.url, 120)} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Menu ----------

/** A button that opens a small dropdown. Closes on a click outside, Escape, or picking an item. */
export function Menu({ trigger, label, align = 'right', children }: { trigger: ReactNode; label: string; align?: 'left' | 'right'; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(close, { ref, enabled: open });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full p-0.5 transition hover:ring-2 hover:ring-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onClick={close}
          className={cn(
            'absolute top-full z-40 mt-3 w-64 origin-top-right animate-scale-in rounded-2xl bg-white p-1.5 shadow-elevated ring-1 ring-stone-900/8',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const menuItemClass = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-stone-700 transition hover:bg-paper hover:text-ink [&>svg]:size-4 [&>svg]:text-stone-400';

export function MenuLink({ className, ...props }: LinkProps) {
  return <Link role="menuitem" className={cn(menuItemClass, className)} {...props} />;
}

export function MenuButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" role="menuitem" className={cn(menuItemClass, className)} {...props} />;
}
