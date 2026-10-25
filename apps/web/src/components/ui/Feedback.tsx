/** Everything that tells the user what's going on: callouts, loading states, empty states, progress. */
import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

const calloutTones = {
  info: { box: 'bg-paper', emoji: '💡' },
  success: { box: 'bg-tag-green/60', emoji: '✅' },
  warning: { box: 'bg-tag-yellow/60', emoji: '⚠️' },
  error: { box: 'bg-tag-red/70', emoji: '❗' },
};

/**
 * A callout block, like Notion's: an emoji (or icon) and text on a soft background.
 * Pass `icon` to replace the tone's default emoji.
 */
export function Alert({ tone = 'info', title, icon, className, children }: { tone?: keyof typeof calloutTones; title?: ReactNode; icon?: ReactNode; className?: string; children?: ReactNode }) {
  const { box, emoji } = calloutTones[tone];
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className={cn('flex gap-2.5 rounded-md px-3.5 py-3 text-sm text-ink', box, className)}>
      <span className="shrink-0 text-base leading-5 [&>svg]:mt-0.5 [&>svg]:size-4" aria-hidden>{icon ?? emoji}</span>
      <div className="min-w-0 space-y-0.5 leading-5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? 'text-muted' : undefined}>{children}</div>}
      </div>
    </div>
  );
}

/** An error message; renders nothing when there is no error. */
export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <Alert tone="error">{children}</Alert>;
}

export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted', className)}>
      <LoaderCircle className="size-5 animate-spin" />
      {label ? <p className="text-sm">{label}</p> : <span className="sr-only">Loading</span>}
    </div>
  );
}

/** A placeholder shaped like the content that is loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-md', className)} />;
}

/** Shown when a list is empty. `icon` is usually an emoji. */
export function EmptyState({ icon, title, body, action, className }: { icon: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex animate-enter flex-col items-center px-6 py-14 text-center', className)}>
      <div className="mb-4 text-4xl text-muted [&>svg]:size-8" aria-hidden>{icon}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** A thin progress bar. `active` is for work still going on (the bar pulses gently). */
export function ProgressBar({ value, active, className }: { value: number; active?: boolean; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-[#ebeced]', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full bg-brand-500 transition-[width] duration-500', active && 'animate-pulse')} style={{ width: `${Math.max(value, value > 0 ? 2 : 0)}%` }} />
    </div>
  );
}
