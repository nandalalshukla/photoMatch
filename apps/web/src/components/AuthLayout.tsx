/** Two-column layout for sign-in / sign-up pages: form on the left, a full-height photograph on the right. */
import type { ReactNode } from 'react';
import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 animate-enter flex-col justify-center py-14">
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-ink">{title}</h1>
          <p className="mt-3 mb-9 text-[15px] text-stone-500">{subtitle}</p>
          {children}
        </div>
        <p className="text-xs text-stone-400">© {new Date().getFullYear()} PhotoMatch AI</p>
      </div>

      <div className="relative hidden p-3 lg:block">
        <div className="relative h-full overflow-hidden rounded-[28px] bg-ink">
          <img src="/editorial/auth-camera.webp" alt="A photographer holding a twin-lens camera" className="absolute inset-0 size-full animate-develop object-cover" />
          <div className="grain absolute inset-0 opacity-30" />
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-12 xl:p-14">
            <p className="max-w-md animate-enter font-display text-5xl leading-[1.05] text-white [animation-delay:400ms]">
              Find yourself in <em>every</em> memory.
            </p>
            <p className="mt-4 max-w-sm animate-enter text-white/65 [animation-delay:550ms]">
              One selfie. Every photo you're in. Delivered privately on WhatsApp or Telegram.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
