/** Everything that tells the user what's going on: alerts, loading states, empty states, progress. */
import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

const alertTones = {
  info: { box: 'bg-paper text-ink ring-stone-900/10', icon: Info, iconColor: 'text-ink' },
  success: { box: 'bg-emerald-50 text-emerald-900 ring-emerald-700/15', icon: CircleCheck, iconColor: 'text-emerald-600' },
  warning: { box: 'bg-amber-50 text-amber-900 ring-amber-700/15', icon: TriangleAlert, iconColor: 'text-amber-600' },
  error: { box: 'bg-brand-50 text-brand-800 ring-brand-700/15', icon: CircleAlert, iconColor: 'text-brand-600' },
};

/** A message box. Pass `icon` to replace the tone's default icon. */
export function Alert({ tone = 'info', title, icon, className, children }: { tone?: keyof typeof alertTones; title?: ReactNode; icon?: ReactNode; className?: string; children?: ReactNode }) {
  const { box, icon: Icon, iconColor } = alertTones[tone];
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className={cn('flex gap-3 rounded-2xl p-4 text-sm ring-1 ring-inset', box, className)}>
      <span className={cn('mt-px shrink-0 [&>svg]:size-4', iconColor)}>{icon ?? <Icon />}</span>
      <div className="min-w-0 space-y-0.5 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'opacity-90' : undefined}>{children}</div>}
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
    <div role="status" className={cn('flex flex-col items-center justify-center gap-3 py-16 text-stone-500', className)}>
      <LoaderCircle className="size-6 animate-spin text-ink" />
      {label ? <p className="text-sm">{label}</p> : <span className="sr-only">Loading</span>}
    </div>
  );
}

/** A placeholder shaped like the content that is loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-xl', className)} />;
}

export function EmptyState({ icon, title, body, action, className }: { icon: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex animate-enter flex-col items-center px-6 py-14 text-center', className)}>
      <div className="relative mb-6 grid size-16 place-items-center rounded-full bg-paper text-ink ring-1 ring-stone-900/10 [&>svg]:size-6">
        {icon}
        <span className="absolute top-1 right-1 size-2.5 rounded-full bg-brand-500 ring-2 ring-white" />
      </div>
      <h3 className="font-display text-3xl leading-tight text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">{body}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

/** `active` adds moving stripes — for work that is still going on. */
export function ProgressBar({ value, active, className }: { value: number; active?: boolean; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-stone-200', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('relative h-full rounded-full transition-[width] duration-700 ease-out-expo', active ? 'brand-gradient' : 'bg-ink')} style={{ width: `${Math.max(value, value > 0 ? 2 : 0)}%` }}>
        {active && (
          <div className="absolute inset-0 animate-progress-stripes bg-[linear-gradient(45deg,rgb(255_255_255/0.25)_25%,transparent_25%,transparent_50%,rgb(255_255_255/0.25)_50%,rgb(255_255_255/0.25)_75%,transparent_75%)] bg-[length:1rem_1rem]" />
        )}
      </div>
    </div>
  );
}
