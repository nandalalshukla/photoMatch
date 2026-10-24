import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode };

/** A labelled text input. */
export function Input({ label, hint, className, id, ...props }: InputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-stone-700">{label}</label>
      <input
        id={inputId}
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        className={cn(
          'h-11 w-full rounded-xl border-0 bg-white px-3.5 text-[15px] text-ink ring-1 ring-stone-300 transition ring-inset placeholder:text-stone-400 hover:ring-stone-400 focus:ring-2 focus:ring-ink focus:outline-none disabled:bg-paper disabled:text-stone-500',
          className,
        )}
        {...props}
      />
      {hint && <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-stone-500">{hint}</p>}
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
      className="group flex w-full items-start gap-3 rounded-2xl p-4 text-left ring-1 ring-stone-200 transition ring-inset hover:ring-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
    >
      {icon && (
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-300', checked ? 'bg-ink text-paper' : 'bg-paper-deep text-stone-500')}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-relaxed text-stone-500">{description}</span>}
      </span>
      <span className={cn('relative mt-1 h-6 w-10 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-ink' : 'bg-stone-300')}>
        <span className={cn('absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out-expo', checked && 'translate-x-4')}>
          {/* The safelight comes on when the switch does. */}
          <span className={cn('absolute inset-1 rounded-full bg-brand-500 transition-opacity duration-300', checked ? 'opacity-100' : 'opacity-0')} />
        </span>
      </span>
    </button>
  );
}
