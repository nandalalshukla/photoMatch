/**
 * Small, reusable UI building blocks. Each one is just a styled HTML element,
 * so they're easy to read and change. Pages combine these instead of
 * repeating long lists of Tailwind classes.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { LoaderCircle, X } from 'lucide-react';

// ---------- Buttons ----------

const buttonStyles = {
  base: 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
  variant: {
    primary: 'brand-gradient text-white shadow-sm shadow-brand-600/30 hover:brightness-110',
    secondary: 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  },
  size: { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3.5 text-base' },
};

type Variant = keyof typeof buttonStyles.variant;
type Size = keyof typeof buttonStyles.size;

const buttonClass = (variant: Variant, size: Size, extra = '') =>
  `${buttonStyles.base} ${buttonStyles.variant[variant]} ${buttonStyles.size[size]} ${extra}`;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** A router link that looks like a button. */
export function ButtonLink({ variant = 'primary', size = 'md', className, ...props }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

// ---------- Forms ----------

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function Input({ label, hint, className, ...props }: InputProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        className={`w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none ${className ?? ''}`}
        {...props}
      />
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/** An on/off switch with a title and description. */
export function Toggle(props: { checked: boolean; onChange: (checked: boolean) => void; title: string; description?: string; disabled?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
      className="flex w-full items-start gap-3 rounded-xl p-3 text-left ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
    >
      {props.icon && <span className="mt-0.5 text-brand-600">{props.icon}</span>}
      <span className="flex-1">
        <span className="block text-sm font-semibold text-slate-800">{props.title}</span>
        {props.description && <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{props.description}</span>}
      </span>
      <span className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${props.checked ? 'bg-brand-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${props.checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

// ---------- Layout pieces ----------

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70 ${className ?? ''}`}>{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <LoaderCircle className="size-7 animate-spin text-brand-600" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const badgeColors = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  violet: 'bg-brand-50 text-brand-700 ring-brand-600/20',
};

export function Badge({ color = 'gray', children }: { color?: keyof typeof badgeColors; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-transparent ${badgeColors[color]}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="brand-gradient h-full rounded-full transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

/** A centered dialog on a dimmed background. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
