import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

const base =
  'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-[background-color,box-shadow,color,transform] duration-200 ease-editorial active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

const variants = {
  /** The main action on a screen: an ink pill. */
  primary: 'bg-ink text-paper shadow-xs hover:bg-ink-soft hover:-translate-y-px',
  secondary: 'bg-white text-ink ring-1 ring-stone-300 ring-inset hover:ring-ink hover:-translate-y-px',
  ghost: 'text-stone-600 hover:bg-stone-900/5 hover:text-ink',
  danger: 'bg-brand-600 text-white hover:bg-brand-700',
  /** Alias of primary, kept for readability on dark-on-light marketing blocks. */
  dark: 'bg-ink text-paper hover:bg-ink-soft hover:-translate-y-px',
  /** For photos and dark backgrounds. */
  white: 'bg-paper text-ink hover:bg-white hover:-translate-y-px',
  /** Frosted glass, for use on top of photos. */
  glass: 'bg-white/15 text-white ring-1 ring-white/25 ring-inset backdrop-blur-md hover:bg-white/25',
};

const sizes = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-[15px]',
  /** Square, for a lone icon. Give it an aria-label. */
  icon: 'size-10',
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

/** The classes of a button — handy for styling a plain <a> like one. */
export const buttonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) =>
  cn(base, variants[variant], sizes[size], className);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean };

export function Button({ variant, size, loading, className, children, disabled, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** A router link that looks like a button. */
export function ButtonLink({ variant, size, className, ...props }: LinkProps & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
