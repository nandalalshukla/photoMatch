import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** A white surface on the paper background. `padded={false}` for tables and edge-to-edge content. */
export function Card({ className, padded = true, children }: { className?: string; padded?: boolean; children: ReactNode }) {
  return <div className={cn('rounded-3xl bg-white ring-1 ring-stone-900/7', padded && 'p-6 sm:p-7', className)}>{children}</div>;
}

/** Title row of a card, with an optional description and action on the right. */
export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-5 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-2xl leading-tight text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** One big number with a label — used in stat rows. */
export function StatCard({ label, value, icon: Icon, hint, className }: { label: string; value: ReactNode; icon?: ComponentType<{ className?: string }>; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-3xl bg-white p-5 ring-1 ring-stone-900/7 sm:p-6', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow text-stone-500">{label}</p>
        {Icon && <Icon className="size-4 text-stone-400" />}
      </div>
      <p className="mt-3 font-display text-[44px] leading-none tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

const badgeColors = {
  gray: 'bg-stone-100 text-stone-700 ring-stone-900/10',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-700/15',
  amber: 'bg-amber-50 text-amber-800 ring-amber-700/15',
  red: 'bg-brand-50 text-brand-700 ring-brand-700/15',
  ink: 'bg-ink text-paper ring-ink',
  violet: 'bg-ink text-paper ring-ink',
  blue: 'bg-sky-50 text-sky-800 ring-sky-700/15',
};

export type BadgeColor = keyof typeof badgeColors;

/** A small status pill. `dot` adds a colored dot in front. */
export function Badge({ color = 'gray', dot, className, children }: { color?: BadgeColor; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', badgeColors[color], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
