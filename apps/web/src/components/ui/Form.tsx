import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode };

/** A labelled text input. */
export function Input({ label, hint, className, id, ...props }: InputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-muted">{label}</label>
      <input
        id={inputId}
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        className={cn(
          'h-9 w-full rounded-md border-0 bg-paper/60 px-2.5 text-sm text-ink ring-1 ring-line transition ring-inset placeholder:text-faint hover:bg-paper focus:bg-white focus:ring-2 focus:ring-brand-500/50 focus:outline-none disabled:opacity-60',
          className,
        )}
        {...props}
      />
      {hint && <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

type ToggleProps = { checked: boolean; onChange: (checked: boolean) => void; title: string; description?: string; disabled?: boolean; icon?: ReactNode };

/** An on/off switch with a title and description. */
export function Toggle({ checked, onChange, title, description, disabled, icon }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-60"
    >
      {icon && <span className="mt-0.5 shrink-0 text-muted [&>svg]:size-4">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{description}</span>}
      </span>
      <span className={cn('relative mt-0.5 h-[18px] w-8 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-brand-500' : 'bg-[#e3e2e0]')}>
        <span className={cn('absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white shadow-xs transition-transform duration-200', checked && 'translate-x-3.5')} />
      </span>
    </button>
  );
}
