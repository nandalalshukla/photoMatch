import { Link } from 'react-router';

/** The PhotoMatch AI logo: gradient face-scan mark + wordmark. */
export function Logo({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5" aria-label="PhotoMatch AI home">
      <img src="/logo.svg" alt="" className="size-8" />
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        PhotoMatch <span className="brand-gradient-text">AI</span>
      </span>
    </Link>
  );
}
