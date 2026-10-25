import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Top of a dashboard page, like a Notion page: an emoji icon, a bold title,
 * an optional line of properties (`meta`) and actions on the right.
 */
export function PageHeader({ title, icon, description, back, meta, actions, className }: {
  title: ReactNode;
  icon?: string;
  description?: ReactNode;
  back?: { to: string; label: string };
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-8 animate-enter', className)}>
      {back && (
        <Link to={back.to} className="-ml-1.5 mb-6 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-sm text-muted transition hover:bg-hover hover:text-ink">
          <ChevronLeft className="size-4" />{back.label}
        </Link>
      )}
      {icon && <div className="mb-3 text-5xl leading-none" aria-hidden>{icon}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-balance text-ink sm:text-[40px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {meta && <div className="mt-5">{meta}</div>}
    </div>
  );
}

/**
 * A Notion-style property list: label on the left, value on the right, one per row.
 * Use it under a page title to show an item's details at a glance.
 */
export function Properties({ items }: { items: { icon?: ReactNode; label: string; value: ReactNode }[] }) {
  return (
    <dl className="space-y-0.5 text-sm">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[150px_1fr] items-center gap-2 rounded-md py-1 sm:grid-cols-[180px_1fr]">
          <dt className="flex items-center gap-2 text-muted [&>svg]:size-4">{item.icon}{item.label}</dt>
          <dd className="min-w-0 text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const avatarSizes = { sm: 'size-6 text-[11px]', md: 'size-8 text-xs', lg: 'size-12 text-base' };

/** Profile picture, or the first letters of the name on a soft gray circle. */
export function Avatar({ name, image, size = 'md', className }: { name?: string | null; image?: string | null; size?: keyof typeof avatarSizes; className?: string }) {
  const classes = cn('shrink-0 rounded-full', avatarSizes[size], className);
  if (image) return <img src={image} alt="" referrerPolicy="no-referrer" className={cn(classes, 'object-cover')} />;
  const initials = (name ?? '?').trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || '?';
  return (
    <span aria-hidden className={cn(classes, 'grid place-items-center bg-tag-gray font-medium text-tag-gray-text')}>
      {initials}
    </span>
  );
}
