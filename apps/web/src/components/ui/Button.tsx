import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

const base =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap select-none transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

const variants = {
  /** The main action on a screen. */
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  secondary: 'bg-white text-ink shadow-xs ring-1 ring-line ring-inset hover:bg-paper',
  ghost: 'text-muted hover:bg-hover hover:text-ink',
  danger: 'bg-[#eb5757] text-white hover:bg-[#d84a4a]',
  /** Black, for the few places that need the most weight (landing page). */
  dark: 'bg-ink text-white hover:bg-black',
  /** For dark backgrounds. */
  white: 'bg-white text-ink hover:bg-paper',
};

const sizes = {
  sm: 'h-7 px-2.5 text-[13px]',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-[15px]',
  /** Square, for a lone icon. Give it an aria-label. */
  icon: 'size-9',
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
