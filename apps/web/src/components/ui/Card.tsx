import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** A bordered white surface. `padded={false}` for tables and edge-to-edge content. */
export function Card({ className, padded = true, children }: { className?: string; padded?: boolean; children: ReactNode }) {
  return <div className={cn('rounded-lg border border-line bg-white', padded && 'p-5', className)}>{children}</div>;
}

/** Title row of a card, with an optional description and action on the right. */
export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** One number with a label — used in stat rows. */
export function StatCard({ label, value, icon: Icon, hint, className }: { label: string; value: ReactNode; icon?: ComponentType<{ className?: string }>; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-line bg-white p-4', className)}>
      <p className="flex items-center gap-1.5 text-xs text-muted">{Icon && <Icon className="size-3.5" />}{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const tagColors = {
  gray: 'bg-tag-gray text-tag-gray-text',
  green: 'bg-tag-green text-tag-green-text',
  amber: 'bg-tag-yellow text-tag-yellow-text',
  red: 'bg-tag-red text-tag-red-text',
  blue: 'bg-tag-blue text-tag-blue-text',
  violet: 'bg-tag-purple text-tag-purple-text',
  orange: 'bg-tag-orange text-tag-orange-text',
  pink: 'bg-tag-pink text-tag-pink-text',
};

export type BadgeColor = keyof typeof tagColors;

/** A pastel tag, like a Notion select option. `dot` adds a small dot in front. */
export function Badge({ color = 'gray', dot, className, children }: { color?: BadgeColor; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-px text-xs whitespace-nowrap', tagColors[color], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
