import { Link } from 'react-router';
import { cn } from '../lib/cn';

/** The PhotoMatch logo: viewfinder mark + wordmark. */
export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500', className)} aria-label="PhotoMatch AI home">
      <img src="/logo.svg" alt="" className="size-7" />
      <span className="text-[15px] font-bold tracking-tight text-ink">PhotoMatch</span>
    </Link>
  );
}
