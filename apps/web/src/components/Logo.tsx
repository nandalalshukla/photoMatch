import { Link } from 'react-router';
import { cn } from '../lib/cn';

/** The PhotoMatch logo: ink viewfinder mark + serif wordmark. `light` is for dark backgrounds. */
export function Logo({ to = '/', light = false, className }: { to?: string; light?: boolean; className?: string }) {
  return (
    <Link to={to} className={cn('group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current', className)} aria-label="PhotoMatch AI home">
      <img src="/logo.svg" alt="" className={cn('size-8 transition-transform duration-500 ease-editorial group-hover:-rotate-6', light && 'ring-1 ring-white/20 rounded-[9px]')} />
      <span className={cn('font-display text-[25px] leading-none tracking-tight', light ? 'text-white' : 'text-ink')}>
        PhotoMatch<span className={cn('ml-1 align-super font-sans text-[10px] font-semibold tracking-[0.14em]', light ? 'text-white/60' : 'text-stone-500')}>AI</span>
      </span>
    </Link>
  );
}
