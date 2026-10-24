import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Title block at the top of a dashboard page: serif headline, optional kicker, back link and actions. */
export function PageHeader({ title, description, back, eyebrow, actions, className }: {
  title: ReactNode;
  description?: ReactNode;
  back?: { to: string; label: string };
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-10 animate-enter', className)}>
      {back && (
        <Link to={back.to} className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-ink">
          <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />{back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          {eyebrow && <div className="mb-3 flex flex-wrap items-center gap-2">{eyebrow}</div>}
          <h1 className="font-display text-[44px] leading-[1.02] tracking-tight text-balance text-ink sm:text-[56px]">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-[15px] text-stone-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const avatarSizes = { sm: 'size-8 text-[11px]', md: 'size-10 text-xs', lg: 'size-14 text-base' };

/** Profile picture, or serif initials on paper. */
export function Avatar({ name, image, size = 'md', className }: { name?: string | null; image?: string | null; size?: keyof typeof avatarSizes; className?: string }) {
  const classes = cn('shrink-0 rounded-full', avatarSizes[size], className);
  if (image) return <img src={image} alt="" referrerPolicy="no-referrer" className={cn(classes, 'object-cover')} />;
  const initials = (name ?? '?').trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || '?';
  return (
    <span aria-hidden className={cn(classes, 'grid place-items-center bg-ink font-semibold tracking-wide text-paper')}>
      {initials}
    </span>
  );
}
